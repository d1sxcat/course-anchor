import { Outlet } from "react-router";

export default function AuthLayout() {
  return (
    <div className="flex min-h-svh flex-col justify-between">
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  )
}