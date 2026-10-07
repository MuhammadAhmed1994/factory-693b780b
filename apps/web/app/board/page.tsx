import AppHeader from '../../components/app-header'
import ProtectedRoute from '../../components/protected-route'
import BoardClient from './board-client'
import styles from './board.module.css'

export default function BoardPage() {
  return (
    <ProtectedRoute>
      <div className={styles.page}>
        <AppHeader variant="authenticated" />
        <BoardClient />
      </div>
    </ProtectedRoute>
  )
}
