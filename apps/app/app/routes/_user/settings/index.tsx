import { data, Link, useFetcher } from 'react-router'
import {
  parseSubmission,
  report,
  type Submission,
} from '@conform-to/react/future'
import { coerceFormValue } from '@conform-to/zod/v4/future'
import { invariantResponse } from '@epic-web/invariant'
import { Camera } from 'lucide-react'
import { Img } from 'openimg/react'
import { z } from 'zod'
import { FormErrors, FormInput, useForm } from '~/components/form'
import { LinkButton } from '~/components/ui/link'
import { StatusButton } from '~/components/ui/status-button'
import { requireUserId, sessionKey } from '~/lib/auth.server'
import { prisma } from '~/lib/db.server'
import { getUserImgSrc, useDoubleCheck } from '~/lib/misc'
import { authSessionStorage } from '~/lib/session.server'
import { redirectWithToast } from '~/lib/toast.server'
import { NameSchema, UsernameSchema } from '~/lib/user-validation'
import { type Route } from './+types/index'
import { twoFAVerificationType } from './two-factor/_layout'

const ProfileFormSchema = coerceFormValue(
  z.object({
    name: NameSchema.nullable().default(null),
    username: UsernameSchema,
  })
)

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireUserId(request)
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      image: {
        select: { objectKey: true },
      },
      _count: {
        select: {
          sessions: {
            where: {
              expirationDate: { gt: new Date() },
            },
          },
        },
      },
    },
  })

  const twoFactorVerification = await prisma.verification.findUnique({
    select: { id: true },
    where: { target_type: { type: twoFAVerificationType, target: userId } },
  })

  const password = await prisma.password.findUnique({
    select: { userId: true },
    where: { userId },
  })

  return {
    user,
    hasPassword: Boolean(password),
    isTwoFactorEnabled: Boolean(twoFactorVerification),
  }
}

type ProfileActionArgs = {
  request: Request
  userId: string
  submission: Submission
}
const profileUpdateActionIntent = 'update-profile'
const signOutOfSessionsActionIntent = 'sign-out-of-sessions'
const deleteDataActionIntent = 'delete-data'

export async function action({ request }: Route.ActionArgs) {
  const userId = await requireUserId(request)
  const formData = await request.formData()
  const submission = parseSubmission(formData)
  const intent = formData.get('intent')
  switch (intent) {
    case profileUpdateActionIntent: {
      return profileUpdateAction({ request, userId, submission })
    }
    case signOutOfSessionsActionIntent: {
      return signOutOfSessionsAction({ request, userId, submission })
    }
    case deleteDataActionIntent: {
      return deleteDataAction({ request, userId, submission })
    }
    default: {
      throw new Response(`Invalid intent "${intent}"`, { status: 400 })
    }
  }
}

export default function EditUserProfile({ loaderData }: Route.ComponentProps) {
  return (
    <div className="flex flex-col gap-12">
      <div className="flex justify-center">
        <div className="relative size-52">
          <Img
            src={getUserImgSrc(loaderData.user.image?.objectKey)}
            alt={loaderData.user.name ?? loaderData.user.username}
            className="h-full w-full rounded-full object-cover"
            width={832}
            height={832}
            isAboveFold
          />
          <LinkButton
            preventScrollReset
            to="photo"
            title="Change profile photo"
            aria-label="Change profile photo"
            variant={'outline'}
            className="absolute top-3 -right-3 flex size-10 items-center justify-center rounded-full p-0"
          >
            <Camera className="size-4" />
          </LinkButton>
        </div>
      </div>
      <UpdateProfile loaderData={loaderData} />

      <div className="border-foreground col-span-6 my-6 h-1 border-b-[1.5px]" />
      <div className="col-span-full flex flex-col gap-6">
        <div>
          <Link to="change-email">
            Change email from {loaderData.user.email}
            {/* <Icon name="envelope-closed">
            </Icon> */}
          </Link>
        </div>
        <div>
          <Link to="two-factor">
            {loaderData.isTwoFactorEnabled ? (
              <span>2FA is enabled</span>
            ) : (
              // <Icon name="lock-closed"></Icon>
              <span>Enable 2FA</span>
              // <Icon name="lock-open-1"></Icon>
            )}
          </Link>
        </div>
        <div>
          <Link to={loaderData.hasPassword ? 'password' : 'password/create'}>
            {/* <Icon name="dots-horizontal"> */}
            {loaderData.hasPassword ? 'Change Password' : 'Create a Password'}
            {/* </Icon> */}
          </Link>
        </div>
        <div>
          <Link to="connections">
            {/* <Icon name="link-2"> */}Manage connections{/* </Icon> */}
          </Link>
        </div>
        <div>
          <Link to="passkeys">
            {/* <Icon name="passkey"> */}Manage passkeys{/* </Icon> */}
          </Link>
        </div>
        <div>
          <Link
            reloadDocument
            download="my-epic-notes-data.json"
            to="/resources/download-user-data"
          >
            {/* <Icon name="download"> */}Download your data{/* </Icon> */}
          </Link>
        </div>
        <SignOutOfSessions loaderData={loaderData} />
        <DeleteData />
      </div>
    </div>
  )
}

