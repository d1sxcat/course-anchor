import { Fragment } from 'react'
import { Outlet } from 'react-router'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@course-anchor/ui/components/breadcrumb'
import { Separator } from '@course-anchor/ui/components/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@course-anchor/ui/components/sidebar'
import { TooltipProvider } from '@course-anchor/ui/components/tooltip'
import { AppSidebar } from '~/components/app-sidebar'
import { useBreadcrumbs } from '~/hooks/use-breadcrumbs'
import { requireUserId } from '~/lib/auth.server'
import { type Route } from './+types/_layout'

export async function loader({ request }: Route.LoaderArgs) {
  await requireUserId(request)
  return {}
}

export default function Layout() {
  const breadcrumbs = useBreadcrumbs()
  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': '350px',
        } as React.CSSProperties
      }
    >
      <TooltipProvider>
        <AppSidebar />
      </TooltipProvider>
      <SidebarInset>
        <header className="sticky top-0 flex shrink-0 items-center gap-2 border-b bg-background p-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2" />
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((breadcrumb, index, arr) =>
                breadcrumb ? (
                  <Fragment key={index}>
                    {index < arr.length - 1 ? (
                      <>
                        <BreadcrumbItem>
                          <BreadcrumbLink render={breadcrumb.link} />
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                      </>
                    ) : (
                      <BreadcrumbItem>
                        <BreadcrumbPage>{breadcrumb.name}</BreadcrumbPage>
                      </BreadcrumbItem>
                    )}
                  </Fragment>
                ) : null
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex-1">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
