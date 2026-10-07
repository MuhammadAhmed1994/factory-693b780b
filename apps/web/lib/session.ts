import { cookies } from 'next/headers'

const SESSION_COOKIE_NAME = 'session'

/** Returns the session cookie when one is present; this is a UX route check, not authorization. */
export async function readSession(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null
}

/** Clears the browser session cookie when called from a Server Action or Route Handler. */
export async function clearSession(): Promise<void> {
  'use server'

  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}
