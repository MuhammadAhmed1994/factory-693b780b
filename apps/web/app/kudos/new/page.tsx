import AppHeader from '../../../components/app-header'
import ProtectedRoute from '../../../components/protected-route'
import KudosForm from './kudos-form'
import styles from './kudos-form.module.css'

export default function NewKudosPage() {
  return (
    <ProtectedRoute>
      <AppHeader variant="authenticated" />
      <main className={styles.main}>
        <div className={styles.column}>
          <header className={styles.heading}>
            <p className={styles.eyebrow}>A moment of appreciation</p>
            <h1 className={styles.title}>Give kudos</h1>
            <p className={styles.description}>Choose a teammate and share what you appreciate.</p>
          </header>
          <KudosForm />
        </div>
      </main>
    </ProtectedRoute>
  )
}
