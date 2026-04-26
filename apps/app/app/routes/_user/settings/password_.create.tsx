import { data, Form, redirect } from 'react-router'
import { parseSubmission, report } from '@conform-to/react/future'
import { coerceFormValue } from '@conform-to/zod/v4/future'
import { Button } from '@course-anchor/ui/components/button'
import { FormErrors, FormInput, useForm } from '~/components/form'
import { LinkButton } from '~/components/ui/link'
//mport { Icon } from '#app/components/ui/icon.tsx'
import { StatusButton } from '~/components/ui/status-button'
import { type BreadcrumbHandle } from '~/hooks/use-breadcrumbs'
import {
  checkIsCommonPassword,
  getPasswordHash,
  requireUserId,
} from '~/lib/auth.server'
import { prisma } from '~/lib/db.server'
import { useIsPending } from '~/lib/misc'
import { PasswordAndConfirmPasswordSchema } from '~/lib/user-validation'
import { type Route } from './+types/password_.create'

// import 'lucide-react'

export const handle: BreadcrumbHandle = {
  //breadcrumb: <Icon name="dots-horizontal">Password</Icon>,
  breadcrumb: 'Password',
}

const CreatePasswordForm = coerceFormValue(PasswordAndConfirmPasswordSchema)

async function requireNoPassword(userId: string) {
  const password = await prisma.password.findUnique({
    select: { userId: true },
    where: { userId },
  })
  if (password) {
    throw redirect('/settings/password')
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireUserId(request)
  await requireNoPassword(userId)
  return {}
}

export async function action({ request }: Route.ActionArgs) {
  const userId = await requireUserId(request)
  await requireNoPassword(userId)
  const formData = await request.formData()
  const submission = parseSubmission(formData)
  const result = CreatePasswordForm.safeParse(submission.payload)
  if (!result.success) {
    return data(
      {
        result: report(submission, { error: result.error }),
      },
      { status: 400 }
    )
  }
  const { password } = result.data
  const isCommonPassword = await checkIsCommonPassword(password)
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
  // const submission = await parseWithZod(formData, {
  // 	async: true,
  // 	schema: CreatePasswordForm.superRefine(async ({ password }, ctx) => {
  // 		const isCommonPassword = await checkIsCommonPassword(password)
  // 		if (isCommonPassword) {
  // 			ctx.addIssue({
  // 				path: ['password'],
  // 				code: 'custom',
  // 				message: 'Password is too common',
  // 			})
  // 		}
  // 	}),
  // })
  // if (submission.status !== 'success') {
  // 	return data(
  // 		{
  // 			result: submission.reply({
  // 				hideFields: ['password', 'confirmPassword'],
  // 			}),
  // 		},
  // 		{ status: submission.status === 'error' ? 400 : 200 },
  // 	)
  // }

  // const { password } = submission.value

  await prisma.user.update({
    select: { username: true },
    where: { id: userId },
    data: {
      password: {
        create: {
          hash: await getPasswordHash(password),
        },
      },
    },
  })

  return redirect(`/settings`, { status: 302 })
}

export default function CreatePasswordRoute({
  actionData,
}: Route.ComponentProps) {
  const isPending = useIsPending()

  const { form, fields } = useForm(CreatePasswordForm, {
    id: 'password-create-form',
    lastResult: actionData?.result,
  })

  return (
    <Form method="POST" {...form.props} className="mx-auto max-w-md">
      <FormInput
        {...fields.password.inputProps}
        type="password"
        autoComplete="new-password"
        label="New Password"
      />
      <FormInput
        {...fields.confirmPassword.inputProps}
        type="password"
        autoComplete="new-password"
        label="Confirm New Password"
      />
      <FormErrors id={form.errorId} errors={form.errors} />
      <div className="grid w-full grid-cols-2 gap-6">
        <LinkButton variant={'secondary'} to="..">
          Cancel
        </LinkButton>

        <StatusButton type="submit" status={isPending ? 'pending' : 'idle'}>
          Create Password
        </StatusButton>
      </div>
    </Form>
  )
}
