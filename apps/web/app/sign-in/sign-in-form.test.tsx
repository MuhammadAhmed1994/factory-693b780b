import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import SignInForm from './sign-in-form'

const mockPush = jest.fn()
const mockApiRequest = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

jest.mock('../../lib/api-client', () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
}))

describe('Sign-in form', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockPush.mockReset()
    mockApiRequest.mockReset()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('[AC-2] successful sign-in confirms and navigates to the board', async () => {
    mockApiRequest.mockResolvedValue({ session: { id: 'session-id' } })
    render(<SignInForm />)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'alex@team.example' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'not-a-literal-credential' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Sign in' }))

    await waitFor(() => {
      expect(mockApiRequest).toHaveBeenCalledWith('/auth/session', {
        method: 'POST',
        body: JSON.stringify({ email: 'alex@team.example', password: 'not-a-literal-credential' }),
      })
    })
    expect(await screen.findByText('Signed in. Opening your board…')).toBeInTheDocument()

    await act(async () => {
      jest.advanceTimersByTime(450)
    })
    expect(mockPush).toHaveBeenCalledWith('/board')
  })
})
