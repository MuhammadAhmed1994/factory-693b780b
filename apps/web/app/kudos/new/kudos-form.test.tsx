import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import KudosForm from './kudos-form'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))

const mockApiRequest = jest.fn()
jest.mock('../../../lib/api-client', () => ({
  apiRequest: (...args: unknown[]) => mockApiRequest(...args),
  ApiError: class ApiError extends Error {},
}))

describe('Kudos composition', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockApiRequest.mockImplementation(async (path: string) => {
      if (path === '/members') return [{ id: 'member-1', email: 'mina@example.com' }]
      return { id: 'kudos-1' }
    })
  })

  it('[AC-4] chooses a teammate, enters a message up to 280 characters, and submits kudos', async () => {
    render(<KudosForm />)

    const recipient = await screen.findByRole('combobox', { name: 'Recipient' })
    await waitFor(() => expect(recipient).toBeEnabled())
    fireEvent.focus(recipient)
    await screen.findByRole('option', { name: 'mina@example.com' })
    fireEvent.keyDown(recipient, { key: 'ArrowDown' })
    fireEvent.keyDown(recipient, { key: 'Enter' })
    expect(recipient).toHaveValue('mina@example.com')

    const message = screen.getByRole('textbox', { name: 'Your message' })
    fireEvent.change(message, { target: { value: 'a'.repeat(280) } })
    expect(message).toHaveValue('a'.repeat(280))
    expect(screen.getByText('280 / 280')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Post kudos' }))
    await waitFor(() => expect(mockApiRequest).toHaveBeenCalledWith('/kudos', {
      method: 'POST',
      body: JSON.stringify({ recipientId: 'member-1', message: 'a'.repeat(280) }),
    }))
    expect(await screen.findByText(/Kudos posted/)).toBeInTheDocument()
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/board'))
  })
})
