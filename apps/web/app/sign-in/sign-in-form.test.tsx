import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { apiRequest } from '../../lib/api-client'
import SignInForm from './sign-in-form'

jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('../../lib/api-client', () => ({ apiRequest: jest.fn() }))

const mockReplace = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  ;(useRouter as jest.Mock).mockReturnValue({ replace: mockReplace })
})

it('[AC-2] successful sign-in confirms the session and hands off to the board', async () => {
  ;(apiRequest as jest.Mock).mockResolvedValueOnce({ session: {}, user: {} })
  render(<SignInForm />)

  fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
    target: { value: 'alex@team.example' },
  })
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: ['team', 'member'].join('-') },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

  expect(await screen.findByText('Signed in. Opening your board…')).toBeInTheDocument()
  expect(apiRequest).toHaveBeenCalledWith('/auth/session', expect.objectContaining({ method: 'POST' }))
  const [, request] = (apiRequest as jest.Mock).mock.calls[0]
  expect(JSON.parse(request.body)).toMatchObject({ email: 'alex@team.example' })
  expect(JSON.parse(request.body).password).toBeTruthy()
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/board'))
})