async function profileUpdateAction({ userId, submission }: ProfileActionArgs) {
  const result = ProfileFormSchema.safeParse(submission.payload)
  if (!result.success) {
    return data(
      { result: report(submission, { error: result.error }) },
      { status: 400 }
    )
  }
  const existingUsername = await prisma.user.findUnique({
    where: { username: result.data.username },
    select: { id: true },
  })
  if (existingUsername && existingUsername.id !== userId) {
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
  const { username, name } = result.data

  await prisma.user.update({
    select: { username: true },
    where: { id: userId },
    data: {
      name: name,
      username: username,
    },
  })

  return data(
    {
      result: report(submission),
    },
    { status: 200 }
  )
}

function UpdateProfile({
  loaderData,
}: {
  loaderData: Route.ComponentProps['loaderData']
}) {
  const fetcher = useFetcher<typeof profileUpdateAction>()

  const { form, fields } = useForm(ProfileFormSchema, {
    id: 'edit-profile',
    lastResult: fetcher.data?.result,
    defaultValue: {
      username: loaderData.user.username,
      name: loaderData.user.name,
    },
  })

  return (
    <fetcher.Form {...form.props} method="POST">
      <div className="grid grid-cols-2 gap-x-10">
        <FormInput {...fields.username.inputProps} label={'Username'} />
        <FormInput {...fields.name.inputProps} label={'Name'} />
      </div>

      <FormErrors errors={form.errors} id={form.errorId} />

      <div className="mt-8 flex justify-center">
        <StatusButton
          type="submit"
          // size="wide"
          name={'intent'}
          value={profileUpdateActionIntent}
          status={fetcher.state !== 'idle' ? 'pending' : 'idle'}
        >
          Save changes
        </StatusButton>
      </div>
    </fetcher.Form>
  )
}

async function signOutOfSessionsAction({ request, userId }: ProfileActionArgs) {
  const authSession = await authSessionStorage.getSession(
    request.headers.get('cookie')
  )
  const sessionId = authSession.get(sessionKey)
  invariantResponse(
    sessionId,
    'You must be authenticated to sign out of other sessions'
  )
  await prisma.session.deleteMany({
    where: {
      userId,
      id: { not: sessionId },
    },
  })
  return { status: 'success' } as const
}

function SignOutOfSessions({
  loaderData,
}: {
  loaderData: Route.ComponentProps['loaderData']
}) {
  const dc = useDoubleCheck()

  const fetcher = useFetcher<typeof signOutOfSessionsAction>()
  const otherSessionsCount = loaderData.user._count.sessions - 1
  return (
    <div>
      {otherSessionsCount ? (
        <fetcher.Form method="POST">
          <StatusButton
            {...dc.getButtonProps({
              type: 'submit',
              name: 'intent',
              value: signOutOfSessionsActionIntent,
            })}
            variant={dc.doubleCheck ? 'destructive' : 'default'}
            status={
              fetcher.state !== 'idle'
                ? 'pending'
                : (fetcher.data?.status ?? 'idle')
            }
          >
            {/* <Icon name="avatar"> */}
            {dc.doubleCheck
              ? `Are you sure?`
              : `Sign out of ${otherSessionsCount} other sessions`}
            {/* </Icon> */}
          </StatusButton>
        </fetcher.Form>
      ) : (
        <span>This is your only session</span>
        // <Icon name="avatar"></Icon>
      )}
    </div>
  )
}

async function deleteDataAction({ userId }: ProfileActionArgs) {
  await prisma.user.delete({ where: { id: userId } })
  return redirectWithToast('/', {
    type: 'success',
    title: 'Data Deleted',
    description: 'All of your data has been deleted',
  })
}

function DeleteData() {
  const dc = useDoubleCheck()

  const fetcher = useFetcher<typeof deleteDataAction>()
  return (
    <div>
      <fetcher.Form method="POST">
        <StatusButton
          {...dc.getButtonProps({
            type: 'submit',
            name: 'intent',
            value: deleteDataActionIntent,
          })}
          variant={dc.doubleCheck ? 'destructive' : 'default'}
          status={fetcher.state !== 'idle' ? 'pending' : 'idle'}
        >
          {/* <Icon name="trash"> */}
          {dc.doubleCheck ? `Are you sure?` : `Delete all your data`}
          {/* </Icon> */}
        </StatusButton>
      </fetcher.Form>
    </div>
  )
}
