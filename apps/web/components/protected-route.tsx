import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { readSession } from '../lib/session'

/** UX guard for authenticated screens; protected API operations still require API authorization. */
export default async function ProtectedRoute({ children }: { children: ReactNode }) {
  const session = await readSession()
  if (!session) redirect('/sign-in')

  return children
}
