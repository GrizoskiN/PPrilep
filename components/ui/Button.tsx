'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'teal'
  size?: 'sm' | 'md'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none',
          size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
          variant === 'primary' && 'bg-zinc-900 text-white hover:bg-zinc-700',
          variant === 'teal'    && 'bg-teal-600 text-white hover:bg-teal-700',
          variant === 'outline' && 'border border-zinc-900 text-zinc-900 hover:bg-zinc-50',
          variant === 'ghost'   && 'text-zinc-600 hover:bg-zinc-100',
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
export default Button
