import { Outlet } from 'react-router'
//import { Icon } from '#app/components/ui/icon.tsx'
import { type VerificationTypes } from '~/routes/_auth/verify'
import { type BreadcrumbHandle } from '../_layout'

export const handle: BreadcrumbHandle = {
	//breadcrumb: <Icon name="lock-closed">2FA</Icon>,
	breadcrumb: '2FA'
}

export const twoFAVerificationType = '2fa' satisfies VerificationTypes

export default function TwoFactorRoute() {
	return <Outlet />
}
