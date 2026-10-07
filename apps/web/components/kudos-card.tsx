'use client'

import ReactionPicker from './reaction-picker'
import styles from './kudos-card.module.css'

type KudosCardProps = {
  recipient: string
  message: string
  author: string
  createdAt: string | Date
  variant?: 'member' | 'lead'
  reaction?: string | null
  reactionCount?: number
  onReact?: (emoji: string) => void | Promise<void>
  onHide?: () => void | Promise<void>
  hidePending?: boolean
  hideError?: string | null
  reactionError?: string | null
}

export default function KudosCard({
  recipient,
  message,
  author,
  createdAt,
  variant = 'member',
  reaction = null,
  reactionCount = 0,
  onReact,
  onHide,
  hidePending = false,
  hideError = null,
  reactionError = null,
}: KudosCardProps) {
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt)
  const dateTime = Number.isNaN(date.getTime()) ? undefined : date.toISOString()
  const formattedDate = Number.isNaN(date.getTime())
    ? String(createdAt)
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)

  return (
    <article className={styles.card} aria-label={`Kudos for ${recipient}`}>
      <div className={styles.accent} aria-hidden="true">✦</div>
      <div className={styles.content}>
        <p className={styles.recipient}>For <strong>{recipient}</strong></p>
        <p className={styles.message}>{message}</p>
        <div className={styles.footer}>
          <p className={styles.metadata}>
            <span>From {author}</span>
            <span className={styles.separator} aria-hidden="true">·</span>
            <time dateTime={dateTime}>{formattedDate}</time>
          </p>
          <div className={styles.actions}>
            {onReact && (
              <ReactionPicker
                reaction={reaction}
                count={reactionCount}
                onReact={onReact}
                error={reactionError}
              />
            )}
            {variant === 'lead' && onHide && (
              <div className={styles.moderation}>
                <button
                  type="button"
                  className={styles.hideButton}
                  onClick={onHide}
                  disabled={hidePending}
                  aria-busy={hidePending}
                >
                  {hidePending ? 'Hiding…' : 'Hide kudos'}
                </button>
                {hideError && <p className={styles.hideError} role="alert">{hideError}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
