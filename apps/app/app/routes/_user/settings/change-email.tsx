import { data, Form, redirect } from 'react-router'
import { parseSubmission, report } from '@conform-to/react/future'
import { coerceFormValue } from '@conform-to/zod/v4/future'
import { z } from 'zod'
import { FormErrors, FormInput, useForm } from '~/components/form'
// import { Icon } from '#app/components/ui/icon.tsx'
import { StatusButton } from '~/components/ui/status-button'
import { type BreadcrumbHandle } from '~/hooks/use-breadcrumbs'
import { requireUserId } from '~/lib/auth.server'
import { prisma } from '~/lib/db.server'
import { sendEmail } from '~/lib/email.server'
import { useIsPending } from '~/lib/misc'
import { EmailSchema } from '~/lib/user-validation'
import { verifySessionStorage } from '~/lib/verification.server'
import {
  prepareVerification,
  requireRecentVerification,
} from '~/routes/_auth/verify.server'
import { type Route } from './+types/change-email'
import { EmailChangeEmail } from './change-email.server'

export const handle: BreadcrumbHandle = {
  //breadcrumb: <Icon name="envelope-closed">Change Email</Icon>,
  breadcrumb: 'Change Email'
}

export const newEmailAddressSessionKey = 'new-email-address'

const ChangeEmailSchema = coerceFormValue(
  z.object({
    email: EmailSchema,
  })
)

export async function loader({ request }: Route.LoaderArgs) {
  await requireRecentVerification(request)
  const userId = await requireUserId(request)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })
  if (!user) {
    const params = new URLSearchParams({ redirectTo: request.url })
    throw redirect(`/login?${params}`)
  }
  return { user }
}

export async function action({ request }: Route.ActionArgs) {
  const userId = await requireUserId(request)
  const formData = await request.formData()
  const submission = parseSubmission(formData)
  const result = ChangeEmailSchema.safeParse(submission.payload)
  if (!result.success) {
    return data(
      { result: report(submission, { error: result.error }) },
      { status: 400 }
    )
  }
  const existingUser = await prisma.user.findUnique({
    where: { email: result.data.email },
  })
  if (existingUser) {
    return data(
      {
        result: report(submission, {
          error: { fieldErrors: { email: ['This email is already in use.'] } },
        }),
      },
      { status: 400 }
    )
  }
  // const submission = await parseWithZod(formData, {
  // 	schema: ChangeEmailSchema.superRefine(async (data, ctx) => {
  // 		const existingUser = await prisma.user.findUnique({
  // 			where: { email: data.email },
  // 		})
  // 		if (existingUser) {
  // 			ctx.addIssue({
  // 				path: ['email'],
  // 				code: z.ZodIssueCode.custom,
  // 				message: 'This email is already in use.',
  // 			})
  // 		}
  // 	}),
  // 	async: true,
  // })

  // if (submission.status !== 'success') {
  // 	return data(
  // 		{ result: submission.reply() },
  // 		{ status: submission.status === 'error' ? 400 : 200 },
  // 	)
  // }
  const { otp, redirectTo, verifyUrl } = await prepareVerification({
    period: 10 * 60,
    request,
    target: userId,
    type: 'change-email',
  })

  const response = await sendEmail({
    to: result.data.email,
    subject: `Course Anchor Email Change Verification`,
    react: <EmailChangeEmail verifyUrl={verifyUrl.toString()} otp={otp} />,
  })

  if (response.status === 'success') {
    const verifySession = await verifySessionStorage.getSession()
    verifySession.set(newEmailAddressSessionKey, result.data.email)
    return redirect(redirectTo.toString(), {
      headers: {
        'set-cookie': await verifySessionStorage.commitSession(verifySession),
      },
    })
  } else {
    return data(
      {
        result: report(submission, {
          error: {
            formErrors: [
              'Failed to send verification email. Please try again later.',
            ],
          },
        }),
      },
      { status: 500 }
    )
  }
}

export default function ChangeEmailIndex({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { form, fields } = useForm(ChangeEmailSchema, {
    id: 'change-email-form',
    lastResult: actionData?.result,
    shouldValidate: 'onSubmit',
    shouldRevalidate: 'onBlur',
  })

  const isPending = useIsPending()
  return (
    <div>
      <h1 className="text-h1">Change Email</h1>
      <p>You will receive an email at the new email address to confirm.</p>
      <p>
        An email notice will also be sent to your old address{' '}
        {loaderData.user.email}.
      </p>
      <div className="mx-auto mt-5 max-w-sm">
        <Form method="POST" {...form.props}>
          <FormInput
            {...fields.email.inputProps}
            type="email"
            label="New Email"
          />
          <FormErrors id={form.errorId} errors={form.errors} />
          <div>
            <StatusButton status={isPending ? 'pending' : 'idle'}>
              Send Confirmation
            </StatusButton>
          </div>
        </Form>
      </div>
    </div>
  )
}
