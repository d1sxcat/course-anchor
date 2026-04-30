import { Outlet } from 'react-router'
import { Button } from '@course-anchor/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from '@course-anchor/ui/components/dropdown-menu'
import { Languages, Paintbrush } from 'lucide-react'
import { Img } from 'openimg/react'
import { useRequestInfo } from '~/lib/request-info'
import { LanguageDropdown } from '~/routes/resources/locales'
import { ThemeDropdown } from '~/routes/resources/theme-switch'

export default function AuthLayout() {
  const requestInfo = useRequestInfo()
  return (
    <main className="flex min-h-svh">
      <div className="flex flex-1 flex-col relative justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <header className="flex absolute top-0 inset-x-0 items-center justify-end gap-1.5 p-4">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-lg">
                  <Languages />
                </Button>
              }
            />
            <DropdownMenuContent>
              <DropdownMenuGroup>
                <LanguageDropdown
                  userPreference={requestInfo.userPrefs.locale}
                />
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-lg">
                  <Paintbrush />
                </Button>
              }
            />
            <DropdownMenuContent>
              <DropdownMenuGroup>
                <ThemeDropdown userPreference={requestInfo.userPrefs.theme} />
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* <ThemeSwitch userPreference={requestInfo.userPrefs.theme} /> */}
        </header>
        <Outlet />
      </div>
      <div className="relative hidden w-0 flex-1 lg:block">
        <Img
          isAboveFold
          alt=""
          src="/img/ca-bg-1.png"
          width={1322}
          height={768}
          className="absolute inset-0 size-full object-cover"
        />
      </div>
    </main>
  )
}
