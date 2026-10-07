import AppHeader from '../../../components/app-header'
import ProtectedRoute from '../../../components/protected-route'
import KudosForm from './kudos-form'

export default function NewKudosPage() {
  return (
    <ProtectedRoute>
      <AppHeader variant="authenticated" />
      <main>
        <KudosForm />
      </main>
    </ProtectedRoute>
  )
}
