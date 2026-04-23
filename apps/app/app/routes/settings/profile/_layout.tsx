import { Link, Outlet, useMatches } from 'react-router'
import {
  SidebarProvider,
  SidebarTrigger,
} from '@course-anchor/ui/components/sidebar'
import { TooltipProvider } from '@course-anchor/ui/components/tooltip'
import { cn } from '@course-anchor/ui/lib/utils'
import { invariantResponse } from '@epic-web/invariant'
import { z } from 'zod'
import { AppSidebar } from '~/components/app-sidebar'
import { Spacer } from '~/components/ui/spacer'
// import { Icon } from '#app/components/ui/icon.tsx'
import { requireUserId } from '~/lib/auth.server'
import { prisma } from '~/lib/db.server'
import { useUser } from '~/lib/user'
import { type Route } from './+types/_layout'

export const BreadcrumbHandle = z.object({ breadcrumb: z.any() })
export type BreadcrumbHandle = z.infer<typeof BreadcrumbHandle>

export const handle: BreadcrumbHandle = {
  //breadcrumb: <Icon name="file-text">Edit Profile</Icon>
  breadcrumb: 'Edit Profile',
}

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireUserId(request)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true },
  })
  invariantResponse(user, 'User not found', { status: 404 })
  return {}
}

const BreadcrumbHandleMatch = z.object({
  handle: BreadcrumbHandle,
})

export default function EditUserProfile() {
  const user = useUser()
  const matches = useMatches()
  const breadcrumbs = matches
    .map(m => {
      const result = BreadcrumbHandleMatch.safeParse(m)
      if (!result.success || !result.data.handle.breadcrumb) return null
      return (
        <Link key={m.id} to={m.pathname} className="flex items-center">
          {result.data.handle.breadcrumb}
        </Link>
      )
    })
    .filter(Boolean)

  return (
    <SidebarProvider>
      <TooltipProvider>
        <AppSidebar />
      </TooltipProvider>
      <SidebarTrigger />
      <div className="m-auto mt-16 mb-24 max-w-3xl">
        <div className="container">
          <ul className="flex gap-3">
            <li>
              <Link className="text-muted-foreground" to={`/${user.username}`}>
                Profile
              </Link>
            </li>
            {breadcrumbs.map((breadcrumb, i, arr) => (
              <li
                key={i}
                className={cn('flex items-center gap-3', {
                  'text-muted-foreground': i < arr.length - 1,
                })}
              >
                {/* <Icon name="arrow-right" size="sm">
								{breadcrumb}
							</Icon> */}
              </li>
            ))}
          </ul>
        </div>
        <Spacer size="xs" />

        <main className="bg-muted mx-auto px-6 py-8 md:container md:rounded-3xl">
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  )
}
