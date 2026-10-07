import Link from 'next/link'
import { redirect } from 'next/navigation'
import { clearSession } from '../lib/session'
import styles from './app-header.module.css'

export type AppHeaderVariant = 'auth' | 'authenticated'

export interface AppHeaderProps {
  variant?: AppHeaderVariant
  userName?: string
  userEmail?: string
}

async function signOut() {
  'use server'

  await clearSession()
  redirect('/sign-in')
}

/** Shared product header for signed-out and authenticated screens. */
export default function AppHeader({
  variant = 'auth',
  userName,
  userEmail,
}: AppHeaderProps) {
  const authenticated = variant === 'authenticated'

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link
          className={styles.brand}
          href={authenticated ? '/board' : '/sign-in'}
          aria-label="Kudos home"
        >
          <span className={styles.brandMark} aria-hidden="true">✳</span>
          <span className={styles.brandName}>Kudos</span>
        </Link>

        {authenticated ? (
          <div className={styles.account}>
            <div className={styles.userContext} aria-label="Signed-in user">
              <span className={styles.userName}>{userName || 'Signed in'}</span>
              {userEmail ? <span className={styles.userEmail}>{userEmail}</span> : null}
            </div>
            <form action={signOut}>
              <button className={styles.signOut} type="submit">Sign out</button>
            </form>
          </div>
        ) : null}
      </div>
    </header>
  )
}
