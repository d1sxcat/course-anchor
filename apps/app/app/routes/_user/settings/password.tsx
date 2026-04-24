import { data, Form, redirect } from 'react-router'
import { parseSubmission, report } from '@conform-to/react/future'
import { coerceFormValue } from '@conform-to/zod/v4/future'
import { z } from 'zod'
import { FormErrors, FormInput, useForm } from '~/components/form'
import { LinkButton } from '~/components/ui/link'
//import { Icon } from '#app/components/ui/icon.tsx'
import { StatusButton } from '~/components/ui/status-button'
import { type BreadcrumbHandle } from '~/hooks/use-breadcrumbs'
import {
  checkIsCommonPassword,
  getPasswordHash,
  requireUserId,
  verifyUserPassword,
} from '~/lib/auth.server'
import { prisma } from '~/lib/db.server'
import { useIsPending } from '~/lib/misc'
import { redirectWithToast } from '~/lib/toast.server'
import { PasswordSchema } from '~/lib/user-validation'
import { type Route } from './+types/password'

export const handle: BreadcrumbHandle = {
  breadcrumb: 'Password',
}

const ChangePasswordForm = coerceFormValue(
  z
    .object({
      currentPassword: PasswordSchema,
      newPassword: PasswordSchema,
      confirmNewPassword: PasswordSchema,
    })
    .superRefine(({ confirmNewPassword, newPassword }, ctx) => {
      if (confirmNewPassword !== newPassword) {
        ctx.addIssue({
          path: ['confirmNewPassword'],
          code: 'custom',
          message: 'The passwords must match',
        })
      }
    })
)

async function requirePassword(userId: string) {
  const password = await prisma.password.findUnique({
    select: { userId: true },
    where: { userId },
  })
  if (!password) {
    throw redirect('/settings/password/create')
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireUserId(request)
  await requirePassword(userId)
  return {}
}

export async function action({ request }: Route.ActionArgs) {
  const userId = await requireUserId(request)
  await requirePassword(userId)
  const formData = await request.formData()
  const submission = parseSubmission(formData)
  const result = ChangePasswordForm.safeParse(submission.payload)
  if (!result.success) {
    return data(
      {
        result: report(submission, {
          error: result.error,
          hideFields: ['currentPassword', 'newPassword', 'confirmNewPassword'],
        }),
      },
      { status: 400 }
    )
  }

  const { currentPassword, newPassword } = result.data

  const user = await verifyUserPassword({ id: userId }, currentPassword)
  if (!user) {
    return data(
      {
        result: report(submission, {
          error: {
            fieldErrors: {
              currentPassword: ['Incorrect password.'],
            },
          },
          hideFields: ['currentPassword', 'newPassword', 'confirmNewPassword'],
        }),
      },
      { status: 400 }
    )
  }
  const isCommonPassword = await checkIsCommonPassword(newPassword)
  if (isCommonPassword) {
    return data(
      {
        result: report(submission, {
          error: {
            fieldErrors: {
              newPassword: ['Password is too common'],
            },
          },
          hideFields: ['currentPassword', 'newPassword', 'confirmNewPassword'],
        }),
      },
      { status: 400 }
    )
  }

  await prisma.user.update({
    select: { username: true },
    where: { id: userId },
    data: {
      password: {
        update: {
          hash: await getPasswordHash(newPassword),
        },
      },
    },
  })

  return redirectWithToast(
    `/settings`,
    {
      type: 'success',
      title: 'Password Changed',
      description: 'Your password has been changed.',
    },
    { status: 302 }
  )
}

export default function ChangePasswordRoute({
  actionData,
}: Route.ComponentProps) {
  const isPending = useIsPending()

  const { form, fields } = useForm(ChangePasswordForm, {
    id: 'password-change-form',
    lastResult: actionData?.result,
  })

  return (
    <Form method="POST" {...form.props} className="mx-auto max-w-md">
      <FormInput
        {...fields.currentPassword}
        type="password"
        autoComplete="current-password"
        label="Current Password"
        id={fields.currentPassword.id}
        errorId={fields.currentPassword.errorId}
        errors={fields.currentPassword.errors}
        ariaInvalid={fields.currentPassword.ariaInvalid}
      />
      <FormInput
        {...fields.newPassword}
        type="password"
        autoComplete="new-password"
        label="New Password"
        id={fields.newPassword.id}
        errorId={fields.newPassword.errorId}
        errors={fields.newPassword.errors}
        ariaInvalid={fields.newPassword.ariaInvalid}
      />
      <FormInput
        {...fields.confirmNewPassword}
        type="password"
        autoComplete="new-password"
        label="Confirm New Password"
        id={fields.confirmNewPassword.id}
        errorId={fields.confirmNewPassword.errorId}
        errors={fields.confirmNewPassword.errors}
        ariaInvalid={fields.confirmNewPassword.ariaInvalid}
      />
      <FormErrors id={form.errorId} errors={form.errors} />
      <div className="grid w-full grid-cols-2 gap-6">
        <LinkButton variant={'secondary'} to="..">
          Cancel
        </LinkButton>
        <StatusButton type="submit" status={isPending ? 'pending' : 'idle'}>
          Change Password
        </StatusButton>
      </div>
    </Form>
  )
}
