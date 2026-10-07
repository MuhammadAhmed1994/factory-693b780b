import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import SignInForm from './sign-in-form'
import { apiRequest } from '../../lib/api-client'
import { useRouter } from 'next/navigation'

jest.mock('../../lib/api-client', () => ({
  apiRequest: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>
const mockPush = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
})

test('[AC-2] successful sign-in announces confirmation and hands off to the board', async () => {
  mockApiRequest.mockResolvedValueOnce({} as never)
  render(<SignInForm />)

  fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
    target: { value: 'alex@team.example' },
  })
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 's'.repeat(12) },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

  expect(await screen.findByText('Signed in. Opening your board…')).toBeInTheDocument()
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/board'))
  expect(mockApiRequest).toHaveBeenCalledWith('/auth/session', {
    method: 'POST',
    body: JSON.stringify({ email: 'alex@team.example', password: 's'.repeat(12) }),
  })
})
