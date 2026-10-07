'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import Button from '../../../components/button'
import { ApiError, apiRequest } from '../../../lib/api-client'
import RecipientSelect, { type RecipientOption } from './recipient-select'
import styles from './kudos-form.module.css'

interface KudosFormValues {
  recipientId: string
  message: string
}

interface DirectoryMember {
  id: string
  email: string
  name?: string
}

function apiMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const details = error.details
    if (typeof details === 'object' && details !== null && 'message' in details) {
      const message = details.message
      if (typeof message === 'string') return message
      if (Array.isArray(message)) {
        const messages = message.flatMap((item): string[] => {
          if (typeof item === 'string') return [item]
          if (typeof item !== 'object' || item === null) return []
          const constraints = 'constraints' in item ? item.constraints : undefined
          if (typeof constraints !== 'object' || constraints === null) return []
          return Object.values(constraints).filter((constraint): constraint is string => typeof constraint === 'string')
        })
        if (messages.length) return messages.join(' ')
      }
    }
    return error.message
  }
  return 'Your kudos couldn’t be posted. Your message is still here—try again.'
}

export default function KudosForm() {
  const router = useRouter()
  const [members, setMembers] = useState<RecipientOption[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [directoryError, setDirectoryError] = useState('')
  const [values, setValues] = useState<KudosFormValues>({ recipientId: '', message: '' })
  const [errors, setErrors] = useState<{ recipient?: string; message?: string }>({})
  const [submitError, setSubmitError] = useState('')
  const [pending, setPending] = useState(false)
  const [success, setSuccess] = useState(false)
  const messageRef = useRef<HTMLTextAreaElement>(null)
  const submitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadMembers = useCallback(async () => {
    setLoadingMembers(true)
    setDirectoryError('')
    try {
      const result = await apiRequest<DirectoryMember[]>('/members')
      setMembers(Array.isArray(result)
        ? result.map((member) => ({ ...member, name: member.name || member.email }))
        : [])
    } catch {
      setDirectoryError('Teammates couldn’t be loaded. Your message will stay here; try loading the directory again.')
    } finally {
      setLoadingMembers(false)
    }
  }, [])

  useEffect(() => {
    void loadMembers()
    return () => {
      if (submitTimer.current) clearTimeout(submitTimer.current)
    }
  }, [loadMembers])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || success) return
    const nextErrors: { recipient?: string; message?: string } = {}
    if (!values.recipientId) nextErrors.recipient = 'Choose a teammate to receive your kudos.'
    if (!values.message.trim()) nextErrors.message = 'Enter a message before posting.'
    setErrors(nextErrors)
    setSubmitError('')
    if (Object.keys(nextErrors).length) {
      if (nextErrors.recipient) document.getElementById('recipient')?.focus()
      else messageRef.current?.focus()
      return
    }

    setPending(true)
    try {
      await apiRequest('/kudos', {
        method: 'POST',
        body: JSON.stringify({ recipientId: values.recipientId, message: values.message }),
      })
      setSuccess(true)
      submitTimer.current = setTimeout(() => router.push('/board'), 350)
    } catch (error) {
      const serverMessage = apiMessage(error)
      setSubmitError(serverMessage || 'Your kudos couldn’t be posted. Your message is still here—try again.')
      if (/message/i.test(serverMessage)) {
        setErrors((current) => ({ ...current, message: serverMessage }))
      } else if (/recipient/i.test(serverMessage)) {
        setErrors((current) => ({ ...current, recipient: serverMessage }))
      }
    } finally {
      setPending(false)
    }
  }

  const noMembers = !loadingMembers && !directoryError && members.length === 0

  return (
    <section className={styles.container} aria-labelledby="kudos-title">
      <header className={styles.heading}>
        <p className={styles.eyebrow}>Team board</p>
        <h1 className={styles.title} id="kudos-title">Give kudos</h1>
        <p className={styles.description}>Choose a teammate and share what you appreciate.</p>
      </header>

      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        <p className={styles.helper}>A thoughtful note can make someone’s day.</p>
        {loadingMembers ? <p className={styles.directoryNotice} role="status">Loading teammates…</p> : null}
        {directoryError ? (
          <div className={styles.directoryError} role="alert">
            {directoryError}{' '}
            <button className={styles.retry} type="button" onClick={() => void loadMembers()}>Try again</button>
          </div>
        ) : null}
        {noMembers ? (
          <p className={styles.directoryNotice} role="status">
            No teammates are available to select. Please check back when your team directory is available.
          </p>
        ) : null}
        {submitError ? <p className={styles.submitError} role="alert">{submitError}</p> : null}
        {success ? <p className={styles.success} role="status">Kudos posted. Taking you to the board…</p> : null}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="recipient">Recipient</label>
          <RecipientSelect
            options={members}
            value={values.recipientId}
            onChange={(recipientId) => {
              setValues((current) => ({ ...current, recipientId }))
              setErrors((current) => ({ ...current, recipient: undefined }))
              setSubmitError('')
            }}
            disabled={pending || success || noMembers || Boolean(directoryError)}
            loading={loadingMembers}
            invalid={Boolean(errors.recipient)}
            describedBy={errors.recipient ? 'recipient-error' : undefined}
          />
          {errors.recipient ? <p className={styles.errorText} id="recipient-error">{errors.recipient}</p> : null}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="message">Message</label>
          <textarea
            ref={messageRef}
            className={`${styles.textarea} ${errors.message ? styles.invalid : ''}`}
            id="message"
            name="message"
            maxLength={280}
            rows={5}
            placeholder="What would you like to recognize?"
            value={values.message}
            aria-invalid={Boolean(errors.message) || undefined}
            aria-describedby={`message-counter${errors.message ? ' message-error' : ''}`}
            onChange={(event) => {
              setValues((current) => ({ ...current, message: event.target.value.slice(0, 280) }))
              setErrors((current) => ({ ...current, message: undefined }))
              setSubmitError('')
            }}
          />
          {errors.message ? <p className={styles.errorText} id="message-error">{errors.message}</p> : null}
          <div className={styles.counterRow}>
            <span className={styles.counter} id="message-counter" aria-live="off">{values.message.length}/280 characters</span>
          </div>
        </div>

        <div className={styles.actions}>
          <Link className={`${styles.actionButton} ${styles.secondary}`} href="/board">Cancel</Link>
          <Button
            className={`${styles.actionButton} ${styles.primary}`}
            type="submit"
            loading={pending}
            loadingText="Posting…"
            disabled={pending || success || loadingMembers || Boolean(directoryError) || noMembers}
          >
            Post kudos
          </Button>
        </div>
      </form>
    </section>
  )
}
