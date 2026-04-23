import { SetCookie } from '@mjackson/headers'
import { createId as cuid } from '@paralleldrive/cuid2'
import { redirect } from 'react-router'
import { GoogleStrategy } from '@coji/remix-auth-google'
import { z } from 'zod'
import { type Timings } from '~/lib/timing.server'
import { MOCK_CODE_GITHUB_HEADER, MOCK_CODE_GITHUB } from './constants'
import { type AuthProvider } from './provider'

const shouldMock =
	process.env.GOOGLE_CLIENT_ID?.startsWith('MOCK_') ||
	process.env.NODE_ENV === 'test'

export class GoogleProvider implements AuthProvider {
	getAuthStrategy() {
		if (
			!process.env.GOOGLE_CLIENT_ID ||
			!process.env.GOOGLE_CLIENT_SECRET ||
			!process.env.GOOGLE_REDIRECT_URI
		) {
			console.log(
				'Google OAuth strategy not available because environment variables are not set',
			)
			return null
		}
		return new GoogleStrategy(
			{
				clientId: process.env.GOOGLE_CLIENT_ID,
				clientSecret: process.env.GOOGLE_CLIENT_SECRET,
				redirectURI: process.env.GOOGLE_REDIRECT_URI,
			},
			async ({ tokens }) => {
        const profile = await GoogleStrategy.userProfile(tokens)
        return {
          id: profile.id,
          email: profile.emails?.[0]?.value,
          name: profile.displayName,
          imageUrl: profile.photos?.[0]?.value,
        }
      }
		)
	}

	async resolveConnectionData(
		providerId: string,
		{ timings }: { timings?: Timings } = {},
	) {
		return {
			displayName: providerId,
			link: null,
		} as const
	}

	async handleMockAction(request: Request) {
		if (!shouldMock) return

		const state = cuid()
		// allows us to inject a code when running e2e tests,
		// but falls back to a pre-defined 🐨 constant
		const code =
			request.headers.get(MOCK_CODE_GITHUB_HEADER) || MOCK_CODE_GITHUB
		const searchParams = new URLSearchParams({ code, state })
		let cookie = new SetCookie({
			name: 'google',
			value: searchParams.toString(),
			path: '/',
			sameSite: 'Lax',
			httpOnly: true,
			maxAge: 60 * 10,
			secure: process.env.NODE_ENV === 'production' || undefined,
		})
		throw redirect(`/auth/google/callback?${searchParams}`, {
			headers: {
				'Set-Cookie': cookie.toString(),
			},
		})
	}
}
