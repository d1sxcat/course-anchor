import { data, Link, redirect, useFetcher } from 'react-router'
import { parseSubmission, report } from '@conform-to/react/future'
import { coerceFormValue } from '@conform-to/zod/v4/future'
import * as E from '@react-email/components'
import { ArrowLeft, LockOpen } from 'lucide-react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '~/components/error-boundary'
import { FormErrors, FormInput, useForm } from '~/components/form'
import { LinkButton } from '~/components/ui/link'
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
    lastResult: forgotPassword.data?.result,
		shouldRevalidate: 'onBlur',
		shouldValidate: 'onSubmit',
  })

  return (
    <div className="mx-auto w-full max-w-sm lg:w-96">
      <div>
        <img
          alt="Your Company"
          src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=600"
          className="h-10 w-auto dark:hidden"
        />
        <img
          alt="Your Company"
          src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500"
          className="h-10 w-auto not-dark:hidden"
        />
        <h2 className="mt-8 text-2xl/9 font-bold tracking-tight text-gray-900 dark:text-white">
          Forgot Password
        </h2>
        <p className="mt-2 text-sm/6 text-gray-500 dark:text-gray-400">
          No worries, we'll send you reset instructions.
        </p>
      </div>
      <div className="mt-10">
        <div>
          <forgotPassword.Form
            method="POST"
            {...form.props}
            className="space-y-6"
          >
            <HoneypotInputs />
            <FormInput
              {...fields.usernameOrEmail.inputProps}
              label="Username or Email"
              autoComplete="username email"
              autoFocus
            />
            <FormErrors errors={form.errors} id={form.errorId} />

            <div>
              <StatusButton
                className="w-full font-semibold"
                size="lg"
                status={
                  forgotPassword.state === 'submitting' ? 'pending' : 'idle'
                }
                type="submit"
                disabled={forgotPassword.state !== 'idle'}
                icon={<LockOpen />}
              >
                Recover password
              </StatusButton>
            </div>
            <LinkButton
              to="/login"
              variant={'link'}
              className="font-semibold"
            >
              <ArrowLeft />
              Back to Login
            </LinkButton>
          </forgotPassword.Form>
        </div>
      </div>
    </div>
  )
}

export function ErrorBoundary() {
  return <GeneralErrorBoundary />
}
