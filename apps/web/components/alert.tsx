'use client'

import { useState, type ReactNode } from 'react'
import styles from './alert.module.css'

export type AlertVariant = 'error' | 'success' | 'info'

export interface AlertProps {
  variant: AlertVariant
  children: ReactNode
  title?: string
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
}

const symbols: Record<AlertVariant, string> = {
  error: '!',
  success: '✓',
  info: 'i',
}

/** Inline feedback; errors are announced assertively and nonurgent updates politely. */
export default function Alert({
  variant,
  children,
  title,
  dismissible = true,
  onDismiss,
  className,
}: AlertProps) {
  const [visible, setVisible] = useState(true)
  if (!visible) return null

  const classes = [styles.alert, styles[variant], className].filter(Boolean).join(' ')

  function dismiss() {
    setVisible(false)
    onDismiss?.()
  }

  return (
    <div
      className={classes}
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <span className={styles.icon} aria-hidden="true">{symbols[variant]}</span>
      <div className={styles.content}>
        {title ? <strong className={styles.title}>{title}</strong> : null}
        <div>{children}</div>
      </div>
      {dismissible ? (
        <button
          type="button"
          className={styles.dismiss}
          onClick={dismiss}
          aria-label="Dismiss message"
        >
          <span aria-hidden="true">×</span>
        </button>
      ) : null}
    </div>
  )
}
