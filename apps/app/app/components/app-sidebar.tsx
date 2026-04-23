import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from '@course-anchor/ui/components/sidebar'
import { useRequestInfo } from '~/lib/request-info'
import { ThemeSwitch } from '~/routes/resources/theme-switch'

export function AppSidebar() {
  const requestInfo = useRequestInfo()
  return (
    <Sidebar>
      <SidebarHeader />
      <SidebarContent>
        <SidebarGroup />
        <SidebarGroup />
      </SidebarContent>
      <SidebarFooter>
        <ThemeSwitch userPreference={requestInfo?.userPrefs.theme} />
      </SidebarFooter>
    </Sidebar>
  )
}
