import { data, Link, redirect, useFetcher } from 'react-router'
import { parseSubmission, report } from '@conform-to/react/future'
import { coerceFormValue } from '@conform-to/zod/v4/future'
import * as E from '@react-email/components'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '~/components/error-boundary'
import { FormErrors, FormInput, useForm } from '~/components/form'
import { StatusButton } from '~/components/ui/status-button'
import { prisma } from '~/lib/db.server'
import { sendEmail } from '~/lib/email.server'
import { checkHoneypot } from '~/lib/honeypot.server'
import { EmailSchema, UsernameSchema } from '~/lib/user-validation'
import type { Route } from './+types/forgot-password'
import { prepareVerification } from './verify.server'

const ForgotPasswordSchema = coerceFormValue(
  z.object({
    usernameOrEmail: z.union([EmailSchema, UsernameSchema]),
  })
)

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()
  await checkHoneypot(formData)
  const submission = parseSubmission(formData)
  const result = ForgotPasswordSchema.safeParse(submission.payload)
  if (!result.success) {
    return data(
      { result: report(submission, { error: result.error }) },
      { status: 400 }
    )
  }
  const usernameOrEmail = result.data.usernameOrEmail
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: usernameOrEmail }, { username: usernameOrEmail }],
    },
    select: { email: true, username: true },
  })
  if (!user) {
    return data(
      {
        result: report(submission, {
          error: {
            fieldErrors: {
              usernameOrEmail: ['No user exists with this username or email'],
            },
          },
        }),
      },
      { status: 400 }
    )
  }

  const { verifyUrl, redirectTo, otp } = await prepareVerification({
    period: 10 * 60,
    request,
    type: 'reset-password',
    target: usernameOrEmail,
  })

  const response = await sendEmail({
    to: user.email,
    subject: `Course Anchor Password Reset`,
    react: (
      <ForgotPasswordEmail onboardingUrl={verifyUrl.toString()} otp={otp} />
    ),
  })

  if (response.status === 'success') {
    return redirect(redirectTo.toString())
  } else {
    return data(
      {
        result: report(submission, {
          error: { formErrors: [response.error.message] },
        }),
      },
      { status: response.error.statusCode ?? 500 }
    )
  }
}

function ForgotPasswordEmail({
  onboardingUrl,
  otp,
}: {
  onboardingUrl: string
  otp: string
}) {
  return (
    <E.Html lang="en" dir="ltr">
      <E.Container>
        <h1>
          <E.Text>Course Anchor Password Reset</E.Text>
        </h1>
        <p>
          <E.Text>
            Here's your verification code: <strong>{otp}</strong>
          </E.Text>
        </p>
        <p>
          <E.Text>Or click the link:</E.Text>
        </p>
        <E.Link href={onboardingUrl}>{onboardingUrl}</E.Link>
      </E.Container>
    </E.Html>
  )
}

export const meta: Route.MetaFunction = () => {
  return [{ title: 'Password Recovery for Course Anchor' }]
}

export default function ForgotPasswordRoute() {
  const forgotPassword = useFetcher<typeof action>()

  const { form, fields } = useForm(ForgotPasswordSchema, {
    id: 'forgot-password-form',
    lastResult: forgotPassword.data?.result
  })

  return (
    <div className="container pt-20 pb-32">
      <div className="flex flex-col justify-center">
        <div className="text-center">
          <h1 className="text-h1">Forgot Password</h1>
          <p className="text-body-md text-muted-foreground mt-3">
            No worries, we'll send you reset instructions.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-sm min-w-full sm:min-w-92">
          <forgotPassword.Form method="POST" {...form.props}>
            <HoneypotInputs />
            <div>
              <FormInput
                {...fields.usernameOrEmail}
                label="Username or Email"
                errorId={fields.usernameOrEmail.errorId}
                errors={fields.usernameOrEmail.errors}
                ariaInvalid={fields.usernameOrEmail.ariaInvalid}
                id={fields.usernameOrEmail.id}
              />
            </div>
            <FormErrors errors={form.errors} id={form.errorId} />

            <div className="mt-6">
              <StatusButton
                className="w-full"
                status={
                  forgotPassword.state === 'submitting' ? 'pending' : 'idle'
                }
                type="submit"
                disabled={forgotPassword.state !== 'idle'}
              >
                Recover password
              </StatusButton>
            </div>
          </forgotPassword.Form>
          <Link
            to="/login"
            className="text-body-sm mt-11 text-center font-bold"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}

export function ErrorBoundary() {
  return <GeneralErrorBoundary />
}
