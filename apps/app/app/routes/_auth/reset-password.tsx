import { data, Form, redirect } from 'react-router'
import { parseSubmission, report } from '@conform-to/react/future'
import { coerceFormValue } from '@conform-to/zod/v4/future'
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
			{ result: report(submission, { error: result.error }) },
			{ status: 400 },
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
			{ status: 400 },
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

  const {form, fields} = useForm(ResetPasswordSchema,{
    id: 'reset-password',
    lastResult: actionData?.result
  })

  return (
    <div className="container flex flex-col justify-center pt-20 pb-32">
      <div className="text-center">
        <h1 className="text-h1">Password Reset</h1>
        <p className="text-body-md text-muted-foreground mt-3">
          Hi, {loaderData.resetPasswordUsername}. No worries. It happens all the
          time.
        </p>
      </div>
      <div className="mx-auto mt-16 max-w-sm min-w-full sm:min-w-92">
        <Form method="POST" {...form.props}>
					<FormInput
						{...fields.password}
						errors={fields.password.errors}
						errorId={fields.password.errorId}
						id={fields.password.id}
						type="password"
						label="New Password"
						autoComplete="new-password"
						/>
          <FormInput
						{...fields.confirmPassword}
						errors={fields.confirmPassword.errors}
						errorId={fields.confirmPassword.errorId}
						id={fields.confirmPassword.id}
						type="password"
						label="Confirm New Password"
						autoComplete="new-password"
						/>
					<FormErrors id={form.errorId} errors={form.errors} />
          <StatusButton
            className="w-full"
            status={isPending ? 'pending' : 'idle'}
            type="submit"
            disabled={isPending}
          >
            Reset password
          </StatusButton>
        </Form>
      </div>
    </div>
  )
}

export function ErrorBoundary() {
  return <GeneralErrorBoundary />
}
