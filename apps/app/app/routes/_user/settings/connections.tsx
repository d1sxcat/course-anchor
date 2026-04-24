import { useState } from 'react'
import { data, useFetcher } from 'react-router'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@course-anchor/ui/components/tooltip'
import { invariantResponse } from '@epic-web/invariant'
import { type SidebarHandle } from '~/components/app-sidebar'
//import { Icon } from '#app/components/ui/icon.tsx'
import { StatusButton } from '~/components/ui/status-button'
import { type BreadcrumbHandle } from '~/hooks/use-breadcrumbs'
import { requireUserId } from '~/lib/auth.server'
import {
  ProviderConnectionForm,
  providerIcons,
  providerNames,
  ProviderNameSchema,
  type ProviderName,
} from '~/lib/connections'
import { resolveConnectionData } from '~/lib/connections.server'
import { prisma } from '~/lib/db.server'
import { pipeHeaders } from '~/lib/headers.server'
import { makeTimings } from '~/lib/timing.server'
import { createToastHeaders } from '~/lib/toast.server'
import { type Route } from './+types/connections'

export const handle: BreadcrumbHandle = {
  //breadcrumb: <Icon name="link-2">Connections</Icon>,
  breadcrumb: 'Connections',
}

async function userCanDeleteConnections(userId: string) {
  const user = await prisma.user.findUnique({
    select: {
      password: { select: { userId: true } },
      _count: { select: { connections: true } },
    },
    where: { id: userId },
  })
  // user can delete their connections if they have a password
  if (user?.password) return true
  // users have to have more than one remaining connection to delete one
  return Boolean(user?._count.connections && user?._count.connections > 1)
}

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await requireUserId(request)
  const timings = makeTimings('profile connections loader')
  const rawConnections = await prisma.connection.findMany({
    select: { id: true, providerName: true, providerId: true, createdAt: true },
    where: { userId },
  })
  const connections: Array<{
    providerName: ProviderName
    id: string
    displayName: string
    link?: string | null
    createdAtFormatted: string
  }> = []
  for (const connection of rawConnections) {
    const r = ProviderNameSchema.safeParse(connection.providerName)
    if (!r.success) continue
    const providerName = r.data
    const connectionData = await resolveConnectionData(
      providerName,
      connection.providerId,
      { timings }
    )
    connections.push({
      ...connectionData,
      providerName,
      id: connection.id,
      createdAtFormatted: connection.createdAt.toLocaleString(),
    })
  }

  return data(
    {
      connections,
      canDeleteConnections: await userCanDeleteConnections(userId),
    },
    { headers: { 'Server-Timing': timings.toString() } }
  )
}

export const headers: Route.HeadersFunction = pipeHeaders

export async function action({ request }: Route.ActionArgs) {
  const userId = await requireUserId(request)
  const formData = await request.formData()
  invariantResponse(
    formData.get('intent') === 'delete-connection',
    'Invalid intent'
  )
  invariantResponse(
    await userCanDeleteConnections(userId),
    'You cannot delete your last connection unless you have a password.'
  )
  const connectionId = formData.get('connectionId')
  invariantResponse(typeof connectionId === 'string', 'Invalid connectionId')
  await prisma.connection.delete({
    where: {
      id: connectionId,
      userId: userId,
    },
  })
  const toastHeaders = await createToastHeaders({
    title: 'Deleted',
    description: 'Your connection has been deleted.',
  })
  return data({ status: 'success' } as const, { headers: toastHeaders })
}

export default function Connections({ loaderData }: Route.ComponentProps) {
  return (
    <div className="mx-auto max-w-md">
      {loaderData.connections.length ? (
        <div className="flex flex-col gap-2">
          <p>Here are your current connections:</p>
          <ul className="flex flex-col gap-4">
            {loaderData.connections.map(c => (
              <li key={c.id}>
                <Connection
                  connection={c}
                  canDelete={loaderData.canDeleteConnections}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p>You don't have any connections yet.</p>
      )}
      <div className="border-border mt-5 flex flex-col gap-5 border-t-2 border-b-2 py-3">
        {providerNames.map(providerName => (
          <ProviderConnectionForm
            key={providerName}
            type="Connect"
            providerName={providerName}
          />
        ))}
      </div>
    </div>
  )
}

function Connection({
  connection,
  canDelete,
}: {
  connection: Route.ComponentProps['loaderData']['connections'][number]
  canDelete: boolean
}) {
  const deleteFetcher = useFetcher<typeof action>()
  const [infoOpen, setInfoOpen] = useState(false)
  const icon = providerIcons[connection.providerName]
  return (
    <div className="flex justify-between gap-2">
      <span className={`inline-flex items-center gap-1.5`}>
        {icon}
        <span>
          {connection.link ? (
            <a href={connection.link} className="underline">
              {connection.displayName}
            </a>
          ) : (
            connection.displayName
          )}{' '}
          ({connection.createdAtFormatted})
        </span>
      </span>
      {canDelete ? (
        <deleteFetcher.Form
          method="POST"
          id={`delete-connection-form-${connection.id}`}
        >
          <input name="connectionId" value={connection.id} type="hidden" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <StatusButton
                    name="intent"
                    value="delete-connection"
                    variant="destructive"
                    size="sm"
                    type="submit"
                    form={`delete-connection-form-${connection.id}`}
                    status={
                      deleteFetcher.state !== 'idle'
                        ? 'pending'
                        : (deleteFetcher.data?.status ?? 'idle')
                    }
                  >
                    {/* <Icon name="cross-1" /> */}X
                  </StatusButton>
                }
              ></TooltipTrigger>
              <TooltipContent>Disconnect this account</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </deleteFetcher.Form>
      ) : (
        <TooltipProvider>
          <Tooltip open={infoOpen} onOpenChange={setInfoOpen}>
            <TooltipTrigger onClick={() => setInfoOpen(true)}>?</TooltipTrigger>
            <TooltipContent>
              You cannot delete your last connection unless you have a password.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}
