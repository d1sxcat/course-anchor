import { redirect, Link, useFetcher } from 'react-router'
//import { Icon } from '#app/components/ui/icon.tsx'
import { StatusButton } from '~/components/ui/status-button'
import { requireUserId } from '~/lib/auth.server'
import { prisma } from '~/lib/db.server'
import { generateTOTP } from '~/lib/totp.server'
import { type Route } from './+types/index'
import { twoFAVerificationType } from './_layout'
import { twoFAVerifyVerificationType } from './verify'

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request)
	const verification = await prisma.verification.findUnique({
		where: { target_type: { type: twoFAVerificationType, target: userId } },
		select: { id: true },
	})
	return { is2FAEnabled: Boolean(verification) }
}

export async function action({ request }: Route.ActionArgs) {
	const userId = await requireUserId(request)
	const { otp: _otp, ...config } = await generateTOTP()
	const verificationData = {
		...config,
		type: twoFAVerifyVerificationType,
		target: userId,
	}
	await prisma.verification.upsert({
		where: {
			target_type: { target: userId, type: twoFAVerifyVerificationType },
		},
		create: verificationData,
		update: verificationData,
	})
	return redirect('/settings/two-factor/verify')
}

export default function TwoFactorRoute({ loaderData }: Route.ComponentProps) {
	const enable2FAFetcher = useFetcher<typeof action>()

	return (
		<div className="flex flex-col gap-4">
			{loaderData.is2FAEnabled ? (
				<>
					<p className="text-lg">
						You have enabled two-factor authentication.
						{/* <Icon name="check">
							
						</Icon> */}
					</p>
					<Link to="disable">
						{/* <Icon name="lock-open-1">Disable 2FA</Icon> */}
						Disable 2FA
					</Link>
				</>
			) : (
				<>
					<p>
							You have not enabled two-factor authentication yet.
						{/* <Icon name="lock-open-1">
						</Icon> */}
					</p>
					<p className="text-sm">
						Two factor authentication adds an extra layer of security to your
						account. You will need to enter a code from an authenticator app
						like {' '}
						<a className="underline" href="https://1password.com/">
							1Password
						</a>{' '}
						to log in.
					</p>
					<enable2FAFetcher.Form method="POST">
						<StatusButton
							type="submit"
							name="intent"
							value="enable"
							status={enable2FAFetcher.state === 'loading' ? 'pending' : 'idle'}
							className="mx-auto"
						>
							Enable 2FA
						</StatusButton>
					</enable2FAFetcher.Form>
				</>
			)}
		</div>
	)
}
