'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Alert from '../../components/alert'
import Button from '../../components/button'
import { apiRequest } from '../../lib/api-client'
import styles from './sign-in.module.css'

const GENERIC_ERROR = "We couldn't sign you in. Check your email and password and try again."
const EMPTY_ERROR = 'Enter your email and password to continue.'
const SUCCESS_MESSAGE = 'Signed in. Opening your board…'

type Feedback = { variant: 'error' | 'success' | 'info'; message: string } | null

export default function SignInForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    if (!email.trim() || !password) {
      setFeedback({ variant: 'error', message: EMPTY_ERROR })
      if (!email.trim()) {
        document.getElementById('email')?.focus()
      } else {
        document.getElementById('password')?.focus()
      }
      return
    }

    setFeedback({ variant: 'info', message: 'Signing you in…' })
    setSubmitting(true)
    try {
      await apiRequest('/auth/session', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      })
      setFeedback({ variant: 'success', message: SUCCESS_MESSAGE })
      router.push('/board')
    } catch {
      setFeedback({ variant: 'error', message: GENERIC_ERROR })
      setSubmitting(false)
    }
  }

  return (
    <form className={styles.form} aria-label="Sign in" onSubmit={handleSubmit}>
      <div className={styles.fields}>
        <div className={styles.field}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
      </div>

      {feedback ? (
        <Alert variant={feedback.variant} dismissible={false} className={styles.alert}>
          {feedback.message}
        </Alert>
      ) : null}

      <Button
        type="submit"
        className={styles.submit}
        loading={submitting}
        loadingText="Signing you in…"
        disabled={submitting}
      >
        Sign in
      </Button>
    </form>
  )
}
