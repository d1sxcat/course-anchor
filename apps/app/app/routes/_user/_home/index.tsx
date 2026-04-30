import type { Route } from './+types/index'

export default function Home() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Home</h1>
    </div>
  )
}

export const meta: Route.MetaFunction = () => {
  return [{ title: 'Home | Course Anchor' }]
}