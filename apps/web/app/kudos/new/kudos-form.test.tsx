import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import KudosForm from './kudos-form'
import { apiRequest } from '../../../lib/api-client'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock('../../../lib/api-client', () => ({
  apiRequest: jest.fn(),
  ApiError: class ApiError extends Error { status: number; details?: unknown; constructor(status: number, message: string, details?: unknown) { super(message); this.status = status; this.details = details } },
}))

const request = apiRequest as jest.MockedFunction<typeof apiRequest>

it('[AC-4] lets a member choose a recipient, enter up to 280 characters, and submit kudos', async () => {
  request.mockImplementation(async (path: string, options?: RequestInit) => {
    if (path === '/members') return [{ id: 'member-1', name: 'Mina Patel' }] as never
    if (path === '/kudos' && options?.method === 'POST') return { id: 'created' } as never
    throw new Error('Unexpected request')
  })
  render(<KudosForm />)

  const recipient = await screen.findByRole('combobox', { name: 'Recipient' })
  await waitFor(() => expect(recipient).toBeEnabled())
  fireEvent.focus(recipient)
  fireEvent.click(screen.getByRole('option', { name: 'Mina Patel' }))
  const textarea = screen.getByRole('textbox', { name: 'Message' })
  fireEvent.change(textarea, { target: { value: 'A'.repeat(281) } })

  expect(textarea).toHaveValue('A'.repeat(280))
  expect(screen.getByText('280/280')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Post kudos' }))

  await waitFor(() => expect(request).toHaveBeenCalledWith('/kudos', {
    method: 'POST', body: JSON.stringify({ recipientId: 'member-1', message: 'A'.repeat(280) }),
  }))
  expect(await screen.findByRole('status')).toHaveTextContent('Kudos posted.')
})
