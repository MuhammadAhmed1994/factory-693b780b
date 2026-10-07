'use client'

import { useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Alert from '../../components/alert'
import Button from '../../components/button'
import { apiRequest } from '../../lib/api-client'
import styles from './sign-in.module.css'

const AUTH_ERROR = "We couldn't sign you in. Check your email and password and try again."
const EMPTY_ERROR = 'Enter your email and password to continue.'
const SUCCESS_MESSAGE = 'Signed in. Opening your board…'

export default function SignInForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<'error' | 'success' | null>(null)
  const [errorText, setErrorText] = useState(AUTH_ERROR)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    if (!email.trim() || !password) {
      setErrorText(EMPTY_ERROR)
      setMessage('error')
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
      setMessage('success')
      router.push('/board')
    } catch {
      setErrorText(AUTH_ERROR)
      setMessage('error')
      setSubmitting(false)
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
            autoCapitalize="none"
            autoCorrect="off"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={submitting}
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
            disabled={submitting}
          />
        </div>
      </div>

      {message === 'error' ? <Alert variant="error" dismissible={false}>{errorText}</Alert> : null}
      {message === 'success' ? <Alert variant="success" dismissible={false}>{SUCCESS_MESSAGE}</Alert> : null}

      <Button
        className={styles.submit}
        type="submit"
        loading={submitting}
        loadingText="Signing you in…"
        disabled={submitting || message === 'success'}
      >
        Sign in
      </Button>
    </form>
  )
}
