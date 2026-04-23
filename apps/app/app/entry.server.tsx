import crypto from 'node:crypto'
import { PassThrough } from 'node:stream'
import { styleText } from 'node:util'
import {
  renderToPipeableStream,
  type RenderToPipeableStreamOptions,
} from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'
import {
  ServerRouter,
  type ActionFunctionArgs,
  type EntryContext,
  type LoaderFunctionArgs,
  type RouterContextProvider,
} from 'react-router'
import { contentSecurity } from '@nichtsam/helmet/content'
import { createReadableStreamFromReadable } from '@react-router/node'
import * as Sentry from '@sentry/react-router'
import { isbot } from 'isbot'
import { getEnv, init } from '~/lib/env.server'
import { NonceProvider } from '~/lib/nonce-provider'
import { makeTimings } from '~/lib/timing.server'
import { getInstance } from '~/middleware/i18next'

export const streamTimeout = 5_000

init()
global.ENV = getEnv()

const MODE = process.env.NODE_ENV ?? 'development'

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  entryContext: EntryContext,
  routerContext: RouterContextProvider
) {
  const nonce = crypto.randomBytes(16).toString('hex')
  return new Promise((resolve, reject) => {
    let shellRendered = false
    let userAgent = request.headers.get('user-agent')
    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
      responseHeaders.append('Document-Policy', 'js-profiling')
    }

    let readyOption: keyof RenderToPipeableStreamOptions =
      (userAgent && isbot(userAgent)) || entryContext.isSpaMode
        ? 'onAllReady'
        : 'onShellReady'

    const timings = makeTimings('render', 'renderToPipeableStream')
    let { pipe, abort } = renderToPipeableStream(
      <NonceProvider value={nonce}>
        <I18nextProvider i18n={getInstance(routerContext)}>
          <ServerRouter
            nonce={nonce}
            context={entryContext}
            url={request.url}
          />
        </I18nextProvider>
      </NonceProvider>,
      {
        [readyOption]() {
          shellRendered = true
          let body = new PassThrough()
          let stream = createReadableStreamFromReadable(body)

          responseHeaders.set('Content-Type', 'text/html')
          responseHeaders.append('Server-Timing', timings.toString())

          contentSecurity(responseHeaders, {
            crossOriginEmbedderPolicy: false,
            contentSecurityPolicy: {
              // NOTE: Remove reportOnly when you're ready to enforce this CSP
              reportOnly: true,
              directives: {
                fetch: {
                  'connect-src': [
                    MODE === 'development' ? 'ws:' : undefined,
                    process.env.SENTRY_DSN ? '*.sentry.io' : undefined,
                    "'self'",
                  ],
                  'font-src': ["'self'"],
                  'frame-src': ["'self'"],
                  'img-src': ["'self'", 'data:'],
                  'script-src': [
                    "'strict-dynamic'",
                    "'self'",
                    `'nonce-${nonce}'`,
                  ],
                  'script-src-attr': [`'nonce-${nonce}'`],
                },
              },
            },
          })

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            })
          )

          pipe(body)
        },
        onShellError(error: unknown) {
          reject(error)
        },
        onError(error: unknown) {
          responseStatusCode = 500
          if (shellRendered) console.error(error)
        },
        nonce,
      }
    )

    setTimeout(abort, streamTimeout + 1000)
  })
}

export function handleError(
  error: unknown,
  { request }: LoaderFunctionArgs | ActionFunctionArgs
): void {
  // Skip capturing if the request is aborted as Remix docs suggest
  // Ref: https://remix.run/docs/en/main/file-conventions/entry.server#handleerror
  if (request.signal.aborted) {
    return
  }

  if (error instanceof Error) {
    console.error(styleText('red', String(error.stack)))
  } else {
    console.error(error)
  }

  Sentry.captureException(error)
}
