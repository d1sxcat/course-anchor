import { useState } from 'react'
import { data, Form, redirect, useNavigation } from 'react-router'
import { parseSubmission, report } from '@conform-to/react/future'
import { coerceFormValue } from '@conform-to/zod/v4/future'
import { Button } from '@course-anchor/ui/components/button'
import { invariantResponse } from '@epic-web/invariant'
import { parseFormData } from '@mjackson/form-data-parser'
import { Pencil, Trash } from 'lucide-react'
import { z } from 'zod'
import { FormErrors, useForm } from '~/components/form'
import { StatusButton } from '~/components/ui/status-button'
import { type BreadcrumbHandle } from '~/hooks/use-breadcrumbs'
import { requireUserId } from '~/lib/auth.server'
import { prisma } from '~/lib/db.server'
import { getUserImgSrc, useDoubleCheck, useIsPending } from '~/lib/misc'
import { uploadProfileImage } from '~/lib/storage.server'
import { type Route } from './+types/photo'

export const handle: BreadcrumbHandle = {
  //breadcrumb: <Icon name="avatar">Photo</Icon>,
  breadcrumb: 'Photo',
}

const MAX_SIZE = 1024 * 1024 * 3 // 3MB

const DeleteImageSchema = z.object({
  intent: z.literal('delete'),
})

const NewImageSchema = z.object({
  intent: z.literal('submit'),
  photoFile: z
    .file()
    .refine(file => file.size > 0, 'Image is required')
    .refine(file => file.size <= MAX_SIZE, 'Image size must be less than 3MB'),
})

const PhotoFormSchema = coerceFormValue(
  z.discriminatedUnion('intent', [DeleteImageSchema, NewImageSchema])
)

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireUserId(request)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      username: true,
      image: { select: { objectKey: true } },
    },
  })
  invariantResponse(user, 'User not found', { status: 404 })
  return { user }
}

export async function action({ request }: Route.ActionArgs) {
  const userId = await requireUserId(request)

  const formData = await parseFormData(request, { maxFileSize: MAX_SIZE })
  const submission = parseSubmission(formData)
  const result = PhotoFormSchema.safeParse(submission.payload)
  if (!result.success) {
    return data(
      { result: report(submission, { error: result.error }) },
      { status: 400 }
    )
  }

  if (result.data.intent === 'delete') {
    await prisma.userImage.deleteMany({ where: { userId } })
    return redirect('/settings')
  }

  if (result.data.photoFile.size <= 0) {
    return data(
      {
        result: report(submission, {
          error: { fieldErrors: { photoFile: ['Image is required'] } },
        }),
      },
      { status: 400 }
    )
  }

  const image = {
    objectKey: await uploadProfileImage(userId, result.data.photoFile),
  }

  await prisma.$transaction(async $prisma => {
    await $prisma.userImage.deleteMany({ where: { userId } })
    await $prisma.user.update({
      where: { id: userId },
      data: { image: { create: image } },
    })
  })

  return redirect('/settings')
}

export default function PhotoRoute({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const doubleCheckDeleteImage = useDoubleCheck()

  const navigation = useNavigation()

  const { form, fields, intent } = useForm(PhotoFormSchema, {
    id: 'profile-photo',
    lastResult: actionData?.result,
  })

  const isPending = useIsPending()
  const pendingIntent = isPending ? navigation.formData?.get('intent') : null
  // const lastSubmissionIntent =

  const [newImageSrc, setNewImageSrc] = useState<string | null>(null)

  return (
    <div>
      <Form
        method="POST"
        encType="multipart/form-data"
        className="flex flex-col items-center justify-center gap-10"
        onReset={() => setNewImageSrc(null)}
        {...form.props}
      >
        <img
          src={
            newImageSrc ??
            (loaderData.user
              ? getUserImgSrc(loaderData.user.image?.objectKey)
              : '')
          }
          className="size-52 rounded-full object-cover"
          alt={loaderData.user?.name ?? loaderData.user?.username}
        />
        <FormErrors errors={fields.photoFile.errors} id={fields.photoFile.id} />
        <div className="flex gap-4">
          {/*
						We're doing some kinda odd things to make it so this works well
						without JavaScript. Basically, we're using CSS to ensure the right
						buttons show up based on the input's "valid" state (whether or not
						an image has been selected). Progressive enhancement FTW!
					*/}
          <input
            // {...getInputProps(fields.photoFile, { type: 'file' })}
            name={fields.photoFile.name}
            id={fields.photoFile.id}
            type={'file'}
            accept="image/*"
            className="peer sr-only"
            required
            tabIndex={newImageSrc ? -1 : 0}
            onChange={e => {
              const file = e.currentTarget.files?.[0]
              if (file) {
                const reader = new FileReader()
                reader.onload = event => {
                  setNewImageSrc(event.target?.result?.toString() ?? null)
                }
                reader.readAsDataURL(file)
              }
            }}
          />
          <Button
            render={() => (
              <label htmlFor={fields.photoFile.id}>
                <Pencil />
                Change
              </label>
            )}
            className="cursor-pointer peer-valid:hidden peer-focus-within:ring-2 peer-focus-visible:ring-2"
          />
          <StatusButton
            name="intent"
            value="submit"
            type="submit"
            className="peer-invalid:hidden"
            status={pendingIntent === 'submit' ? 'pending' : 'idle'}
          >
            Save Photo
          </StatusButton>
          <Button
            variant="destructive"
            className="peer-invalid:hidden"
            type="reset"
            onClick={() => intent.reset()}
          >
            <Trash /> Reset
          </Button>
          {loaderData.user.image ? (
            <StatusButton
              className="peer-valid:hidden"
              variant="destructive"
              {...doubleCheckDeleteImage.getButtonProps({
                type: 'submit',
                name: 'intent',
                value: 'delete',
              })}
              status={pendingIntent === 'delete' ? 'pending' : 'idle'}
            >
              <Trash />
              {doubleCheckDeleteImage.doubleCheck ? 'Are you sure?' : 'Delete'}
            </StatusButton>
          ) : null}
        </div>
        <FormErrors id={form.errorId} errors={form.errors} />
      </Form>
    </div>
  )
}
