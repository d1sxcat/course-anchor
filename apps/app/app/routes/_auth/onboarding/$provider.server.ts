import { invariant } from '@epic-web/invariant'
import { redirect } from 'react-router'
import { verifySessionStorage } from '~/lib/verification.server'
import { type VerifyFunctionArgs } from '../verify.server'
import { onboardingEmailSessionKey } from './index'

export async function handleVerification({ submission, result }: VerifyFunctionArgs) {
	invariant(
		result.success,
		'Submission should be successful by now',
	)
	const verifySession = await verifySessionStorage.getSession()
	verifySession.set(onboardingEmailSessionKey, result.data.target)
	return redirect('/onboarding', {
		headers: {
			'set-cookie': await verifySessionStorage.commitSession(verifySession),
		},
	})
}
