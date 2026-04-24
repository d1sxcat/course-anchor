import {
  data,
  Form,
  redirect,
  useSearchParams,
  type Params,
} from 'react-router'
import {
  parseSubmission,
  report,
  type SubmissionResult,
} from '@conform-to/react/future'
import { coerceFormValue } from '@conform-to/zod/v4/future'
import { safeRedirect } from 'remix-utils/safe-redirect'
import { z } from 'zod'
import { FormCheckbox, FormErrors, FormInput, useForm } from '~/components/form'
import { Spacer } from '~/components/ui/spacer'
import { StatusButton } from '~/components/ui/status-button'
import {
  requireAnonymous,
  sessionKey,
  signupWithConnection,
} from '~/lib/auth.server'
import { ProviderNameSchema } from '~/lib/connections'
import { prisma } from '~/lib/db.server'
import { useIsPending } from '~/lib/misc'
import { authSessionStorage } from '~/lib/session.server'
import { redirectWithToast } from '~/lib/toast.server'
import { NameSchema, UsernameSchema } from '~/lib/user-validation'
import { verifySessionStorage } from '~/lib/verification.server'
import type { Route } from './+types/$provider'
import { onboardingEmailSessionKey } from './index'

export const providerIdKey = 'providerId'
export const prefilledProfileKey = 'prefilledProfile'

const SignupFormSchema = coerceFormValue(
  z.object({
    imageUrl: z.string().optional(),
    username: UsernameSchema,
    name: NameSchema,
    agreeToTermsOfServiceAndPrivacyPolicy: z.boolean(
      'You must agree to the terms of service and privacy policy'
    ),
    remember: z.boolean().optional(),
    redirectTo: z.string().optional(),
  })
)

async function requireData({
  request,
  params,
}: {
  request: Request
  params: Params
}) {
  await requireAnonymous(request)
  const verifySession = await verifySessionStorage.getSession(
    request.headers.get('cookie')
  )
  const email = verifySession.get(onboardingEmailSessionKey)
  const providerId = verifySession.get(providerIdKey)
  const result = z
    .object({
      email: z.string(),
      providerName: ProviderNameSchema,
      providerId: z.string().or(z.number()),
    })
    .safeParse({ email, providerName: params.provider, providerId })
  if (result.success) {
    return result.data
  } else {
    console.error(result.error)
    throw redirect('/signup')
  }
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const { email } = await requireData({ request, params })

  const verifySession = await verifySessionStorage.getSession(
    request.headers.get('cookie')
  )
  const prefilledProfile = verifySession.get(prefilledProfileKey) ?? {}

  return {
    email,
    status: 'idle',
    defaultValues: prefilledProfile,
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const { email, providerId, providerName } = await requireData({
    request,
    params,
  })
  const formData = await request.formData()
  const verifySession = await verifySessionStorage.getSession(
    request.headers.get('cookie')
  )
  const submission = parseSubmission(formData)
  const result = SignupFormSchema.safeParse(submission.payload)
  if (!result.success) {
    return data(
      { result: report(submission, { error: result.error }) },
      { status: 400 }
    )
  }

  const { username } = result.data
  const existingUser = await prisma.user.findUnique({
    where: { username },
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

  const session = await signupWithConnection({
    ...result.data,
    email,
    providerId: String(providerId),
    providerName,
  })

  const { remember, redirectTo } = result.data

  const authSession = await authSessionStorage.getSession(
    request.headers.get('cookie')
  )
  authSession.set(sessionKey, session.id)
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

export default function OnboardingProviderRoute({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const isPending = useIsPending()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirectTo')

  const { form, fields } = useForm(SignupFormSchema, {
    id: 'onboarding-provider-form',
    lastResult: actionData?.result,
    defaultValue: loaderData.defaultValues,
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
          {fields.imageUrl.defaultValue ? (
            <div className="mb-4 flex flex-col items-center justify-center gap-4">
              <img
                src={fields.imageUrl.defaultValue}
                alt="Profile"
                className="size-24 rounded-full"
              />
              <p className="text-body-sm text-muted-foreground">
                You can change your photo later
              </p>
              <input
                type="hidden"
                name="imageUrl"
                defaultValue={fields.imageUrl.defaultValue}
              />
            </div>
          ) : null}
          <FormInput
            {...fields.username}
            label={'Username'}
            autoComplete="username"
            errorId={fields.username.errorId}
            ariaInvalid={fields.username.ariaInvalid}
            id={fields.username.id}
            errors={fields.username.errors}
          />
          <FormInput
            {...fields.name}
            label={'Name'}
            autoComplete="name"
            errorId={fields.name.errorId}
            ariaInvalid={fields.name.ariaInvalid}
            id={fields.name.id}
            errors={fields.name.errors}
          />
          <FormCheckbox
            {...fields.agreeToTermsOfServiceAndPrivacyPolicy}
            label={'Do you agree to our Terms of Service and Privacy Policy?'}
            horizontal
            controlFirst
            id={fields.agreeToTermsOfServiceAndPrivacyPolicy.id}
            aria-invalid={
              fields.agreeToTermsOfServiceAndPrivacyPolicy.ariaInvalid
            }
            errorId={fields.agreeToTermsOfServiceAndPrivacyPolicy.errorId}
            errors={fields.agreeToTermsOfServiceAndPrivacyPolicy.errors}
          />
          <FormCheckbox
            {...fields.remember}
            label={'Remember me'}
            horizontal
            controlFirst
            id={fields.remember.id}
            aria-invalid={fields.remember.ariaInvalid}
            errorId={fields.remember.errorId}
            errors={fields.remember.errors}
          />
          {redirectTo ? (
            <input type="hidden" name="redirectTo" value={redirectTo} />
          ) : null}
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
