import {
  Form,
  Link,
  useLoaderData,
  type LoaderFunctionArgs,
} from 'react-router'
import { Button } from '@course-anchor/ui/components/button'
import { invariantResponse } from '@epic-web/invariant'
import { Img } from 'openimg/react'
import { type SidebarHandle } from '~/components/app-sidebar'
import { GeneralErrorBoundary } from '~/components/error-boundary'
import { LinkButton } from '~/components/ui/link'
import { Spacer } from '~/components/ui/spacer'
//import { Icon } from '#app/components/ui/icon.tsx'
import { prisma } from '~/lib/db.server'
import { getUserImgSrc } from '~/lib/misc'
import { useOptionalUser } from '~/lib/user'
import { type Route } from './+types/index'

export const handle: SidebarHandle = {
  sidebar: 'users',
}

export async function loader({ params }: LoaderFunctionArgs) {
  const user = await prisma.user.findFirst({
    select: {
      id: true,
      name: true,
      username: true,
      createdAt: true,
      image: { select: { id: true, objectKey: true } },
    },
    where: {
      username: params.username,
    },
  })

  invariantResponse(user, 'User not found', { status: 404 })

  return { user, userJoinedDisplay: user.createdAt.toLocaleDateString() }
}

export default function ProfileRoute() {
  const data = useLoaderData<typeof loader>()
  const user = data.user
  const userDisplayName = user.name ?? user.username
  const loggedInUser = useOptionalUser()
  const isLoggedInUser = user.id === loggedInUser?.id

  return (
    <div className="container mt-36 mb-48 flex flex-col items-center justify-center">
      <Spacer size="4xs" />

      <div className="bg-muted container flex flex-col items-center rounded-3xl p-12">
        <div className="relative w-52">
          <div className="absolute -top-40">
            <div className="relative">
              <Img
                src={getUserImgSrc(data.user.image?.objectKey)}
                alt={userDisplayName}
                className="size-52 rounded-full object-cover"
                width={832}
                height={832}
              />
            </div>
          </div>
        </div>

        <Spacer size="sm" />

        <div className="flex flex-col items-center">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <h1 className="text-h2 text-center">{userDisplayName}</h1>
          </div>
          <p className="text-muted-foreground mt-2 text-center">
            Joined {data.userJoinedDisplay}
          </p>
          {isLoggedInUser ? (
            <Form action="/logout" method="POST" className="mt-3">
              <Button type="submit" variant="link" size="sm">
                {/* <Icon name="exit" className="scale-125 max-md:scale-150"> */}
                Logout
                {/* </Icon> */}
              </Button>
            </Form>
          ) : null}
          <div className="mt-10 flex gap-4">
            {isLoggedInUser ? (
              <>
                <LinkButton to="notes" prefetch="intent">
                  My notes
                </LinkButton>

                <LinkButton to="/settings" prefetch="intent">
                  Edit profile
                </LinkButton>
              </>
            ) : (
              <LinkButton to="notes" prefetch="intent">
                {userDisplayName}'s notes
              </LinkButton>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export const meta: Route.MetaFunction = ({ data, params }) => {
  const displayName = data?.user.name ?? params.username
  return [
    { title: `${displayName} | Epic Notes` },
    {
      name: 'description',
      content: `Profile of ${displayName} on Epic Notes`,
    },
  ]
}

export function ErrorBoundary() {
  return (
    <GeneralErrorBoundary
      statusHandlers={{
        404: ({ params }) => (
          <p>No user with the username "{params.username}" exists</p>
        ),
      }}
    />
  )
}
