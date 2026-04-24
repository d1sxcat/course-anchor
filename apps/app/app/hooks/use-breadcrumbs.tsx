import { Link, useMatches } from 'react-router'
import { z } from 'zod'

export const BreadcrumbHandle = z.object({ breadcrumb: z.any() })
export type BreadcrumbHandle = z.infer<typeof BreadcrumbHandle>

const BreadcrumbHandleMatch = z.object({
  handle: BreadcrumbHandle,
})

export const useBreadcrumbs = () => {
  const matches = useMatches()
  const breadcrumbs = matches
    .map(m => {
      const result = BreadcrumbHandleMatch.safeParse(m)
      if (!result.success || !result.data.handle.breadcrumb) return null
      return {
        link: (
          <Link key={m.id} to={m.pathname} className="flex items-center">
            {result.data.handle.breadcrumb}
          </Link>
        ),
        name: result.data.handle.breadcrumb,
      }
    })
    .filter(Boolean)
  return breadcrumbs
}
