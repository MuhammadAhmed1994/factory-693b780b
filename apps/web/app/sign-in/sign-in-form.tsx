'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Alert from '../../components/alert'
import Button from '../../components/button'
import { apiRequest } from '../../lib/api-client'
import styles from './sign-in.module.css'

type FormStatus = 'idle' | 'submitting' | 'success'

export default function SignInForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<FormStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [emptyError, setEmptyError] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const navigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (navigationTimer.current) clearTimeout(navigationTimer.current)
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status !== 'idle') return

    const emailValue = email.trim()
    if (!emailValue || !password) {
      setEmptyError(true)
      if (!emailValue) emailRef.current?.focus()
      else passwordRef.current?.focus()
      return
    }

    setEmptyError(false)
    setError(null)
    setStatus('submitting')

    try {
      await apiRequest('/auth/session', {
        method: 'POST',
        body: JSON.stringify({ email: emailValue, password }),
      })
      setStatus('success')
      navigationTimer.current = setTimeout(() => router.push('/board'), 450)
    } catch {
      setStatus('idle')
      setError("We couldn't sign you in. Check your email and password and try again.")
    }
  }

  const busy = status !== 'idle'

  return (
    <form className={styles.form} aria-label="Sign in" onSubmit={handleSubmit} noValidate>
      {emptyError ? (
        <div className={styles.validation} role="alert">
          Enter your email and password to continue.
        </div>
      ) : null}
      {error ? <Alert variant="error" dismissible={false}>{error}</Alert> : null}
      {status === 'submitting' ? (
        <Alert variant="info" dismissible={false}>Signing you in…</Alert>
      ) : null}
      {status === 'success' ? (
        <Alert variant="success" dismissible={false}>Signed in. Opening your board…</Alert>
      ) : null}

      <div className={styles.fields}>
        <div className={styles.field}>
          <label htmlFor="sign-in-email">Email</label>
          <input
            ref={emailRef}
            id="sign-in-email"
            name="email"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={busy}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="sign-in-password">Password</label>
          <input
            ref={passwordRef}
            id="sign-in-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={busy}
          />
        </div>
      </div>

      <Button
        className={styles.submit}
        type="submit"
        loading={status === 'submitting'}
        loadingText="Signing you in…"
        disabled={busy}
      >
        Sign in
      </Button>
    </form>
  )
}
