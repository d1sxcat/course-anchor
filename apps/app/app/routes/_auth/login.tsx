import { useOptimistic, useState, useTransition } from 'react'
import { data, Form, Link, useNavigate, useSearchParams } from 'react-router'
import { parseSubmission, report } from '@conform-to/react/future'
import { coerceFormValue } from '@conform-to/zod/v4/future'
import { FieldSeparator } from '@course-anchor/ui/components/field'
import { startAuthentication } from '@simplewebauthn/browser'
import { Key, LogIn } from 'lucide-react'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '~/components/error-boundary'
import { FormCheckbox, FormErrors, FormInput, useForm } from '~/components/form'
import { StatusButton } from '~/components/ui/status-button'
import { login, requireAnonymous } from '~/lib/auth.server'
import { ProviderConnectionForm, providerNames } from '~/lib/connections'
import { checkHoneypot } from '~/lib/honeypot.server'
import { getErrorMessage, useIsPending } from '~/lib/misc'
import { PasswordSchema, UsernameSchema } from '~/lib/user-validation'
import { type Route } from './+types/login'
import { handleNewSession } from './login.server'
import { useTranslation } from 'react-i18next'
import { getInstance } from "~/middleware/i18next";

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

export async function action({ request, context }: Route.ActionArgs) {
  await requireAnonymous(request)
  const formData = await request.formData()
  await checkHoneypot(formData)
	const { t } = getInstance(context)
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
          error: { formErrors: [t('auth:login.invalidCredentials')] },
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
	const { t } = useTranslation('auth')

  const { form, fields } = useForm(LoginFormSchema, {
    id: 'login-form',
    defaultValue: { redirectTo, remember: false },
    lastResult: actionData?.result,
    shouldValidate: 'onSubmit',
    shouldRevalidate: 'onInput',
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
          {t('login.title')}
        </h2>
        <p className="mt-2 text-sm/6 text-gray-500 dark:text-gray-400">
          {t('login.notAMember')}{' '}
          <Link
            to="/signup"
            className="font-semibold text-primary hover:text-primary/90"
          >
            {t('login.startTrial')}
          </Link>
        </p>
      </div>

      <div className="mt-10">
        <div>
          <Form {...form.props} method="POST" className="space-y-6">
            <HoneypotInputs />
            <FormInput
              {...fields.username.inputProps}
              label={t('login.username')}
              autoComplete="username"
							placeholder={t('login.username')}
              autoFocus
            />
            <FormInput
              {...fields.password.inputProps}
              label={t('login.password')}
              type="password"
              autoComplete="current-password"
							placeholder={t('login.password')}
            />
            <div className="flex items-center justify-between">
              <div className="flex">
                <FormCheckbox
                  {...fields.remember.checkboxProps}
                  label={t('login.rememberMe')}
                  controlFirst
                  horizontal
                />
              </div>
              <div className="text-sm/6">
                <Link to="/forgot-password" className="font-semibold text-primary hover:text-primary/90">
                  {t('login.forgotPassword')}
                </Link>
              </div>
            </div>
            <input
              type="hidden"
              name={fields.redirectTo.name}
              value={fields.redirectTo.defaultValue ?? ''}
            />
            <FormErrors errors={form.errors} id={form.errorId} />
            <div>
              <StatusButton
                className="w-full font-semibold"
                variant={'default'}
                size={'lg'}
                status={isPending ? 'pending' : 'idle'}
                type="submit"
                disabled={isPending}
                icon={<LogIn />}
              >
                {t('signIn')}
              </StatusButton>
            </div>
          </Form>
          <div className="mt-4">
            <PasskeyLogin
              redirectTo={redirectTo}
              remember={fields.remember.checkboxProps.value === 'on'}
            />
          </div>
        </div>
        <div className="mt-10">
          <FieldSeparator>{t('login.orContinueWith')}</FieldSeparator>
          <ul className="flex flex-col gap-4 mt-6">
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
  const { t } = useTranslation('auth')
  const [passkeyMessage, setPasskeyMessage] = useOptimistic<string | null>(
    t('passkey.loginWithPasskey')
  )
  const navigate = useNavigate()

  async function handlePasskeyLogin() {
    try {
      setPasskeyMessage(t('passkey.generatingOptions'))
      // Get authentication options from the server
      const optionsResponse = await fetch('/webauthn/authentication')
      const json = await optionsResponse.json()
      const { options } = AuthenticationOptionsSchema.parse(json)

      setPasskeyMessage(t('passkey.requestingAuthorization'))
      const authResponse = await startAuthentication({ optionsJSON: options })
      setPasskeyMessage(t('passkey.verifyingPasskey'))

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

      setPasskeyMessage(t('passkey.loggedIn'))
      await navigate(location ?? '/')
    } catch (e) {
      const errorMessage = getErrorMessage(e)
      setError(t('passkey.failed', { error: errorMessage }))
    }
  }

  return (
    <form action={handlePasskeyLogin}>
      <StatusButton
        id="passkey-login-button"
        aria-describedby="passkey-login-button-error"
        className="w-full"
        size={'lg'}
        variant={'outline'}
        status={isPending ? 'pending' : error ? 'error' : 'idle'}
        type="submit"
        disabled={isPending}
        icon={<Key />}
      >
        {passkeyMessage}
      </StatusButton>
      {error ? (
        <div className="mt-2">
          <FormErrors errors={[error]} id="passkey-login-button-error" />
        </div>
      ) : null}
    </form>
  )
}

export const meta: Route.MetaFunction = () => {
  return [{ title: 'Login to Course Anchor' }]
}

export function ErrorBoundary() {
  return <GeneralErrorBoundary />
}
