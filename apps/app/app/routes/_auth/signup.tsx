import { data, Form, redirect, useSearchParams } from 'react-router'
import { Fragment } from 'react/jsx-runtime'
import { parseSubmission, report } from '@conform-to/react/future'
import { coerceFormValue, formatResult } from '@conform-to/zod/v4/future'
import { FieldGroup, FieldSeparator } from '@course-anchor/ui/components/field'
import * as E from '@react-email/components'
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
    onError(poop) {
      console.log({ poop })
    },
  })

  return (
    <div className="container flex flex-col justify-center pt-20 pb-32">
      <div className="text-center">
        <h1 className="text-h1">Let's start your journey!</h1>
        <p className="text-body-md text-muted-foreground mt-3">
          Please enter your email.
        </p>
      </div>
      <div className="mx-auto mt-16 max-w-sm min-w-full sm:min-w-92">
        <Form method="POST" {...form.props}>
          <HoneypotInputs />
          <FieldGroup>
            <FormInput
              {...fields.email}
              errors={fields.email.errors}
              errorId={fields.email.errorId}
              id={fields.email.id}
              label="Email"
              type="email"
              ariaInvalid={fields.email.ariaInvalid}
            />
            <FormErrors id={form.errorId} errors={form.errors} />
            <StatusButton
              className="w-full"
              status={isPending ? 'pending' : 'idle'}
              type="submit"
              disabled={isPending}
            >
              Submit
            </StatusButton>
          </FieldGroup>
        </Form>
        <ul className="flex flex-col gap-4 py-4">
          {providerNames.map(providerName => (
            <Fragment key={providerName}>
              <FieldSeparator />
              <li>
                <ProviderConnectionForm
                  type="Signup"
                  providerName={providerName}
                  redirectTo={redirectTo}
                />
              </li>
            </Fragment>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function ErrorBoundary() {
  return <GeneralErrorBoundary />
}
