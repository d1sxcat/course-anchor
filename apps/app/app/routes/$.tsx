import { Link, useLocation } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { GeneralErrorBoundary } from '~/components/error-boundary'

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
	const location = useLocation()
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: () => (
					<div className="flex flex-col gap-6">
						<div className="flex flex-col gap-3">
							<h1>We can't find this page:</h1>
							<pre className="text-body-lg break-all whitespace-pre-wrap">
								{location.pathname}
							</pre>
						</div>
						<Link to="/" className="text-body-md underline flex items-center gap-2">
							<ArrowLeft className="w-4 h-4" /> Back to home
						</Link>
					</div>
				),
			}}
		/>
	)
}
