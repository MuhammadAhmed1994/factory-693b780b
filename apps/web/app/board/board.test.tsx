import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import BoardClient from './board-client'
import { apiRequest } from '../../lib/api-client'

jest.mock('../../lib/api-client', () => ({ apiRequest: jest.fn() }))

const request = apiRequest as jest.MockedFunction<typeof apiRequest>
const datedItem = (id: string, message: string, createdAt: string) => ({
  id,
  recipient: { id: `recipient-${id}`, email: `${id}@example.test`, name: `Recipient ${id}` },
  author: { id: `author-${id}`, email: `author-${id}@example.test`, name: `Author ${id}` },
  message,
  createdAt,
  reactions: [],
})

beforeEach(() => {
  request.mockReset()
  window.scrollTo = jest.fn()
})

it('[AC-6] shows newest kudos first and navigates through pages', async () => {
  const items = Array.from({ length: 20 }, (_, index) => datedItem(
    String(index), `Message ${index}`, new Date(Date.UTC(2025, 0, 1, 0, index)).toISOString(),
  ))
  request.mockImplementation(async (path: string) => {
    if (path.startsWith('/kudos?page=')) {
      return { items: path.endsWith('=1') ? items : [datedItem('next', 'Page two note', '2024-01-01T00:00:00.000Z')], page: path.endsWith('=1') ? 1 : 2, pageSize: 20 } as never
    }
    throw new Error(`Unexpected API request: ${path}`)
  })
  render(<BoardClient />)

  const newest = await screen.findByText('Message 19')
  const oldest = screen.getByText('Message 0')
  const messages = screen.getAllByText(/^Message \d+$/)
  expect(newest.compareDocumentPosition(oldest) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(messages).toHaveLength(20)
  expect(screen.getByText('Showing newest kudos first.')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Go to next page' }))
  expect(await screen.findByText('Page two note')).toBeInTheDocument()
  expect(request).toHaveBeenCalledWith('/kudos?page=2')
  expect(screen.getByRole('navigation', { name: 'Kudos board pages' })).toHaveTextContent('Page 2 of 2')
})

it('[AC-8] submits a chosen emoji and displays the confirmed reaction', async () => {
  request.mockImplementation(async (path: string, options?: RequestInit) => {
    if (path === '/kudos?page=1') return { items: [datedItem('k-1', 'A thoughtful note', '2025-03-08T10:42:00.000Z')], page: 1, pageSize: 20 } as never
    if (path === '/kudos/k-1/reactions' && options?.method === 'POST') return { id: 'r-1', emoji: '🙌' } as never
    throw new Error(`Unexpected API request: ${path}`)
  })
  render(<BoardClient />)

  await screen.findByText('A thoughtful note')
  fireEvent.click(screen.getByRole('button', { name: /Add a reaction/ }))
  fireEvent.click(screen.getByRole('button', { name: 'React with 🙌' }))

  await waitFor(() => expect(request).toHaveBeenCalledWith('/kudos/k-1/reactions', {
    method: 'POST', body: JSON.stringify({ emoji: '🙌' }),
  }))
  expect(await screen.findByRole('button', { name: 'Your reaction 🙌, 1 reaction' })).toBeInTheDocument()
  expect(screen.getByText('Reaction selected: 🙌')).toBeInTheDocument()
})

it('[AC-11] removes kudos only after confirmed hide and keeps it visible on failure', async () => {
  request.mockImplementation(async (path: string, options?: RequestInit) => {
    if (path === '/kudos?page=1') return { items: [
      datedItem('hide-ok', 'Confirmed item', '2025-03-08T10:42:00.000Z'),
      datedItem('hide-fail', 'Item that stays visible', '2025-03-08T09:42:00.000Z'),
    ], page: 1, pageSize: 20 } as never
    if (path === '/kudos/hide-ok/hide' && options?.method === 'PATCH') return { id: 'hide-ok', isHidden: true } as never
    if (path === '/kudos/hide-fail/hide' && options?.method === 'PATCH') throw new Error('Forbidden')
    throw new Error(`Unexpected API request: ${path}`)
  })
  render(<BoardClient />)

  await screen.findByText('Confirmed item')
  const successfulCard = screen.getByRole('article', { name: 'Kudos for Recipient hide-ok' })
  fireEvent.click(within(successfulCard).getByRole('button', { name: 'Hide kudos' }))
  const dialog = screen.getByRole('dialog', { name: 'Hide this kudos?' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Hide this kudos' }))

  await waitFor(() => expect(screen.queryByText('Confirmed item')).not.toBeInTheDocument())
  expect(screen.getByRole('status')).toHaveTextContent('Kudos hidden and removed from the board.')

  const failureCard = screen.getByRole('article', { name: 'Kudos for Recipient hide-fail' })
  fireEvent.click(within(failureCard).getByRole('button', { name: 'Hide kudos' }))
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Hide this kudos' }))

  expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('This kudos was not hidden.')
  expect(screen.getByText('Item that stays visible')).toBeInTheDocument()
  expect(request).toHaveBeenCalledWith('/kudos/hide-fail/hide', { method: 'PATCH' })
})
