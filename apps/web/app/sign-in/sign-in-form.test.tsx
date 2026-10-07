import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { apiRequest } from '../../lib/api-client'
import SignInForm from './sign-in-form'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}))
jest.mock('../../lib/api-client', () => ({
  apiRequest: jest.fn(),
}))

const mockReplace = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(apiRequest).mockResolvedValue(undefined)
})

test('[AC-2] successful sign-in confirms and hands off to the board', async () => {
  render(<SignInForm />)

  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'alex@team.example' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct horse battery staple' } })
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

  expect(await screen.findByText('Signed in. Opening your board…')).toBeInTheDocument()
  expect(apiRequest).toHaveBeenCalledWith('/auth/session', {
    method: 'POST',
    body: JSON.stringify({ email: 'alex@team.example', password: 'correct horse battery staple' }),
  })
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/board'))
})
