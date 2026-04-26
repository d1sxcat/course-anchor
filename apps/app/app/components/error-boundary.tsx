import { useEffect, type ReactElement } from 'react'
import {
  isRouteErrorResponse,
  useParams,
  useRouteError,
  type ErrorResponse,
} from 'react-router'
import { captureException } from '@sentry/react-router'
import { ArrowLeft } from 'lucide-react'
import { LinkButton } from '~/components/ui/link'
import { getErrorMessage } from '~/lib/misc'

type StatusHandler = (info: {
  error: ErrorResponse
  params: Record<string, string | undefined>
}) => ReactElement | null

export function GeneralErrorBoundary({
  defaultStatusHandler = ({ error }) => (
    <div className="text-center">
      <p className="text-base font-semibold text-indigo-600 dark:text-indigo-400">
        {error.status}
      </p>
      <h1 className="mt-4 text-5xl font-semibold tracking-tight text-balance text-gray-900 sm:text-7xl dark:text-white">
        {error.data}
      </h1>
      <div className="mt-10 flex items-center justify-center gap-x-6">
        <LinkButton to="/" size={'lg'}>
          <ArrowLeft /> Back to home
        </LinkButton>
      </div>
    </div>
  ),
  statusHandlers,
  unexpectedErrorHandler = error => (
    <div className="text-center">
      <p className="text-base font-semibold text-indigo-600 dark:text-indigo-400">
        Unexpected error
      </p>
      <h1 className="mt-4 text-5xl font-semibold tracking-tight text-balance text-gray-900 sm:text-7xl dark:text-white">
        {getErrorMessage(error)}
      </h1>
      <div className="mt-10 flex items-center justify-center gap-x-6">
        <LinkButton to="/" size={'lg'}>
          <ArrowLeft /> Back to home
        </LinkButton>
      </div>
    </div>
  ),
}: {
  defaultStatusHandler?: StatusHandler
  statusHandlers?: Record<number, StatusHandler>
  unexpectedErrorHandler?: (error: unknown) => ReactElement | null
}) {
  const error = useRouteError()
  const params = useParams()
  const isResponse = isRouteErrorResponse(error)

  if (typeof document !== 'undefined') {
    console.error(error)
  }

  useEffect(() => {
    if (isResponse) return

    captureException(error)
  }, [error, isResponse])

  return (
    <main className="grid min-h-svh place-items-center bg-white px-6 py-24 sm:py-32 lg:px-8 dark:bg-gray-900">
      {isResponse
        ? (statusHandlers?.[error.status] ?? defaultStatusHandler)({
            error,
            params,
          })
        : unexpectedErrorHandler(error)}
    </main>
  )
}
