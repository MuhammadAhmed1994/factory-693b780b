'use client'

import { useState } from 'react'
import styles from './reaction-picker.module.css'

const EMOJIS = ['🙌', '❤️', '🎉', '👏', '💡'] as const

type ReactionPickerProps = {
  reaction?: string | null
  count?: number
  onReact: (emoji: string) => void | Promise<void>
  error?: string | null
  disabled?: boolean
}

export default function ReactionPicker({
  reaction = null,
  count = 0,
  onReact,
  error: externalError = null,
  disabled = false,
}: ReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedReaction, setSubmittedReaction] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const selected = reaction ?? submittedReaction
  const visibleCount = count + (submittedReaction && !reaction ? 1 : 0)
  const error = externalError ?? submitError

  async function submit(emoji: string) {
    if (isSubmitting || selected || disabled) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await onReact(emoji)
      setSubmittedReaction(emoji)
      setIsOpen(false)
    } catch {
      setSubmitError('Your reaction could not be added. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.picker}>
      <button
        type="button"
        className={`${styles.trigger} ${selected ? styles.selected : ''}`}
        aria-label={selected ? `Your reaction ${selected}, ${visibleCount} ${visibleCount === 1 ? 'reaction' : 'reactions'}` : `Add a reaction, ${visibleCount} ${visibleCount === 1 ? 'reaction' : 'reactions'}`}
        aria-expanded={isOpen}
        aria-pressed={Boolean(selected)}
        disabled={disabled || isSubmitting}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span aria-hidden="true">{selected ?? '＋'}</span>
        <span>{visibleCount}</span>
        {!selected && <span className={styles.triggerLabel}>React</span>}
      </button>
      {isOpen && !selected && (
        <div className={styles.choices} role="group" aria-label="Choose one reaction">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className={styles.emojiButton}
              onClick={() => void submit(emoji)}
              disabled={isSubmitting || disabled}
              aria-label={`React with ${emoji}`}
              aria-busy={isSubmitting}
            >
              {emoji}
            </button>
          ))}
          {isSubmitting && <span className={styles.submitting} role="status">Adding reaction…</span>}
        </div>
      )}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {selected && <span className={styles.srOnly} role="status">Reaction selected: {selected}</span>}
    </div>
  )
}
