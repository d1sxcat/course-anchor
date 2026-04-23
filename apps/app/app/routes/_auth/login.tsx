import { useOptimistic, useState, useTransition } from 'react'
import { data, Form, Link, useNavigate, useSearchParams } from 'react-router'
import { parseSubmission, report } from '@conform-to/react/future'
import { coerceFormValue } from '@conform-to/zod/v4/future'
import { startAuthentication } from '@simplewebauthn/browser'
import { Key } from 'lucide-react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '~/components/error-boundary'
import { FormCheckbox, FormErrors, FormInput, useForm } from '~/components/form'
//import { CheckboxField, ErrorList, Field } from '~/components/forms'
import { Spacer } from '~/components/ui/spacer'
import { StatusButton } from '~/components/ui/status-button'
import { login, requireAnonymous } from '~/lib/auth.server'
import { ProviderConnectionForm, providerNames } from '~/lib/connections'
import { checkHoneypot } from '~/lib/honeypot.server'
import { getErrorMessage, useIsPending } from '~/lib/misc'
import { PasswordSchema, UsernameSchema } from '~/lib/user-validation'
import { type Route } from './+types/login'
import { handleNewSession } from './login.server'

const LoginFormSchema = coerceFormValue(
  z.object({
    username: UsernameSchema,
    password: PasswordSchema,
    redirectTo: z.string().optional(),
    remember: z.boolean().optional(),
  })
)

const AuthenticationOptionsSchema = coerceFormValue(
  z.object({
    options: z.object({ challenge: z.string() }),
  })
) satisfies z.ZodType<{ options: PublicKeyCredentialRequestOptionsJSON }>

export async function loader({ request }: Route.LoaderArgs) {
  await requireAnonymous(request)
  return {}
}

export async function action({ request }: Route.ActionArgs) {
  await requireAnonymous(request)
  const formData = await request.formData()
  await checkHoneypot(formData)
  const submission = parseSubmission(formData)
  const result = LoginFormSchema.safeParse(submission.payload)
  if (!result.success) {
    return data(
      { result: report(submission, { error: result.error }) },
      { status: 400 }
    )
  }
  const session = await login(result.data)
  if (!session) {
    return data(
      {
        result: report(submission, {
          error: { formErrors: ['Invalid username or password'] },
        }),
      },
      { status: 400 }
    )
  }
  const { remember, redirectTo } = result.data

  return handleNewSession({
    request,
    session,
    remember: remember ?? false,
    redirectTo,
  })
}

