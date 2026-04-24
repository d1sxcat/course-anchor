import { Link, redirect } from 'react-router'
import { coerceFormValue } from '@conform-to/zod/v4/future'
import { cn } from '@course-anchor/ui/lib/utils'
import { Img } from 'openimg/react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '~/components/error-boundary'
import { FormInput, FormTextarea, useForm, FormErrors } from '~/components/form'
import { prisma, searchUsers } from '~/lib/db.server.ts'
//import { SearchBar } from '~/components/search-bar.tsx'
import { getUserImgSrc, useDelayedIsPending } from '~/lib/misc'
import { type Route } from './+types/index'

const schema = coerceFormValue(
  z.object({
    search: z.string().optional(),
  })
)

export async function loader({ request }: Route.LoaderArgs) {
  const searchTerm = new URL(request.url).searchParams.get('search')
  if (searchTerm === '') {
    return redirect('/users')
  }

  const like = `%${searchTerm ?? ''}%`
  const users = await prisma.$queryRawTyped(searchUsers(like))
  return { status: 'idle', users } as const
}

export default function UsersRoute({ loaderData }: Route.ComponentProps) {
  const isPending = useDelayedIsPending({
    formMethod: 'GET',
    formAction: '/users',
  })

  const { form, fields } = useForm(schema, {
    defaultValue: {
      search: '',
    },
  })

  return (
    <div className="container mt-36 mb-48 flex flex-col items-center justify-center gap-6">
      <h1 className="text-h1">Epic Notes Users</h1>
      <div className="w-full max-w-175">
        {/* <SearchBar status={loaderData.status} autoFocus autoSubmit /> */}
      </div>
      <main>
        <FormInput
          {...fields.search}
          label="Search"
					description="Search by name or username"
          id={fields.search.id}
          errorId={fields.search.errorId}
          errors={fields.search.errors}
        />
        {/* <FormTextarea label="Search (textarea)" {...fields.search}/> */}
        {loaderData.status === 'idle' ? (
          loaderData.users.length ? (
            <ul
              className={cn(
                'flex w-full flex-wrap items-center justify-center gap-4 delay-200',
                { 'opacity-50': isPending }
              )}
            >
              {loaderData.users.map(user => (
                <li key={user.id}>
                  <Link
                    to={user.username}
                    className="bg-muted flex h-36 w-44 flex-col items-center justify-center rounded-lg px-5 py-3"
                    aria-label={`${user.name || user.username} profile`}
                  >
                    <Img
                      alt={user.name ?? user.username}
                      src={getUserImgSrc(user.imageobjectkey)}
                      className="size-16 rounded-full"
                      width={256}
                      height={256}
                    />
                    {user.name ? (
                      <span className="text-body-md w-full overflow-hidden text-center text-ellipsis whitespace-nowrap">
                        {user.name}
                      </span>
                    ) : null}
                    <span className="text-body-sm text-muted-foreground w-full overflow-hidden text-center text-ellipsis">
                      {user.username}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>No users found</p>
          )
        ) : loaderData.status === 'error' ? (
          <FormErrors id={'kwdijdw789vuwvh'} errors={['There was an error parsing the results']} />
        ) : null}
      </main>
    </div>
  )
}

export function ErrorBoundary() {
  return <GeneralErrorBoundary />
}
