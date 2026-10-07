'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './button.module.css'

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  loading?: boolean
  loadingText?: string
  children: ReactNode
}

/** Button primitive with consistent interaction and async states. */
export default function Button({
  variant = 'primary',
  loading = false,
  loadingText,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const variantClass = styles[variant]
  const classes = [styles.button, variantClass, className].filter(Boolean).join(' ')

  return (
    <button
      {...props}
      className={classes}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
      <span>{loading && loadingText ? loadingText : children}</span>
    </button>
  )
}