export default function LoginPage({ actionData }: Route.ComponentProps) {
  const isPending = useIsPending()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirectTo')

  const { form, fields } = useForm(LoginFormSchema, {
    id: 'login-form',
    defaultValue: { redirectTo },
    lastResult: actionData?.result,
  })

  return (
    <div className="flex min-h-full flex-col justify-center pt-20 pb-32">
      <div className="mx-auto w-full max-w-md">
        <div className="flex flex-col gap-3 text-center">
          <h1 className="text-h1">Welcome back!</h1>
          <p className="text-body-md text-muted-foreground">
            Please enter your details.
          </p>
        </div>
        <Spacer size="xs" />

        <div>
          <div className="mx-auto w-full max-w-md px-8">
            <Form method="POST" {...form.props}>
              <HoneypotInputs />
              <FormInput
                {...fields.username}
                errors={fields.username.errors}
                errorId={fields.username.errorId}
                id={fields.username.id}
                ariaInvalid={fields.username.ariaInvalid}
                label="Username"
								autoComplete='username'
              />
              <FormInput
                {...fields.password}
                errors={fields.password.errors}
                errorId={fields.password.errorId}
                id={fields.password.id}
                ariaInvalid={fields.password.ariaInvalid}
                label="Password"
                type="password"
								autoComplete="current-password"
              />
              <div className="flex justify-between">
                <FormCheckbox
                  {...fields.remember}
                  controlFirst
                  horizontal
                  errors={fields.remember.errors}
                  errorId={fields.remember.errorId}
                  id={fields.remember.id}
                  label="Remember me"
                  ariaInvalid={fields.remember.ariaInvalid}
                />
                <div>
                  <Link
                    to="/forgot-password"
                    className="text-body-xs font-semibold"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              <input
                type="hidden"
                name={fields.redirectTo.name}
                value={fields.redirectTo.defaultValue ?? ''}
              />
              <FormErrors errors={form.errors} id={form.errorId} />
              <div className="flex items-center justify-between gap-6 pt-3">
                <StatusButton
                  className="w-full"
                  status={isPending ? 'pending' : 'idle'}
                  type="submit"
                  disabled={isPending}
                >
                  Log in
                </StatusButton>
              </div>
            </Form>
            <hr className="my-4" />
            <div className="flex flex-col gap-5">
              <PasskeyLogin
                redirectTo={redirectTo}
                remember={fields.remember.checkboxProps.value === 'on'}
              />
            </div>
            <hr className="my-4" />
            <ul className="flex flex-col gap-5">
              {providerNames.map(providerName => (
                <li key={providerName}>
                  <ProviderConnectionForm
                    type="Login"
                    providerName={providerName}
                    redirectTo={redirectTo}
                  />
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-center gap-2 pt-6">
              <span className="text-muted-foreground">New here?</span>
              <Link
                to={
                  redirectTo
                    ? `/signup?redirectTo=${encodeURIComponent(redirectTo)}`
                    : '/signup'
                }
              >
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const VerificationResponseSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('success'),
    location: z.string(),
  }),
  z.object({
    status: z.literal('error'),
    error: z.string(),
  }),
])

function PasskeyLogin({
  redirectTo,
  remember,
}: {
  redirectTo: string | null
  remember: boolean
}) {
  const [isPending] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [passkeyMessage, setPasskeyMessage] = useOptimistic<string | null>(
    'Login with a passkey'
  )
  const navigate = useNavigate()

  async function handlePasskeyLogin() {
    try {
      setPasskeyMessage('Generating Authentication Options')
      // Get authentication options from the server
      const optionsResponse = await fetch('/webauthn/authentication')
      const json = await optionsResponse.json()
      const { options } = AuthenticationOptionsSchema.parse(json)

      setPasskeyMessage('Requesting your authorization')
      const authResponse = await startAuthentication({ optionsJSON: options })
      setPasskeyMessage('Verifying your passkey')

      // Verify the authentication with the server
      const verificationResponse = await fetch('/webauthn/authentication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authResponse, remember, redirectTo }),
      })

      const verificationJson = await verificationResponse.json().catch(() => ({
        status: 'error',
        error: 'Unknown error',
      }))

      const parsedResult =
        VerificationResponseSchema.safeParse(verificationJson)
      if (!parsedResult.success) {
        throw new Error(parsedResult.error.message)
      } else if (parsedResult.data.status === 'error') {
        throw new Error(parsedResult.data.error)
      }
      const { location } = parsedResult.data

      setPasskeyMessage("You're logged in! Navigating...")
      await navigate(location ?? '/')
    } catch (e) {
      const errorMessage = getErrorMessage(e)
      setError(`Failed to authenticate with passkey: ${errorMessage}`)
    }
  }

  return (
    <form action={handlePasskeyLogin}>
      <StatusButton
        id="passkey-login-button"
        aria-describedby="passkey-login-button-error"
        className="w-full"
        status={isPending ? 'pending' : error ? 'error' : 'idle'}
        type="submit"
        disabled={isPending}
      >
        <span className="inline-flex items-center gap-1.5">
          <Key />
          <span>{passkeyMessage}</span>
        </span>
      </StatusButton>
      {error ? <div className="mt-2">
        <FormErrors errors={[error]} id="passkey-login-button-error" />
      </div> : null}
    </form>
  )
}

export const meta: Route.MetaFunction = () => {
  return [{ title: 'Login to Course Anchor' }]
}

export function ErrorBoundary() {
  return <GeneralErrorBoundary />
}
