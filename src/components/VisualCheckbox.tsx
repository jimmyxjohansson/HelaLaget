'use client'

import { Check } from 'lucide-react'
import { cn } from '../lib/shadcn/utils'

/**
 * A non-interactive checkbox visual. Renders a <span>, not a <button>, so it can
 * safely live inside a clickable row that is itself a <button> without producing
 * a nested-button DOM error. The surrounding row handles the click.
 */
export function VisualCheckbox({
  checked,
  className,
}: {
  checked: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'w-4 h-4 rounded-sm border border-primary flex items-center justify-center flex-shrink-0 transition-colors',
        checked && 'bg-primary text-primary-foreground',
        className,
      )}
    >
      {checked && <Check className="w-3 h-3" />}
    </span>
  )
}
