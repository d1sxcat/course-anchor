import { Button } from '@course-anchor/ui/components/button'
import { cn } from '@course-anchor/ui/lib/utils'
import { Check, Loader, X } from 'lucide-react'
import { useSpinDelay } from 'spin-delay'

export const StatusButton = ({
  status,
  className,
  children,
  spinDelay = {},
  icon,
  ...props
}: React.ComponentProps<typeof Button> & {
  status: 'pending' | 'success' | 'error' | 'idle'
  spinDelay?: Parameters<typeof useSpinDelay>[1]
  icon?: React.ReactNode
}) => {
  const delayedPending = useSpinDelay(status === 'pending', {
   delay: 200,
		minDuration: 300,
    ...spinDelay,
  })
  const companion = {
    pending: delayedPending ? (
      <Loader className="animate-spin" data-icon="inline-end" />
    ) : null,
    success: <Check data-icon="inline-end" />,
    error: <X data-icon="inline-end" />,
    idle: icon ?? null,
  }[status]

  return (
    <Button className={cn('flex justify-center', className)} {...props}>
      {children}
      {companion}
    </Button>
  )
}
StatusButton.displayName = 'Button'
