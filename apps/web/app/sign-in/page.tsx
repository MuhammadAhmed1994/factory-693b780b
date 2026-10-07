import { redirect } from 'next/navigation'
import AppHeader from '../../components/app-header'
import { readSession } from '../../lib/session'
import SignInForm from './sign-in-form'
import styles from './sign-in.module.css'

export default async function SignInPage() {
  const session = await readSession()
  if (session) redirect('/board')

  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="sign-in-title">
        <AppHeader variant="auth" />
        <div className={styles.content}>
          <h1 id="sign-in-title">Sign in to Kudos</h1>
          <p className={styles.intro}>Use your team email and password.</p>
          <SignInForm />
          <p className={styles.footnote}>Your team&apos;s appreciation, all in one place.</p>
        </div>
      </section>
    </main>
  )
}
