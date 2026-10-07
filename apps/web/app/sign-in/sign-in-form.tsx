'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Alert from '../../components/alert'
import Button from '../../components/button'
import { apiRequest } from '../../lib/api-client'
import styles from './sign-in.module.css'

const AUTHENTICATION_ERROR = "We couldn't sign you in. Check your email and password and try again."
const EMPTY_FORM_ERROR = 'Enter your email and password to continue.'
const REDIRECT_DELAY_MS = 350

export default function SignInForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (redirectTimer.current) clearTimeout(redirectTimer.current)
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting || success) return

    const normalizedEmail = email.trim()
    if (!normalizedEmail || !password) {
      setError(EMPTY_FORM_ERROR)
      if (!normalizedEmail) emailRef.current?.focus()
      else passwordRef.current?.focus()
      return
    }

    setError(null)
    setSubmitting(true)
    try {
      await apiRequest<unknown>('/auth/session', {
        method: 'POST',
        body: JSON.stringify({ email: normalizedEmail, password }),
      })
      setSuccess(true)
      redirectTimer.current = setTimeout(() => router.replace('/board'), REDIRECT_DELAY_MS)
    } catch {
      setError(AUTHENTICATION_ERROR)
      setSubmitting(false)
    }
  }

  return (
    <form className={styles.form} aria-label="Sign in" onSubmit={handleSubmit} noValidate>
      <div className={styles.fields}>
        <div className={styles.field}>
          <label htmlFor="sign-in-email">Email</label>
          <div className={styles.inputWrap}>
            <svg className={styles.inputIcon} viewBox="0 0 24 24" aria-hidden="true">
              <path d="m22 7-9 5.7a2 2 0 0 1-2 0L2 7" />
              <rect x="2" y="4" width="20" height="16" rx="2" />
            </svg>
            <input
              ref={emailRef}
              id="sign-in-email"
              name="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? 'sign-in-error' : undefined}
              required
            />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="sign-in-password">Password</label>
          <div className={styles.inputWrap}>
            <svg className={styles.inputIcon} viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="16" r="1" />
              <rect x="3" y="10" width="18" height="12" rx="2" />
              <path d="M7 10V7a5 5 0 0 1 10 0v3" />
            </svg>
            <input
              ref={passwordRef}
              id="sign-in-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? 'sign-in-error' : undefined}
              required
            />
          </div>
        </div>
      </div>

      {error ? (
        <Alert variant="error" dismissible={false} className={styles.alert}>
          <span id="sign-in-error">{error}</span>
        </Alert>
      ) : null}

      {submitting && !success ? (
        <Alert variant="info" dismissible={false} className={styles.alert}>
          Signing you in…
        </Alert>
      ) : null}

      {success ? (
        <Alert variant="success" dismissible={false} className={styles.alert}>
          Signed in. Opening your board…
        </Alert>
      ) : null}

      <Button
        className={styles.submitButton}
        type="submit"
        loading={submitting && !success}
        loadingText="Signing you in…"
        disabled={success}
      >
        Sign in
      </Button>
    </form>
  )
}
