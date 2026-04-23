import { Link, type LinkProps } from 'react-router'
import { buttonVariants } from '@course-anchor/ui/components/button'
import { type VariantProps } from 'class-variance-authority'

type LinkButtonProps = LinkProps & VariantProps<typeof buttonVariants>

export function LinkButton({
  variant,
  size,
  className,
  ...props
}: LinkButtonProps) {
  return (
    <Link className={buttonVariants({ variant, size, className })} {...props} />
  )
}
