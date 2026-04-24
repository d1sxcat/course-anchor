import { Outlet } from 'react-router'
import { type SidebarHandle } from '~/components/app-sidebar'
import { type BreadcrumbHandle } from '~/hooks/use-breadcrumbs'

export const handle: BreadcrumbHandle & SidebarHandle = {
  breadcrumb: 'Settings',
  sidebar: 'settings',
}

export default function Layout() {
  return <Outlet />
}
