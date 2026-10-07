'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Alert from '../../components/alert'
import Button from '../../components/button'
import { apiRequest } from '../../lib/api-client'
import styles from './sign-in.module.css'

const SIGN_IN_ERROR = "We couldn't sign you in. Check your email and password and try again."
const EMPTY_ERROR = 'Enter your email and password to continue.'
const SUCCESS_MESSAGE = 'Signed in. Opening your board…'

export default function SignInForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!success) return
    const timeout = window.setTimeout(() => router.replace('/board'), 400)
    return () => window.clearTimeout(timeout)
  }, [router, success])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting || success) return
    if (!email.trim() || !password) {
      setMessage(EMPTY_ERROR)
      if (!email.trim()) emailRef.current?.focus()
      else passwordRef.current?.focus()
      return
    }

    setMessage(null)
    setSubmitting(true)
    try {
      await apiRequest('/auth/session', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      })
      setSubmitting(false)
      setSuccess(true)
    } catch {
      setSubmitting(false)
      setMessage(SIGN_IN_ERROR)
    }
  }

  return (
    <form className={styles.form} aria-label="Sign in" onSubmit={handleSubmit} noValidate>
      <div className={styles.fields}>
        <div className={styles.field}>
          <label htmlFor="sign-in-email">Email</label>
          <input
            ref={emailRef}
            id="sign-in-email"
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={submitting || success}
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
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={submitting || success}
          />
        </div>
      </div>

      {message ? (
        <Alert variant="error" dismissible={false} className={styles.alert}>
          {message}
        </Alert>
      ) : null}
      {submitting ? (
        <Alert variant="info" dismissible={false} className={styles.alert}>
          Signing you in…
        </Alert>
      ) : null}
      {success ? (
        <Alert variant="success" dismissible={false} className={styles.alert}>
          {SUCCESS_MESSAGE}
        </Alert>
      ) : null}

      <Button
        type="submit"
        className={styles.submit}
        loading={submitting}
        loadingText="Signing you in…"
        disabled={success}
      >
        Sign in
      </Button>
    </form>
  )
}
