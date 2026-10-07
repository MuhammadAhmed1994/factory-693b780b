import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import KudosForm from './kudos-form'

const mockPush = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

describe('kudos composer', () => {
  beforeEach(() => {
    mockPush.mockClear()
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [{ id: 'member-1', email: 'mina@example.com' }] })
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ id: 'kudos-1' }) }) as jest.Mock
  })

  it('[AC-4] selects a directory recipient by keyboard and submits a message within the character limit', async () => {
    render(<KudosForm />)

    const recipient = await screen.findByRole('combobox', { name: 'Recipient' })
    await waitFor(() => expect(recipient).toBeEnabled())
    fireEvent.focus(recipient)
    fireEvent.keyDown(recipient, { key: 'ArrowDown' })
    fireEvent.keyDown(recipient, { key: 'Enter' })
    expect(recipient).toHaveValue('mina@example.com')

    const message = screen.getByRole('textbox', { name: 'Message' })
    fireEvent.change(message, { target: { value: 'Thanks for making the handoff so thoughtful.' } })
    expect(screen.getByText(/\/ 280/)).toHaveTextContent('44 / 280')
    fireEvent.click(screen.getByRole('button', { name: 'Post kudos' }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2))
    expect(global.fetch).toHaveBeenLastCalledWith(
      'http://localhost:3001/kudos',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ recipientId: 'member-1', message: 'Thanks for making the handoff so thoughtful.' }),
        credentials: 'include',
      }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent('Kudos posted.')
    expect(mockPush).not.toHaveBeenCalled()
  })
})
