import { Button } from '@course-anchor/ui/components/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@course-anchor/ui/components/tooltip'
import { cn } from '@course-anchor/ui/lib/utils'
import { Check, Loader, XCircle } from 'lucide-react'
import { useSpinDelay } from 'spin-delay'

export const StatusButton = ({
  message,
  status,
  className,
  children,
  spinDelay,
  ...props
}: React.ComponentProps<typeof Button> & {
  status: 'pending' | 'success' | 'error' | 'idle'
  message?: string | null
  spinDelay?: Parameters<typeof useSpinDelay>[1]
}) => {
  const delayedPending = useSpinDelay(status === 'pending', {
    delay: 400,
    minDuration: 300,
    ...spinDelay,
  })
  const companion = {
    pending: delayedPending ? (
      <div
        role="status"
        className="inline-flex size-6 items-center justify-center"
      >
        <Loader className="animate-spin" />
      </div>
    ) : null,
    success: (
      <div
        role="status"
        className="inline-flex size-6 items-center justify-center"
      >
        <Check />
      </div>
    ),
    error: (
      <div
        role="status"
        className="bg-destructive inline-flex size-6 items-center justify-center rounded-full"
      >
        <XCircle className="text-destructive-foreground" />
      </div>
    ),
    idle: null,
  }[status]

  return (
    <Button className={cn('flex justify-center gap-4', className)} {...props}>
      <div>{children}</div>
      {message ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>{companion}</TooltipTrigger>
            <TooltipContent>{message}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        companion
      )}
    </Button>
  )
}
StatusButton.displayName = 'Button'
