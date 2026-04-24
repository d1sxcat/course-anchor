import { data, Form, redirect, useNavigation } from 'react-router'
import { parseSubmission, report } from '@conform-to/react/future'
import { coerceFormValue } from '@conform-to/zod/v4/future'
import * as QRCode from 'qrcode'
import { z } from 'zod'
import { FormErrors, FormOTP, useForm } from '~/components/form'
//import { Icon } from '#app/components/ui/icon.tsx'
import { StatusButton } from '~/components/ui/status-button'
import { type BreadcrumbHandle } from '~/hooks/use-breadcrumbs'
import { requireUserId } from '~/lib/auth.server'
import { prisma } from '~/lib/db.server'
import { getDomainUrl, useIsPending } from '~/lib/misc'
import { redirectWithToast } from '~/lib/toast.server'
import { getTOTPAuthUri } from '~/lib/totp.server'
import { isCodeValid } from '~/routes/_auth/verify.server'
import { twoFAVerificationType } from './_layout'
import { type Route } from './+types/verify'

export const handle: BreadcrumbHandle = {
  //breadcrumb: <Icon name="check">Verify</Icon>,
  breadcrumb: 'Verify',
}

const CancelSchema = z.object({ intent: z.literal('cancel') })
const VerifySchema = z.object({
  intent: z.literal('verify'),
  code: z.string().min(6).max(6),
})

const ActionSchema = coerceFormValue(
  z.discriminatedUnion('intent', [CancelSchema, VerifySchema])
)

export const twoFAVerifyVerificationType = '2fa-verify'

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireUserId(request)
  const verification = await prisma.verification.findUnique({
    where: {
      target_type: { type: twoFAVerifyVerificationType, target: userId },
    },
    select: {
      id: true,
      algorithm: true,
      secret: true,
      period: true,
      digits: true,
    },
  })
  if (!verification) {
    return redirect('/settings/two-factor')
  }
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true },
  })
  const issuer = new URL(getDomainUrl(request)).host
  const otpUri = getTOTPAuthUri({
    ...verification,
    accountName: user.email,
    issuer,
  })
  const qrCode = await QRCode.toDataURL(otpUri)
  return { otpUri, qrCode }
}

export async function action({ request }: Route.ActionArgs) {
  const userId = await requireUserId(request)
  const formData = await request.formData()
  const submission = parseSubmission(formData)
  const result = ActionSchema.safeParse(submission.payload)
  if (!result.success) {
    return data(
      { result: report(submission, { error: result.error }) },
      { status: 400 }
    )
  }
  if (result.data.intent === 'cancel') {
    await prisma.verification.deleteMany({
      where: { type: twoFAVerifyVerificationType, target: userId },
    })
    return redirect('/settings/two-factor')
  }
  const codeIsValid = await isCodeValid({
    code: result.data.code,
    type: twoFAVerifyVerificationType,
    target: userId,
  })
  if (!codeIsValid) {
    return data(
      {
        result: report(submission, {
          error: {
            fieldErrors: { code: ['Invalid code'] },
          },
        }),
      },
      { status: 400 }
    )
  }
  await prisma.verification.update({
    where: {
      target_type: { type: twoFAVerifyVerificationType, target: userId },
    },
    data: { type: twoFAVerificationType },
  })
  return redirectWithToast('/settings/two-factor', {
    type: 'success',
    title: 'Enabled',
    description: 'Two-factor authentication has been enabled.',
  })
}

export default function TwoFactorRoute({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const navigation = useNavigation()

  const isPending = useIsPending()
  const pendingIntent = isPending ? navigation.formData?.get('intent') : null

  const { form, fields } = useForm(ActionSchema, {
    id: 'verify-form',
    lastResult: actionData?.result,
  })
  // const lastSubmissionIntent = fields.intent.value

  return (
    <div>
      <div className="flex flex-col items-center gap-4">
        <img alt="qr code" src={loaderData.qrCode} className="size-56" />
        <p>Scan this QR code with your authenticator app.</p>
        <p className="text-sm">
          If you cannot scan the QR code, you can manually add this account to
          your authenticator app using this code:
        </p>
        <div className="p-3">
          <pre
            className="text-sm break-all whitespace-pre-wrap"
            aria-label="One-time Password URI"
          >
            {loaderData.otpUri}
          </pre>
        </div>
        <p className="text-sm">
          Once you've added the account, enter the code from your authenticator
          app below. Once you enable 2FA, you will need to enter a code from
          your authenticator app every time you log in or perform important
          actions. Do not lose access to your authenticator app, or you will
          lose access to your account.
        </p>
        <div className="flex w-full max-w-xs flex-col justify-center gap-4">
          <Form method="POST" {...form.props} className="flex-1">
            <div className="flex items-center justify-center">
              <FormOTP
                {...fields.code}
                errorId={fields.code.errorId}
                errors={fields.code.errors}
                aria-invalid={fields.code.ariaInvalid}
                id={fields.code.id}
              />
            </div>

            <div className="min-h-8 px-4 pt-1 pb-3">
              <FormErrors id={form.errorId} errors={form.errors} />
            </div>

            <div className="flex justify-between gap-4">
              <StatusButton
                className="w-full"
                status={pendingIntent === 'verify' ? 'pending' : 'idle'}
                type="submit"
                name="intent"
                value="verify"
              >
                Submit
              </StatusButton>
              <StatusButton
                className="w-full"
                variant="secondary"
                status={pendingIntent === 'cancel' ? 'pending' : 'idle'}
                type="submit"
                name="intent"
                value="cancel"
                disabled={isPending}
              >
                Cancel
              </StatusButton>
            </div>
          </Form>
        </div>
      </div>
    </div>
  )
}
