import { Form, useSearchParams } from 'react-router'
import { coerceFormValue } from '@conform-to/zod/v4/future'
import { HoneypotInputs } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '~/components/error-boundary'
import { FormErrors, FormOTP, useForm } from '~/components/form'
import { Spacer } from '~/components/ui/spacer'
import { StatusButton } from '~/components/ui/status-button'
import { checkHoneypot } from '~/lib/honeypot.server'
import { useIsPending } from '~/lib/misc'
import type { Route } from './+types/verify'
import { validateRequest } from './verify.server'

export const codeQueryParam = 'code'
export const targetQueryParam = 'target'
export const typeQueryParam = 'type'
export const redirectToQueryParam = 'redirectTo'
const types = ['onboarding', 'reset-password', 'change-email', '2fa'] as const
const VerificationTypeSchema = z.enum(types)
export type VerificationTypes = z.infer<typeof VerificationTypeSchema>

export const VerifySchema = coerceFormValue(
  z.object({
    [codeQueryParam]: z.string().min(6).max(6),
    [typeQueryParam]: VerificationTypeSchema,
    [targetQueryParam]: z.string(),
    [redirectToQueryParam]: z.string().optional(),
  })
)

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()
  await checkHoneypot(formData)
  return validateRequest(request, formData)
}

export default function VerifyRoute({ actionData }: Route.ComponentProps) {
  const [searchParams] = useSearchParams()
  const isPending = useIsPending()
  const parseWithZoddType = VerificationTypeSchema.safeParse(
    searchParams.get(typeQueryParam)
  )
  const type = parseWithZoddType.success ? parseWithZoddType.data : null

  const checkEmail = (
    <>
      <h1 className="text-h1">Check your email</h1>
      <p className="text-body-md text-muted-foreground mt-3">
        We've sent you a code to verify your email address.
      </p>
    </>
  )

  const headings: Record<VerificationTypes, React.ReactNode> = {
    onboarding: checkEmail,
    'reset-password': checkEmail,
    'change-email': checkEmail,
    '2fa': (
      <>
        <h1 className="text-h1">Check your 2FA app</h1>
        <p className="text-body-md text-muted-foreground mt-3">
          Please enter your 2FA code to verify your identity.
        </p>
      </>
    ),
  }

  const { form, fields } = useForm(VerifySchema, {
    id: 'verify-form',
    lastResult: actionData?.result,
    defaultValue: {
      code: searchParams.get(codeQueryParam),
      type: type,
      target: searchParams.get(targetQueryParam),
      redirectTo: searchParams.get(redirectToQueryParam),
    },
  })

  return (
    <main className="container flex flex-col justify-center pt-20 pb-32">
      <div className="text-center">
        {type ? headings[type] : 'Invalid Verification Type'}
      </div>

      <Spacer size="xs" />

      <div className="mx-auto flex w-72 max-w-full flex-col justify-center gap-1">
        <div>
          <FormErrors errors={form.errors} id={form.errorId} />
        </div>
        <div className="flex w-full gap-2">
          <Form method="POST" {...form.props} className="flex-1">
            <HoneypotInputs />
            <div className="flex items-center justify-center">
              <FormOTP
                {...fields[codeQueryParam]}
                errorId={fields[codeQueryParam].errorId}
                id={fields[codeQueryParam].id}
                ariaInvalid={fields[codeQueryParam].ariaInvalid}
                errors={fields[codeQueryParam].errors}
              />
            </div>
            <input
              name={fields[typeQueryParam].name}
              id={fields[typeQueryParam].id}
              value={fields[typeQueryParam].defaultValue}
              type="hidden"
            />
            <input
              name={fields[targetQueryParam].name}
              id={fields[targetQueryParam].id}
              value={fields[targetQueryParam].defaultValue}
              type="hidden"
            />
            <input
              name={fields[redirectToQueryParam].name}
              id={fields[redirectToQueryParam].id}
              value={fields[redirectToQueryParam].defaultValue}
              type="hidden"
            />
            <StatusButton
              className="w-full"
              status={isPending ? 'pending' : 'idle'}
              type="submit"
              disabled={isPending}
            >
              Submit
            </StatusButton>
          </Form>
        </div>
      </div>
    </main>
  )
}

export function ErrorBoundary() {
  return <GeneralErrorBoundary />
}
