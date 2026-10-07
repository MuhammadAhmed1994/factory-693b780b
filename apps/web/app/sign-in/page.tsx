import { redirect } from 'next/navigation'
import AppHeader from '../../components/app-header'
import { readSession } from '../../lib/session'
import SignInForm from './sign-in-form'
import styles from './sign-in.module.css'

export default async function SignInPage() {
  const session = await readSession()
  if (session) redirect('/board')

  return (
    <div className={styles.screen}>
      <AppHeader variant="auth" />
      <main className={styles.main}>
        <section className={styles.card} aria-labelledby="sign-in-title">
          <h1 className={styles.title} id="sign-in-title">Sign in to Kudos</h1>
          <p className={styles.intro}>Use your team email and password.</p>
          <SignInForm />
          <p className={styles.footnote}>Your team’s appreciation, all in one place.</p>
        </section>
      </main>
    </div>
  )
}
