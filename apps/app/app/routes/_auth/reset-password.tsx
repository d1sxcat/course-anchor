import { data, Form, redirect } from 'react-router'
import { parseSubmission, report } from '@conform-to/react/future'
import { coerceFormValue } from '@conform-to/zod/v4/future'
import { LockOpen } from 'lucide-react'
import { GeneralErrorBoundary } from '~/components/error-boundary'
import { FormErrors, FormInput, useForm } from '~/components/form'
import { StatusButton } from '~/components/ui/status-button'
import {
  checkIsCommonPassword,
  requireAnonymous,
  resetUserPassword,
} from '~/lib/auth.server'
import { useIsPending } from '~/lib/misc'
import { PasswordAndConfirmPasswordSchema } from '~/lib/user-validation'
import { verifySessionStorage } from '~/lib/verification.server'
import type { Route } from './+types/reset-password'

export const resetPasswordUsernameSessionKey = 'resetPasswordUsername'

const ResetPasswordSchema = coerceFormValue(PasswordAndConfirmPasswordSchema)

async function requireResetPasswordUsername(request: Request) {
  await requireAnonymous(request)
  const verifySession = await verifySessionStorage.getSession(
    request.headers.get('cookie')
  )
  const resetPasswordUsername = verifySession.get(
    resetPasswordUsernameSessionKey
  )
  if (typeof resetPasswordUsername !== 'string' || !resetPasswordUsername) {
    throw redirect('/login')
  }
  return resetPasswordUsername
}

export async function loader({ request }: Route.LoaderArgs) {
  const resetPasswordUsername = await requireResetPasswordUsername(request)
  return { resetPasswordUsername }
}

export async function action({ request }: Route.ActionArgs) {
  const resetPasswordUsername = await requireResetPasswordUsername(request)
  const formData = await request.formData()
  const submission = parseSubmission(formData)
  const result = ResetPasswordSchema.safeParse(submission.payload)
  if (!result.success) {
    return data(
      {
        result: report(submission, {
          error: result.error,
          hideFields: ['password', 'confirmPassword'],
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
          hideFields: ['password', 'confirmPassword'],
        }),
      },
      { status: 400 }
    )
  }

  const { password } = result.data

  await resetUserPassword({ username: resetPasswordUsername, password })
  const verifySession = await verifySessionStorage.getSession()
  return redirect('/login', {
    headers: {
      'set-cookie': await verifySessionStorage.destroySession(verifySession),
    },
  })
}

export const meta: Route.MetaFunction = () => {
  return [{ title: 'Reset Password | Course Anchor' }]
}

export default function ResetPasswordPage({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const isPending = useIsPending()

  const { form, fields } = useForm(ResetPasswordSchema, {
    id: 'reset-password',
    lastResult: actionData?.result,
    shouldValidate: 'onSubmit',
    shouldRevalidate: 'onBlur',
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
        <h2 className="mt-8 text-2xl/9 font-bold tracking-tight">
          Password Reset
        </h2>
        <p className="mt-2 text-sm/6 text-muted-foreground">
          Hi, {loaderData.resetPasswordUsername}. No worries. It happens all the
          time.
        </p>
      </div>
      <div className="mt-10">
        <div>
          <Form method="POST" {...form.props} className="space-y-6">
            <FormInput
              {...fields.password.inputProps}
              type="password"
              label="New Password"
              autoComplete="new-password"
              autoFocus
            />
            <FormInput
              {...fields.confirmPassword.inputProps}
              type="password"
              label="Confirm New Password"
              autoComplete="new-password"
            />
            <FormErrors id={form.errorId} errors={form.errors} />
            <StatusButton
              className="w-full"
              status={isPending ? 'pending' : 'idle'}
              size={'lg'}
              type="submit"
              disabled={isPending}
              icon={<LockOpen />}
            >
              Reset password
            </StatusButton>
          </Form>
        </div>
      </div>
    </div>
  )
}

export function ErrorBoundary() {
  return <GeneralErrorBoundary />
}
