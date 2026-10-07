import Link from 'next/link'
import AppHeader from '../../components/app-header'
import ProtectedRoute from '../../components/protected-route'
import BoardClient from './board-client'
import styles from './board.module.css'

export default function BoardPage() {
  return (
    <ProtectedRoute>
      <AppHeader variant="authenticated" />
      <main className={styles.main}>
        <header className={styles.intro}>
          <div>
            <p className={styles.eyebrow}><span aria-hidden="true" />Team recognition</p>
            <h1>Kudos board</h1>
            <p className={styles.subtitle}>A place to recognize the people who make our team better.</p>
          </div>
          <Link className={styles.compose} href="/kudos/new"><span aria-hidden="true">＋</span>Give kudos</Link>
        </header>
        <BoardClient />
      </main>
    </ProtectedRoute>
  )
}
