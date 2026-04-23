import { redirect } from 'react-router'
import { authenticator } from '~/lib/auth.server'
import { handleMockAction } from '~/lib/connections.server'
import { ProviderNameSchema } from '~/lib/connections'
import { getReferrerRoute } from '~/lib/misc'
import { getRedirectCookieHeader } from '~/lib/redirect-cookie.server'
import type { Route } from './+types/index'

export async function loader() {
	return redirect('/login')
}

export async function action({ request, params }: Route.ActionArgs) {
	const providerName = ProviderNameSchema.parse(params.provider)

	try {
		await handleMockAction(providerName, request)
		return await authenticator.authenticate(providerName, request)
	} catch (error: unknown) {
		if (error instanceof Response) {
			const formData = await request.formData()
			const rawRedirectTo = formData.get('redirectTo')
			const redirectTo =
				typeof rawRedirectTo === 'string'
					? rawRedirectTo
					: getReferrerRoute(request)
			const redirectToCookie = getRedirectCookieHeader(redirectTo)
			if (redirectToCookie) {
				error.headers.append('set-cookie', redirectToCookie)
			}
		}
		throw error
	}
}
