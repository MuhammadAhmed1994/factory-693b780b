import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import BoardClient from './board-client'

function kudos(id: string, recipient: string, createdAt: string) {
  return {
    id,
    message: `A thank-you for ${recipient}`,
    createdAt,
    recipient: { id: `recipient-${id}`, email: `${recipient.toLowerCase().replaceAll(' ', '.')}@example.com` },
    author: { id: 'author-1', email: 'jordan.lee@example.com' },
    reactions: [] as Array<{ id: string; userId: string; kudosId: string; emoji: string }>,
  }
}

function okResponse(body: unknown, status = 200) {
  return { ok: true, status, json: async () => body }
}

beforeEach(() => {
  jest.restoreAllMocks()
})

test('[AC-6] displays newest kudos first in pages with accessible navigation', async () => {
  const items = Array.from({ length: 20 }, (_, index) => {
    const serial = index + 1
    return kudos(`kudos-${serial}`, `Member ${serial}`, new Date(Date.UTC(2025, 0, serial)).toISOString())
  }).reverse()
  const fetchMock = jest.fn()
    .mockResolvedValueOnce(okResponse({ items, page: 1, pageSize: 20, totalItems: 21 }))
    .mockResolvedValueOnce(okResponse({ items: [kudos('kudos-21', 'Member 21', '2025-02-01T00:00:00Z')], page: 2, pageSize: 20, totalItems: 21 }))
  global.fetch = fetchMock as jest.Mock

  render(<BoardClient />)

  const cards = await screen.findAllByRole('article')
  expect(cards).toHaveLength(20)
  expect(within(cards[0]).getByText('Member 20')).toBeInTheDocument()
  expect(within(cards[19]).getByText('Member 1')).toBeInTheDocument()
  expect(screen.getByRole('navigation', { name: 'Kudos board pages' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Go to next page' }))
  expect(await screen.findByText('Member 21')).toBeInTheDocument()
  await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith(
    'http://localhost:3001/kudos?page=2',
    expect.objectContaining({ credentials: 'include' }),
  ))
})

test('[AC-8] submits an emoji reaction and displays it only after success', async () => {
  const item = kudos('item-8', 'Mina Patel', '2025-03-08T10:42:00Z')
  const fetchMock = jest.fn()
    .mockResolvedValueOnce(okResponse({ items: [item], page: 1, pageSize: 20, totalItems: 1 }))
    .mockResolvedValueOnce(okResponse({ id: 'reaction-1', userId: 'member-1', kudosId: item.id, emoji: '🎉' }, 201))
  global.fetch = fetchMock as jest.Mock

  render(<BoardClient />)
  fireEvent.click(await screen.findByRole('button', { name: /Add a reaction/ }))
  fireEvent.click(screen.getByRole('button', { name: 'React with 🎉' }))

  await waitFor(() => expect(screen.getByRole('button', { name: /Your reaction 🎉/ })).toBeInTheDocument())
  expect(screen.getByLabelText('Current reactions')).toHaveTextContent('🎉 1')
  expect(fetchMock).toHaveBeenLastCalledWith(
    'http://localhost:3001/kudos/item-8/reactions',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ emoji: '🎉' }),
      credentials: 'include',
    }),
  )
})

test('[AC-11] removes a kudos only after hide confirmation succeeds and retains it on failure', async () => {
  const confirmed = kudos('confirmed', 'Mina Patel', '2025-03-08T10:42:00Z')
  const rejected = kudos('rejected', 'Eli Chen', '2025-03-07T10:42:00Z')
  const fetchMock = jest.fn()
    .mockResolvedValueOnce(okResponse({ items: [confirmed, rejected], page: 1, pageSize: 20, totalItems: 2 }))
    .mockResolvedValueOnce(okResponse({ id: confirmed.id, isHidden: true }, 200))
    .mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ message: 'Forbidden' }) })
  global.fetch = fetchMock as jest.Mock

  render(<BoardClient />)
  await screen.findByText('Mina Patel')
  fireEvent.click(screen.getAllByRole('button', { name: 'Hide kudos' })[0])
  expect(screen.getByRole('dialog', { name: 'Hide this kudos?' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Hide this kudos' }))
  await waitFor(() => expect(screen.queryByRole('article', { name: 'Kudos for Mina Patel' })).not.toBeInTheDocument())
  expect(screen.getByRole('status')).toHaveTextContent('Kudos hidden and removed from the board.')

  fireEvent.click(screen.getByRole('button', { name: 'Hide kudos' }))
  fireEvent.click(screen.getByRole('button', { name: 'Hide this kudos' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Only team leads can hide kudos')
  expect(screen.getByRole('article', { name: 'Kudos for Eli Chen' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Hide this kudos' })).toBeEnabled()
})
