'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { ApiError, apiRequest } from '../../../lib/api-client'
import RecipientSelect, { type Recipient } from './recipient-select'
import styles from './kudos-form.module.css'

interface MembersResponse { members?: Recipient[] }

function parseRecipients(data: Recipient[] | MembersResponse): Recipient[] {
  const members = Array.isArray(data) ? data : data.members ?? []
  return members.filter((member) => member && typeof member.id === 'string' && typeof member.name === 'string')
}

export default function KudosForm() {
  const router = useRouter()
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [directoryLoading, setDirectoryLoading] = useState(true)
  const [directoryError, setDirectoryError] = useState('')
  const [recipientId, setRecipientId] = useState('')
  const [message, setMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ recipient?: string; message?: string }>({})
  const [submitError, setSubmitError] = useState('')
  const [pending, setPending] = useState(false)
  const [success, setSuccess] = useState(false)

  async function loadRecipients() {
    setDirectoryLoading(true)
    setDirectoryError('')
    try {
      const data = await apiRequest<Recipient[] | MembersResponse>('/members')
      setRecipients(parseRecipients(data))
    } catch {
      setDirectoryError('We couldn’t load teammates. Your message is still here—please try again.')
    } finally {
      setDirectoryLoading(false)
    }
  }

  useEffect(() => { void loadRecipients() }, [])

  function validate() {
    const errors: { recipient?: string; message?: string } = {}
    if (!recipientId) errors.recipient = 'Choose a teammate to recognize.'
    if (!message.trim()) errors.message = 'Enter a message before posting.'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError('')
    if (!validate()) return
    setPending(true)
    try {
      await apiRequest('/kudos', { method: 'POST', body: JSON.stringify({ recipientId, message }) })
      setSuccess(true)
      window.setTimeout(() => router.push('/board'), 450)
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        const details = error.details as { message?: unknown } | undefined
        const detail = Array.isArray(details?.message) ? details.message.join(' ') : error.message
        setSubmitError(typeof detail === 'string' ? detail : 'Your kudos couldn’t be posted. Your message is still here—try again.')
      } else {
        setSubmitError('Your kudos couldn’t be posted. Your message is still here—try again.')
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <main className={styles.main}>
      <div className={styles.formColumn}>
        <header className={styles.heading}>
          <p className={styles.eyebrow}>A moment of appreciation</p>
          <h1 className={styles.title}>Give kudos</h1>
          <p className={styles.description}>Choose a teammate and share what you appreciate.</p>
        </header>
        {success ? <p role="status" className={styles.empty}>Kudos posted. Taking you to the board…</p> : null}
        {directoryError ? (
          <div className={styles.directoryError} role="alert">
            <span>{directoryError}</span>
            <button className={styles.retry} type="button" onClick={() => void loadRecipients()}>Try again</button>
          </div>
        ) : null}
        {!directoryLoading && !directoryError && recipients.length === 0 ? (
          <p className={styles.empty} role="status">No teammates are available to select. Please try again later.</p>
        ) : null}
        <form className={styles.form} onSubmit={onSubmit} noValidate>
          <RecipientSelect
            recipients={recipients}
            value={recipientId}
            onChange={(id) => {
              setRecipientId(id)
              setFieldErrors((current) => ({ ...current, recipient: undefined }))
            }}
            loading={directoryLoading}
            disabled={directoryLoading || Boolean(directoryError) || recipients.length === 0 || pending || success}
            error={fieldErrors.recipient}
          />
          <div className={styles.field}>
            <label className={styles.label} htmlFor="kudos-message">Message</label>
            <textarea
              id="kudos-message"
              className={`${styles.textarea} ${fieldErrors.message ? styles.invalid : ''}`}
              value={message}
              maxLength={280}
              aria-invalid={Boolean(fieldErrors.message)}
              aria-describedby={`message-help message-counter${fieldErrors.message ? ' message-error' : ''}`}
              disabled={pending || success}
              onChange={(event) => {
                setMessage(event.target.value.slice(0, 280))
                setFieldErrors((current) => ({ ...current, message: undefined }))
              }}
            />
            <div className={styles.fieldFooter}>
              <span id="message-help">280 characters maximum.</span>
              <span className={styles.counter} id="message-counter" aria-live="off">{message.length}/280</span>
            </div>
            {fieldErrors.message ? <p className={styles.fieldError} id="message-error">{fieldErrors.message}</p> : null}
          </div>
          {submitError ? <p className={styles.fieldError} role="alert">{submitError}</p> : null}
          <div className={styles.actions}>
            <Link className={`${styles.button} ${styles.cancel}`} href="/board">Cancel</Link>
            <button className={`${styles.button} ${styles.submit}`} type="submit" disabled={pending || success || directoryLoading || Boolean(directoryError) || recipients.length === 0}>
              {pending ? 'Posting…' : 'Post kudos'}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
