import { data, Form, redirect, useSearchParams } from 'react-router'
import { parseSubmission, report } from '@conform-to/react/future'
import { coerceFormValue } from '@conform-to/zod/v4/future'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { safeRedirect } from 'remix-utils/safe-redirect'
import { z } from 'zod'
import { FormCheckbox, FormErrors, FormInput, useForm } from '~/components/form'
import { Spacer } from '~/components/ui/spacer'
import { StatusButton } from '~/components/ui/status-button'
import {
  checkIsCommonPassword,
  requireAnonymous,
  sessionKey,
  signup,
} from '~/lib/auth.server'
import { prisma } from '~/lib/db.server'
import { checkHoneypot } from '~/lib/honeypot.server'
import { useIsPending } from '~/lib/misc'
import { authSessionStorage } from '~/lib/session.server'
import { redirectWithToast } from '~/lib/toast.server'
import {
  NameSchema,
  PasswordAndConfirmPasswordSchema,
  UsernameSchema,
} from '~/lib/user-validation'
import { verifySessionStorage } from '~/lib/verification.server'
import { type Route } from './+types/index'

export const onboardingEmailSessionKey = 'onboardingEmail'

const SignupFormSchema = coerceFormValue(
  z
    .object({
      username: UsernameSchema,
      name: NameSchema,
      agreeToTermsOfServiceAndPrivacyPolicy: z.boolean(
        'You must agree to the terms of service and privacy policy'
      ),
      remember: z.boolean().optional(),
      redirectTo: z.string().optional(),
    })
    .and(PasswordAndConfirmPasswordSchema)
)

async function requireOnboardingEmail(request: Request) {
  await requireAnonymous(request)
  const verifySession = await verifySessionStorage.getSession(
    request.headers.get('cookie')
  )
  const email = verifySession.get(onboardingEmailSessionKey)
  if (typeof email !== 'string' || !email) {
    throw redirect('/signup')
  }
  return email
}

export async function loader({ request }: Route.LoaderArgs) {
  const email = await requireOnboardingEmail(request)
  return { email }
}

export async function action({ request }: Route.ActionArgs) {
  const email = await requireOnboardingEmail(request)
  const formData = await request.formData()
  await checkHoneypot(formData)
  const submission = parseSubmission(formData)
  const result = SignupFormSchema.safeParse(submission.payload)

  if (!result.success) {
    return data(
      { result: report(submission, { error: result.error }) },
      { status: 400 }
    )
  }

  const existingUser = await prisma.user.findUnique({
    where: { username: result.data.username },
    select: { id: true },
  })
  if (existingUser) {
    return data(
      {
        result: report(submission, {
          error: {
            fieldErrors: {
              username: ['A user already exists with this username'],
            },
          },
        }),
      },
      { status: 400 }
    )
  }

  const isCommonPassword = await checkIsCommonPassword(result.data.password)
  if (isCommonPassword) {
    return data(
      {
        result: report(submission, {
          error: {
            fieldErrors: {
              password: ['Password is too common'],
            },
          },
        }),
      },
      { status: 400 }
    )
  }

  const session = await signup({ ...result.data, email })
  if (!session) {
    return data(
      {
        result: report(submission, {
          error: {
            formErrors: ['Something went wrong trying to create your account'],
          },
        }),
      },
      { status: 400 }
    )
  }

  const { remember, redirectTo } = result.data

  const authSession = await authSessionStorage.getSession(
    request.headers.get('cookie')
  )
  authSession.set(sessionKey, session.id)
  const verifySession = await verifySessionStorage.getSession()
  const headers = new Headers()
  headers.append(
    'set-cookie',
    await authSessionStorage.commitSession(authSession, {
      expires: remember ? session.expirationDate : undefined,
    })
  )
  headers.append(
    'set-cookie',
    await verifySessionStorage.destroySession(verifySession)
  )

  return redirectWithToast(
    safeRedirect(redirectTo),
    { title: 'Welcome', description: 'Thanks for signing up!' },
    { headers }
  )
}

export const meta: Route.MetaFunction = () => {
  return [{ title: 'Setup Course Anchor Account' }]
}

export default function OnboardingRoute({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const isPending = useIsPending()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirectTo')

  const { form, fields } = useForm(SignupFormSchema, {
    id: 'onboarding-form',
    defaultValue: {
      redirectTo,
      agreeToTermsOfServiceAndPrivacyPolicy: false,
      remember: false,
    },
    lastResult: actionData?.result,
  })

  return (
    <div className="container flex min-h-full flex-col justify-center pt-20 pb-32">
      <div className="mx-auto w-full max-w-lg">
        <div className="flex flex-col gap-3 text-center">
          <h1 className="text-h1">Welcome aboard {loaderData.email}!</h1>
          <p className="text-body-md text-muted-foreground">
            Please enter your details.
          </p>
        </div>
        <Spacer size="xs" />
        <Form
          method="POST"
          className="mx-auto max-w-sm min-w-full sm:min-w-92"
          {...form.props}
        >
          <HoneypotInputs />
          <FormInput
            {...fields.username.inputProps}
            label="Username"
            autoComplete="username"
          />
          <FormInput
            {...fields.name.inputProps}
            label="Name"
            autoComplete="name"
          />
          <FormInput
            {...fields.password.inputProps}
            label="Password"
            type="password"
            autoComplete="new-password"
          />
          <FormInput
            {...fields.confirmPassword.inputProps}
            label="Confirm Password"
            type="password"
            autoComplete="new-password"
          />
          <FormCheckbox
            {...fields.agreeToTermsOfServiceAndPrivacyPolicy.checkboxProps}
            horizontal
            controlFirst
            label="I agree to the Terms of Service and Privacy Policy"
          />
          <FormCheckbox
            {...fields.remember.checkboxProps}
            horizontal
            controlFirst
            label="Remember me"
          />
          <input
            type="hidden"
            name={fields.redirectTo.name}
            value={fields.redirectTo.defaultValue ?? ''}
          />

          <FormErrors errors={form.errors} id={form.errorId} />

          <div className="flex items-center justify-between gap-6">
            <StatusButton
              className="w-full"
              status={isPending ? 'pending' : 'idle'}
              type="submit"
              disabled={isPending}
            >
              Create an account
            </StatusButton>
          </div>
        </Form>
      </div>
    </div>
  )
}
