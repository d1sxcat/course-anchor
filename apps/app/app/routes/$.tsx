import { ArrowLeft } from 'lucide-react'
import { GeneralErrorBoundary } from '~/components/error-boundary'
import { LinkButton } from '~/components/ui/link'

export function loader() {
  throw new Response('Not found', { status: 404 })
}

export function action() {
  throw new Response('Not found', { status: 404 })
}

export default function NotFound() {
  return <ErrorBoundary />
}

export function ErrorBoundary() {
  return (
    <GeneralErrorBoundary
      statusHandlers={{
        404: () => (
          <div className="text-center">
            <p className="text-base font-semibold text-indigo-600 dark:text-indigo-400">
              404
            </p>
            <h1 className="mt-4 text-5xl font-semibold tracking-tight text-balance text-gray-900 sm:text-7xl dark:text-white">
              Page not found
            </h1>
            <p className="mt-6 text-lg font-medium text-pretty text-gray-500 sm:text-xl/8 dark:text-gray-400">
              Sorry, we couldn’t find the page you’re looking for.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <LinkButton to="/" size={'lg'}>
                <ArrowLeft /> Back to home
              </LinkButton>
            </div>
          </div>
        ),
      }}
    />
  )
}
