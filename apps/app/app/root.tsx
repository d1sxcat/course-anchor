import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  data,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from 'react-router'
import { Toaster } from '@course-anchor/ui/components/sonner'
import tailwindStyleSheetUrl from '@course-anchor/ui/globals.css?url'
import { OpenImgContextProvider } from 'openimg/react'
import { HoneypotProvider } from 'remix-utils/honeypot/react'
import appleTouchIconAssetUrl from '~/assets/favicons/apple-touch-icon.png'
import faviconAssetUrl from '~/assets/favicons/favicon.svg'
import { GeneralErrorBoundary } from '~/components/error-boundary'
import { useToast } from '~/hooks/use-toast'
// import {
//   SidebarProvider,
//   SidebarTrigger,
// } from '@course-anchor/ui/components/sidebar'
// import { TooltipProvider } from '@course-anchor/ui/components/tooltip'
// import { AppSidebar } from '~/components/app-sidebar'
import { getUserId, logout } from '~/lib/auth.server'
import { ClientHintCheck, getHints } from '~/lib/client-hints'
import { prisma } from '~/lib/db.server'
import { getEnv } from '~/lib/env.server'
import { pipeHeaders } from '~/lib/headers.server'
import { honeypot } from '~/lib/honeypot.server'
import { combineHeaders, getDomainUrl, getImgSrc } from '~/lib/misc'
import { useNonce } from '~/lib/nonce-provider'
import { getTheme, type Theme } from '~/lib/theme.server'
import { makeTimings, time } from '~/lib/timing.server'
import { getToast } from '~/lib/toast.server'
import { useOptionalUser } from '~/lib/user'
import {
  getLocale,
  i18nextMiddleware,
  localeCookie,
} from '~/middleware/i18next'
import { useOptionalTheme, useTheme } from '~/routes/resources/theme-switch'
import type { Route } from './+types/root'

export const middleware = [i18nextMiddleware]

export const links: Route.LinksFunction = () => {
  return [
    {
      rel: 'icon',
      href: '/favicon.ico',
      sizes: '48x48',
    },
    { rel: 'icon', type: 'image/svg+xml', href: faviconAssetUrl },
    { rel: 'apple-touch-icon', href: appleTouchIconAssetUrl },
    {
      rel: 'manifest',
      href: '/site.webmanifest',
      crossOrigin: 'use-credentials',
    } as const,
    { rel: 'stylesheet', href: tailwindStyleSheetUrl },
  ].filter(Boolean)
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const timings = makeTimings('root loader')
  const userId = await time(() => getUserId(request), {
    timings,
    type: 'getUserId',
    desc: 'getUserId in root',
  })
  const locale = getLocale(context)
  const user = userId
    ? await time(
        () =>
          prisma.user.findUnique({
            select: {
              id: true,
              name: true,
              username: true,
              image: { select: { objectKey: true } },
              roles: {
                select: {
                  name: true,
                  permissions: {
                    select: { entity: true, action: true, access: true },
                  },
                },
              },
            },
            where: { id: userId },
          }),
        { timings, type: 'find user', desc: 'find user in root' }
      )
    : null
  if (userId && !user) {
    console.info('something weird happened')
    // something weird happened... The user is authenticated but we can't find
    // them in the database. Maybe they were deleted? Let's log them out.
    await logout({ request, redirectTo: '/' })
  }
  const { toast, headers: toastHeaders } = await getToast(request)
  const honeyProps = await honeypot.getInputProps()
  return data(
    {
      user,
      requestInfo: {
        hints: getHints(request),
        origin: getDomainUrl(request),
        path: new URL(request.url).pathname,
        userPrefs: {
          theme: getTheme(request),
          locale,
        },
      },
      toast,
      honeyProps,
      ENV: getEnv(),
    },
    {
      headers: combineHeaders(
        { 'Server-Timing': timings.toString() },
        toastHeaders,
        { 'Set-Cookie': await localeCookie.serialize(locale) }
      ),
    }
  )
}

export const headers: Route.HeadersFunction = pipeHeaders

function Document({
  children,
  nonce,
  theme = 'light',
  env = {},
}: {
  children: React.ReactNode
  nonce: string
  theme?: Theme
  env?: Record<string, string | undefined>
}) {
  let { i18n } = useTranslation()
  const allowIndexing = ENV.ALLOW_INDEXING !== 'false'
  return (
    <html
      lang={i18n.language}
      dir={i18n.dir(i18n.language)}
      className={`${theme} h-full overflow-x-hidden`}
    >
      <head>
        <ClientHintCheck nonce={nonce} />
        <Meta />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        {allowIndexing ? null : (
          <meta name="robots" content="noindex, nofollow" />
        )}
        <Links />
      </head>
      <body className="bg-background text-foreground">
        {children}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(env)}`,
          }}
        />
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  )
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useLoaderData<typeof loader | null>()
  const nonce = useNonce()
  const theme = useOptionalTheme()
  return (
    <Document nonce={nonce} theme={theme} env={data?.ENV}>
      {children}
    </Document>
  )
}

function App() {
  const data = useLoaderData<typeof loader>()
  const user = useOptionalUser()
  const theme = useTheme()
  // const matches = useMatches()
  // const isOnSearchPage = matches.find((m) => m.id === 'routes/users/index')
  // const searchBar = isOnSearchPage ? null : <SearchBar status="idle" />
  useToast(data.toast)

  return (
    <OpenImgContextProvider
      optimizerEndpoint="/resources/images"
      getSrc={getImgSrc}
    >
      {/* <SidebarProvider>
        <TooltipProvider>
          <AppSidebar />
        </TooltipProvider>
        <main>
          <SidebarTrigger /> */}
      <Outlet />
      {/* </main> */}
      {/* </SidebarProvider> */}
      <Toaster closeButton position="top-center" theme={theme} />
    </OpenImgContextProvider>
  )
}

function AppWithProviders({ loaderData }: Route.ComponentProps) {
  let { i18n } = useTranslation()

  useEffect(() => {
    if (i18n.language !== loaderData.requestInfo.userPrefs.locale)
      i18n.changeLanguage(loaderData.requestInfo.userPrefs.locale)
  }, [loaderData.requestInfo.userPrefs.locale, i18n])

  return (
    <HoneypotProvider {...loaderData.honeyProps}>
      <App />
    </HoneypotProvider>
  )
}

export default AppWithProviders

export const ErrorBoundary = GeneralErrorBoundary
