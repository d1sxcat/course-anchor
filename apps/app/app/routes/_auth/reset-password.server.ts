import { invariant } from '@epic-web/invariant'
import { report } from '@conform-to/react/future'
import { data, redirect } from 'react-router'
import { prisma } from '~/lib/db.server'
import { verifySessionStorage } from '~/lib/verification.server'
import { resetPasswordUsernameSessionKey } from './reset-password'
import { type VerifyFunctionArgs } from './verify.server'

export async function handleVerification({ submission, result }: VerifyFunctionArgs) {
	invariant(
		result.success,
		'Submission should be successful by now',
	)
	const target = result.data.target
	const user = await prisma.user.findFirst({
		where: { OR: [{ email: target }, { username: target }] },
		select: { email: true, username: true },
	})
	// we don't want to say the user is not found if the email is not found
	// because that would allow an attacker to check if an email is registered
	if (!user) {
		return data(
			{
				result: report(submission, {
					error: { fieldErrors: { code: ['Invalid code'] } },
				}),
			},
			{ status: 400 },
		)
	}

	const verifySession = await verifySessionStorage.getSession()
	verifySession.set(resetPasswordUsernameSessionKey, user.username)
	return redirect('/reset-password', {
		headers: {
			'set-cookie': await verifySessionStorage.commitSession(verifySession),
		},
	})
}
