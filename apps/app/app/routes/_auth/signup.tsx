import { data, Form, Link, redirect, useSearchParams } from 'react-router'
import { parseSubmission, report } from '@conform-to/react/future'
import { coerceFormValue, formatResult } from '@conform-to/zod/v4/future'
import { FieldSeparator } from '@course-anchor/ui/components/field'
import * as E from '@react-email/components'
import { LogIn } from 'lucide-react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '~/components/error-boundary'
import { FormErrors, FormInput, useForm } from '~/components/form'
import { StatusButton } from '~/components/ui/status-button'
import { requireAnonymous } from '~/lib/auth.server'
import { ProviderConnectionForm, providerNames } from '~/lib/connections'
import { prisma } from '~/lib/db.server'
import { sendEmail } from '~/lib/email.server'
import { checkHoneypot } from '~/lib/honeypot.server'
import { useIsPending } from '~/lib/misc'
import { EmailSchema } from '~/lib/user-validation'
import { type Route } from './+types/signup'
import { prepareVerification } from './verify.server'

const SignupSchema = coerceFormValue(
  z.object({
    email: EmailSchema,
  })
)

export async function loader({ request }: Route.LoaderArgs) {
  await requireAnonymous(request)
  return null
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()

  await checkHoneypot(formData)

  const submission = parseSubmission(formData)
  const result = SignupSchema.safeParse(submission.payload)

  if (!result.success) {
    return data({
      result: report(submission, {
        error: {
          issues: result.error.issues,
        },
      }),
    })
  }
  let error = formatResult(result)
  const { email } = result.data
  if (!error?.fieldErrors.email) {
    const isUsernameUnique = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (!!isUsernameUnique) {
      error ??= { formErrors: [], fieldErrors: {} }
      error.fieldErrors.email = ['A user already exists with this email']
    }
  }

  const { verifyUrl, redirectTo, otp } = await prepareVerification({
    period: 10 * 60,
    request,
    type: 'onboarding',
    target: email,
  })

  const response = await sendEmail({
    to: email,
    subject: `Welcome to Course Anchor!`,
    react: <SignupEmail onboardingUrl={verifyUrl.toString()} otp={otp} />,
  })

  if (response.status === 'success') {
    return redirect(redirectTo.toString())
  } else {
    return data(
      {
        result: report(submission, {
          error: {
            formErrors: [response.error.message],
          },
        }),
      },
      {
        status: 500,
      }
    )
  }
}

export function SignupEmail({
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
          <E.Text>Welcome to Course Anchor!</E.Text>
        </h1>
        <p>
          <E.Text>
            Here's your verification code: <strong>{otp}</strong>
          </E.Text>
        </p>
        <p>
          <E.Text>Or click the link to get started:</E.Text>
        </p>
        <E.Link href={onboardingUrl}>{onboardingUrl}</E.Link>
      </E.Container>
    </E.Html>
  )
}

export const meta: Route.MetaFunction = () => {
  return [{ title: 'Sign Up | Course Anchor' }]
}

export default function SignupRoute({ actionData }: Route.ComponentProps) {
  const isPending = useIsPending()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirectTo')
  const { form, fields } = useForm(SignupSchema, {
    id: 'signup-form',
    lastResult: actionData?.result,
    shouldRevalidate: 'onInput',
    shouldValidate: 'onSubmit',
  })

  return (
    //<div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
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
          Please enter your email.
        </h2>
        <p className="mt-2 text-sm/6 text-gray-500 dark:text-gray-400">
          Already a member?{' '}
          <Link
            to="/login"
            className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-10">
        <div>
          <Form method="POST" {...form.props} className="space-y-6">
            <HoneypotInputs />
            <FormInput
              {...fields.email.inputProps}
              label="Email"
              type="email"
              autoComplete="email"
              autoFocus
            />
            <FormErrors id={form.errorId} errors={form.errors} />
            <div>
              <StatusButton
                className="w-full font-semibold"
                status={isPending ? 'pending' : 'idle'}
                type="submit"
                size={'lg'}
                disabled={isPending}
                icon={<LogIn />}
              >
                Submit
              </StatusButton>
            </div>
          </Form>
        </div>
        <div className="mt-10">
          <FieldSeparator>Or sign up with</FieldSeparator>
          <ul className="flex flex-col gap-4 mt-6">
            {providerNames.map(providerName => (
              <li key={providerName}>
                <ProviderConnectionForm
                  type="Signup"
                  providerName={providerName}
                  redirectTo={redirectTo}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
    //</div>
  )
}

export function ErrorBoundary() {
  return <GeneralErrorBoundary />
}
