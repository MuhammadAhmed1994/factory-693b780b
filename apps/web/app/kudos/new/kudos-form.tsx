'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Alert from '../../../components/alert'
import Button from '../../../components/button'
import { ApiError, apiRequest } from '../../../lib/api-client'
import RecipientSelect, { type Member } from './recipient-select'
import styles from './kudos-form.module.css'

const MAX_LENGTH = 280

export default function KudosForm() {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [membersError, setMembersError] = useState('')
  const [recipient, setRecipient] = useState<Member | null>(null)
  const [message, setMessage] = useState('')
  const [recipientError, setRecipientError] = useState('')
  const [messageError, setMessageError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [pending, setPending] = useState(false)
  const [success, setSuccess] = useState(false)
  const recipientRef = useRef<HTMLInputElement>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)

  async function loadMembers() {
    setLoadingMembers(true)
    setMembersError('')
    try {
      const result = await apiRequest<Member[]>('/members')
      setMembers(Array.isArray(result) ? result : [])
    } catch {
      setMembersError('Teammates couldn’t be loaded. Check your connection and try again.')
    } finally {
      setLoadingMembers(false)
    }
  }

  useEffect(() => {
    void loadMembers()
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setRecipientError('')
    setMessageError('')
    setSubmitError('')
    const validRecipient = Boolean(recipient)
    const validMessage = Boolean(message.trim())
    if (!validRecipient) setRecipientError('Choose a teammate to receive your kudos.')
    if (!validMessage) setMessageError('Enter a message before posting.')
    if (!validRecipient || !validMessage) {
      if (!validRecipient) recipientRef.current?.focus()
      else messageRef.current?.focus()
      return
    }

    setPending(true)
    try {
      await apiRequest('/kudos', {
        method: 'POST',
        body: JSON.stringify({ recipientId: recipient!.id, message: message.trim() }),
      })
      setSuccess(true)
      window.setTimeout(() => router.push('/board'), 650)
    } catch (error) {
      const apiMessage = error instanceof ApiError ? error.message : ''
      setSubmitError(apiMessage || 'Your kudos couldn’t be posted. Your message is still here—try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <section className={styles.column} aria-labelledby="page-title">
      <header className={styles.heading}>
        <p className={styles.eyebrow}>A moment of appreciation</p>
        <h1 id="page-title">Give kudos</h1>
        <p className={styles.description}>Choose a teammate and share what you appreciate.</p>
      </header>

      {success ? <Alert variant="success" dismissible={false}>Kudos posted. Taking you back to the board…</Alert> : null}
      {submitError ? <Alert variant="error" onDismiss={() => setSubmitError('')}>{submitError}</Alert> : null}
      {membersError ? (
        <div className={styles.directoryError} role="alert">
          <span>{membersError}</span>
          <Button variant="secondary" onClick={() => void loadMembers()} disabled={loadingMembers}>
            Try again
          </Button>
        </div>
      ) : null}
      {!loadingMembers && !membersError && members.length === 0 ? (
        <div className={styles.emptyState} role="status">
          <strong>No teammates are available to select.</strong>
          <span>The team directory is currently empty. Try again later.</span>
          <Button variant="secondary" onClick={() => void loadMembers()}>Refresh directory</Button>
        </div>
      ) : null}

      <form className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="recipient">Recipient</label>
          <RecipientSelect
            inputRef={recipientRef}
            members={members}
            value={recipient}
            onChange={(next) => {
              setRecipient(next)
              setRecipientError('')
            }}
            disabled={loadingMembers || Boolean(membersError) || members.length === 0 || pending}
            loading={loadingMembers}
            invalid={Boolean(recipientError)}
            describedBy={recipientError ? 'recipient-error' : undefined}
          />
          {recipientError ? <p className={styles.fieldError} id="recipient-error">{recipientError}</p> : null}
          {loadingMembers ? <p className={styles.helper} role="status">Loading teammates…</p> : null}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="message">Your message</label>
          <textarea
            ref={messageRef}
            id="message"
            className={`${styles.textarea} ${messageError ? styles.invalid : ''}`}
            value={message}
            maxLength={MAX_LENGTH}
            onChange={(event) => {
              setMessage(event.target.value.slice(0, MAX_LENGTH))
              setMessageError('')
            }}
            placeholder="What would you like to thank them for?"
            rows={5}
            aria-invalid={Boolean(messageError)}
            aria-describedby={`message-counter${messageError ? ' message-error' : ''}`}
            disabled={pending}
          />
          <div className={styles.messageMeta}>
            {messageError ? <p className={styles.fieldError} id="message-error">{messageError}</p> : <span className={styles.helper}>280 characters maximum.</span>}
            <span className={styles.counter} id="message-counter" aria-live="off">{message.length} / 280</span>
          </div>
        </div>

        <div className={styles.actions}>
          <Button type="submit" loading={pending} loadingText="Posting…" disabled={pending || loadingMembers || members.length === 0 || Boolean(membersError)}>
            Post kudos
          </Button>
          <Button variant="tertiary" onClick={() => router.push('/board')} disabled={pending}>
            Cancel
          </Button>
        </div>
      </form>
    </section>
  )
}
