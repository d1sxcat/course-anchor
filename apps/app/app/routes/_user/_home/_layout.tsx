import { Outlet } from 'react-router'
import { type SidebarHandle } from '~/components/app-sidebar'
import { type BreadcrumbHandle } from '~/hooks/use-breadcrumbs'

export const handle: BreadcrumbHandle & SidebarHandle = {
  breadcrumb: 'Home',
  sidebar: 'default',
}

export default function Layout() {
  return <Outlet />
}
