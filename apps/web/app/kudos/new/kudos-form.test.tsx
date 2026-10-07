import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { apiRequest } from '../../../lib/api-client'
import KudosForm from './kudos-form'

const mockPush = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

jest.mock('../../../lib/api-client', () => ({
  ApiError: class ApiError extends Error {
    status: number
    details?: unknown
    constructor(status: number, message: string, details?: unknown) {
      super(message)
      this.status = status
      this.details = details
    }
  },
  apiRequest: jest.fn(),
}))

const request = apiRequest as jest.MockedFunction<typeof apiRequest>

beforeEach(() => {
  mockPush.mockClear()
  request.mockReset()
})

afterEach(() => {
  jest.useRealTimers()
})

it('[AC-4] lets a member choose a teammate, submit a message up to 280 characters, and navigates after confirmation', async () => {
  request.mockImplementation(async (path: string, options?: RequestInit) => {
    if (path === '/members') return [{ id: 'member-1', name: 'Mina Patel' }] as never
    if (path === '/kudos') return { id: 'kudos-1', message: JSON.parse(String(options?.body)).message } as never
    throw new Error('Unexpected API path')
  })
  render(<KudosForm />)

  const recipient = await screen.findByRole('combobox', { name: 'Recipient' })
  fireEvent.click(recipient)
  fireEvent.change(recipient, { target: { value: 'Mina' } })
  fireEvent.keyDown(recipient, { key: 'ArrowDown' })
  fireEvent.keyDown(recipient, { key: 'Enter' })
  expect(recipient).toHaveValue('Mina Patel')

  const message = screen.getByRole('textbox', { name: 'Message' })
  const text = 'a'.repeat(280)
  fireEvent.change(message, { target: { value: `${text}x` } })
  expect(message).toHaveValue(text)
  expect(screen.getByText('280/280 characters')).toBeInTheDocument()
  expect(message).toHaveAttribute('aria-describedby', 'message-counter')

  fireEvent.click(screen.getByRole('button', { name: 'Post kudos' }))
  await waitFor(() => expect(request).toHaveBeenCalledWith('/kudos', {
    method: 'POST',
    body: JSON.stringify({ recipientId: 'member-1', message: text }),
  }))
  expect(await screen.findByRole('status')).toHaveTextContent('Kudos posted')
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/board'))
})
