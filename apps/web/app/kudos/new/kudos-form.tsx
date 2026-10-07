'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Button from '../../../components/button'
import { ApiError, apiRequest } from '../../../lib/api-client'
import RecipientSelect, { type TeamMember } from './recipient-select'
import styles from './kudos-form.module.css'

type FieldErrors = { recipientId?: string; message?: string }
type DirectoryResponse = TeamMember[]

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (Array.isArray(error.details) && error.details.every((item) => typeof item === 'string')) {
      return error.details.join(' ')
    }
    if (typeof error.details === 'object' && error.details !== null && 'message' in error.details) {
      const detailsMessage = error.details.message
      if (typeof detailsMessage === 'string') return detailsMessage
      if (Array.isArray(detailsMessage) && detailsMessage.every((item) => typeof item === 'string')) {
        return detailsMessage.join(' ')
      }
    }
    return error.message
  }
  return 'Your kudos couldn’t be posted. Your message is still here—try again.'
}

export default function KudosForm() {
  const router = useRouter()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [directoryStatus, setDirectoryStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [directoryError, setDirectoryError] = useState('')
  const [recipientId, setRecipientId] = useState('')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const recipientRef = useRef<HTMLInputElement>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    let active = true
    apiRequest<DirectoryResponse>('/members')
      .then((directory) => {
        if (!active) return
        setMembers(directory)
        setDirectoryStatus('ready')
      })
      .catch(() => {
        if (!active) return
        setDirectoryError('We couldn’t load teammates. Check your connection and try again.')
        setDirectoryStatus('error')
      })
    return () => { active = false }
  }, [])

  function retryDirectory() {
    setDirectoryStatus('loading')
    setDirectoryError('')
    apiRequest<DirectoryResponse>('/members')
      .then((directory) => {
        setMembers(directory)
        setDirectoryStatus('ready')
      })
      .catch(() => {
        setDirectoryError('We couldn’t load teammates. Check your connection and try again.')
        setDirectoryStatus('error')
      })
  }

  function validate(): FieldErrors {
    const nextErrors: FieldErrors = {}
    if (!recipientId) nextErrors.recipientId = 'Choose a teammate to receive your kudos.'
    if (!message.trim()) nextErrors.message = 'Enter a message before posting.'
    setErrors(nextErrors)
    if (nextErrors.recipientId) recipientRef.current?.focus()
    else if (nextErrors.message) messageRef.current?.focus()
    return nextErrors
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError('')
    const validationErrors = validate()
    if (validationErrors.recipientId || validationErrors.message) return

    setSubmitting(true)
    try {
      await apiRequest('/kudos', {
        method: 'POST',
        body: JSON.stringify({ recipientId, message }),
      })
      setSuccess(true)
      window.setTimeout(() => router.push('/board'), 600)
    } catch (error) {
      const messageFromApi = errorMessage(error)
      const lowerMessage = messageFromApi.toLowerCase()
      if (lowerMessage.includes('recipient')) {
        setErrors({ recipientId: messageFromApi })
        recipientRef.current?.focus()
      } else if (lowerMessage.includes('message')) {
        setErrors({ message: messageFromApi })
        messageRef.current?.focus()
      } else {
        setSubmitError('Your kudos couldn’t be posted. Your message is still here—try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const directoryEmpty = directoryStatus === 'ready' && members.length === 0
  const recipientDisabled = directoryStatus !== 'ready' || directoryEmpty || submitting

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {submitError ? <div className={styles.errorAlert} role="alert">{submitError}</div> : null}
      {success ? <div className={styles.successAlert} role="status">Kudos posted. Taking you to the board…</div> : null}

      <div className={styles.field}>
        <label className={styles.label} htmlFor="recipient">Recipient</label>
        {directoryStatus === 'loading' ? <p className={styles.help} role="status">Loading teammates…</p> : null}
        {directoryStatus === 'error' ? (
          <div className={styles.directoryError} role="alert">
            <span>{directoryError}</span>
            <button className={styles.retry} type="button" onClick={retryDirectory}>Try again</button>
          </div>
        ) : null}
        {directoryEmpty ? (
          <p className={styles.emptyState} role="status">
            No teammates are available to select. Please check back later or contact your team administrator.
          </p>
        ) : null}
        <RecipientSelect
          members={members}
          value={recipientId}
          onChange={(id) => {
            setRecipientId(id)
            setErrors((current) => ({ ...current, recipientId: undefined }))
          }}
          disabled={recipientDisabled}
          inputRef={recipientRef}
          describedBy={errors.recipientId ? 'recipient-error' : undefined}
          invalid={Boolean(errors.recipientId)}
        />
        {errors.recipientId ? <p className={styles.fieldError} id="recipient-error">{errors.recipientId}</p> : null}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="message">Message</label>
        <p className={styles.help}>280 characters maximum.</p>
        <textarea
          ref={messageRef}
          className={`${styles.textarea} ${errors.message ? styles.invalid : ''}`}
          id="message"
          name="message"
          value={message}
          maxLength={280}
          rows={5}
          placeholder="Share what you appreciate about their work…"
          aria-invalid={Boolean(errors.message)}
          aria-describedby={`message-help message-counter${errors.message ? ' message-error' : ''}`}
          onChange={(event) => {
            setMessage(event.currentTarget.value.slice(0, 280))
            setErrors((current) => ({ ...current, message: undefined }))
          }}
        />
        <div className={styles.fieldFooter}>
          <span id="message-help" className={styles.screenReaderOnly}>Write up to 280 characters.</span>
          {errors.message ? <span className={styles.fieldError} id="message-error">{errors.message}</span> : <span />}
          <span className={styles.counter} id="message-counter" aria-live="polite" aria-atomic="true">
            {message.length} / 280
          </span>
        </div>
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => router.push('/board')} disabled={submitting || success}>Cancel</Button>
        <Button type="submit" loading={submitting} loadingText="Posting…" disabled={directoryStatus !== 'ready' || directoryEmpty || success}>
          Post kudos
        </Button>
      </div>
    </form>
  )
}
