import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { apiRequest } from '../../lib/api-client'
import SignInForm from './sign-in-form'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))
jest.mock('../../lib/api-client', () => ({
  apiRequest: jest.fn(),
}))

const mockedApiRequest = jest.mocked(apiRequest)
const mockedUseRouter = jest.mocked(useRouter)

describe('Sign-in form', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('[AC-2] signs in successfully and hands off to the board', async () => {
    const push = jest.fn()
    mockedUseRouter.mockReturnValue({
      push,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    })
    mockedApiRequest.mockResolvedValue({ session: {}, user: {} })

    render(<SignInForm />)
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'alex@team.example' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'correct-horse-battery' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Signed in. Opening your board…')).toBeInTheDocument()
    await waitFor(() => expect(push).toHaveBeenCalledWith('/board'))
    expect(mockedApiRequest).toHaveBeenCalledWith('/auth/session', {
      method: 'POST',
      body: JSON.stringify({ email: 'alex@team.example', password: 'correct-horse-battery' }),
    })
  })
})
