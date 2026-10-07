import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { apiRequest } from '../../lib/api-client'
import SignInForm from './sign-in-form'

const mockPush = jest.fn()
const passwordValue = ['valid', 'entry'].join('-')

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

jest.mock('../../lib/api-client', () => ({
  apiRequest: jest.fn(),
}))

describe('sign-in form', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('[AC-2] submits credentials and hands a successful session off to the board', async () => {
    ;(apiRequest as jest.Mock).mockResolvedValue({ session: {}, user: {} })
    render(<SignInForm />)

    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
      target: { value: 'member@team.example' },
    })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: passwordValue } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith('/auth/session', {
      method: 'POST',
      body: JSON.stringify({ email: 'member@team.example', password: passwordValue }),
    }))
    expect(await screen.findByRole('status')).toHaveTextContent('Signed in. Opening your board…')
    expect(mockPush).toHaveBeenCalledWith('/board')
  })
})
