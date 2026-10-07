import { fireEvent, render, screen, within } from '@testing-library/react'
import BoardClient from './board-client'

function boardResponse(items: unknown[], page = 1, totalItems = items.length) {
  return { ok: true, status: 200, json: async () => ({ items, page, pageSize: 20, totalItems }) }
}

function boardItem(id: string, recipientName: string, createdAt: string) {
  return {
    id,
    message: `A thoughtful thank you for ${recipientName}.`,
    createdAt,
    recipient: { id: `recipient-${id}`, email: `${id}@example.test`, name: recipientName },
    author: { id: `author-${id}`, email: `author-${id}@example.test`, name: 'Jordan Lee' },
    reactions: [],
  }
}

describe('Kudos board', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('[AC-6] renders newest kudos first and requests the selected page of the 20-item board', async () => {
    const older = boardItem('older', 'Mina Patel', '2025-03-07T10:00:00.000Z')
    const newer = boardItem('newer', 'Eli Chen', '2025-03-08T10:00:00.000Z')
    global.fetch = jest.fn()
      .mockResolvedValueOnce(boardResponse([older, newer], 1, 21))
      .mockResolvedValueOnce(boardResponse([boardItem('page-two', 'Samira Brooks', '2025-03-06T10:00:00.000Z')], 2, 21)) as jest.Mock

    render(<BoardClient />)

    const board = await screen.findByRole('list', { name: 'Newest kudos' })
    const cards = within(board).getAllByRole('article')
    expect(cards[0]).toHaveAccessibleName('Kudos for Eli Chen')
    expect(cards[1]).toHaveAccessibleName('Kudos for Mina Patel')
    expect(screen.getByText('Showing newest kudos first.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go to next page' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Go to next page' }))
    expect(await screen.findByRole('article', { name: 'Kudos for Samira Brooks' })).toBeInTheDocument()
    expect(global.fetch).toHaveBeenLastCalledWith(
      'http://localhost:3001/kudos?page=2',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('[AC-8] submits one selected emoji and displays the reaction only after the API succeeds', async () => {
    const item = boardItem('reactable', 'Mina Patel', '2025-03-08T10:00:00.000Z')
    global.fetch = jest.fn()
      .mockResolvedValueOnce(boardResponse([item]))
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ id: 'reaction-1', userId: 'member-1', kudosId: item.id, emoji: '🎉' }) }) as jest.Mock

    render(<BoardClient />)

    fireEvent.click(await screen.findByRole('button', { name: 'Add a reaction' }))
    fireEvent.click(screen.getByRole('button', { name: 'React with 🎉' }))

    expect(await screen.findByLabelText('🎉, 1 reaction')).toBeInTheDocument()
    expect(global.fetch).toHaveBeenLastCalledWith(
      'http://localhost:3001/kudos/reactable/reactions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ emoji: '🎉' }),
        credentials: 'include',
      }),
    )
    expect(screen.getByRole('button', { name: 'Your reaction 🎉' })).toBeDisabled()
  })

  it('[AC-11] removes a kudos only after confirmed hide and keeps it visible with an actionable error on failure', async () => {
    const first = boardItem('confirmed', 'Mina Patel', '2025-03-08T10:00:00.000Z')
    const second = boardItem('rejected', 'Eli Chen', '2025-03-07T10:00:00.000Z')
    global.fetch = jest.fn()
      .mockResolvedValueOnce(boardResponse([first, second], 1, 2))
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: first.id, isHidden: true }) })
      .mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ message: 'Only team leads can hide kudos.' }) }) as jest.Mock

    render(<BoardClient />)

    fireEvent.click(await screen.findByRole('button', { name: 'Hide kudos for Mina Patel' }))
    expect(screen.getByRole('alertdialog', { name: 'Hide this kudos?' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Hide this kudos' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Kudos hidden and removed from the board.')
    expect(screen.queryByRole('article', { name: 'Kudos for Mina Patel' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Hide kudos for Eli Chen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Hide this kudos' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Only team leads can hide kudos.')
    expect(screen.getByRole('article', { name: 'Kudos for Eli Chen' })).toBeInTheDocument()
    expect(screen.getByText(/remains visible; you can retry or cancel/i)).toBeInTheDocument()
    expect(global.fetch).toHaveBeenLastCalledWith(
      'http://localhost:3001/kudos/rejected/hide',
      expect.objectContaining({ method: 'PATCH', credentials: 'include' }),
    )
  })
})
