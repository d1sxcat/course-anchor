import { Outlet } from 'react-router'
import { Img } from 'openimg/react'
import { useRequestInfo } from '~/lib/request-info'
import { ThemeSwitch } from '~/routes/resources/theme-switch'

export default function AuthLayout() {
  const requestInfo = useRequestInfo()
  return (
    <main className="flex min-h-svh">
      <div className="flex flex-1 flex-col relative justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <header className="flex absolute top-0 inset-x-0 items-center justify-end gap-4 p-4">
          <ThemeSwitch userPreference={requestInfo.userPrefs.theme} />
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
