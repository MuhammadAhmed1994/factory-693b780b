'use client'

import { useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Alert from '../../components/alert'
import Button from '../../components/button'
import { apiRequest } from '../../lib/api-client'
import styles from './sign-in.module.css'

type FormStatus = 'idle' | 'submitting' | 'success'

export default function SignInForm() {
  const router = useRouter()
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<FormStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [emptyError, setEmptyError] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'submitting' || status === 'success') return

    if (!email.trim() || !password) {
      setError(null)
      setEmptyError(true)
      if (!email.trim()) emailRef.current?.focus()
      else passwordRef.current?.focus()
      return
    }

    setEmptyError(false)
    setError(null)
    setStatus('submitting')

    try {
      await apiRequest('/auth/session', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      })
      setStatus('success')
      router.push('/board')
    } catch {
      setStatus('idle')
      setError("We couldn't sign you in. Check your email and password and try again.")
    }
  }

  return (
    <form className={styles.form} aria-label="Sign in" onSubmit={handleSubmit} noValidate>
      {emptyError ? (
        <Alert variant="error" dismissible={false}>
          Enter your email and password to continue.
        </Alert>
      ) : null}
      {error ? <Alert variant="error">{error}</Alert> : null}
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
            disabled={status !== 'idle'}
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
            disabled={status !== 'idle'}
          />
        </div>
      </div>

      <Button
        className={styles.submit}
        type="submit"
        loading={status === 'submitting'}
        loadingText="Signing you in…"
        disabled={status === 'success'}
      >
        Sign in
      </Button>
    </form>
  )
}
