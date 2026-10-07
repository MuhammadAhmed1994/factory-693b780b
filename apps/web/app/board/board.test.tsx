import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import BoardClient from './board-client'
import { addKudosReaction, getKudosPage, hideKudos, type BoardKudos } from '../../lib/kudos-api'

jest.mock('../../lib/kudos-api', () => ({
  getKudosPage: jest.fn(),
  addKudosReaction: jest.fn(),
  hideKudos: jest.fn(),
}))

const getPageMock = jest.mocked(getKudosPage)
const addReactionMock = jest.mocked(addKudosReaction)
const hideMock = jest.mocked(hideKudos)

function makeKudos(id: string, email: string, createdAt: string, reactions: BoardKudos['reactions'] = []): BoardKudos {
  const name = email.replace(/@.*/, '')
  return {
    id,
    message: `A note for ${name}`,
    createdAt,
    author: { id: 'author-1', email: 'jordan.lee@example.com' },
    recipient: { id: `recipient-${id}`, email },
    reactions,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
})

test('[AC-6] displays newest kudos first and navigates through pages of 20', async () => {
  const start = Date.parse('2025-03-08T10:42:00.000Z')
  const newestFirst = Array.from({ length: 20 }, (_, index) =>
    makeKudos(`item-${index}`, `Member ${index}@example.com`, new Date(start - index * 60_000).toISOString()),
  )
  getPageMock.mockResolvedValueOnce({ items: [...newestFirst].reverse(), page: 1, pageSize: 20 })
    .mockResolvedValueOnce({ items: [makeKudos('page-two', 'Older Teammate@example.com', '2025-03-07T10:00:00.000Z')], page: 2, pageSize: 20 })

  render(<BoardClient />)

  await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(20))
  const cards = screen.getAllByRole('article')
  expect(within(cards[0]).getByText('Kudos to Member 0')).toBeInTheDocument()
  expect(within(cards[19]).getByText('Kudos to Member 19')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
  await waitFor(() => expect(screen.getByText('Kudos to Older Teammate')).toBeInTheDocument())
  expect(getPageMock).toHaveBeenNthCalledWith(2, 2)
  expect(screen.getByLabelText('Page 2, current page')).toBeInTheDocument()
})

test('[AC-8] submits one selected emoji and displays the confirmed reaction', async () => {
  const kudos = makeKudos('item-react', 'Mina Patel@example.com', '2025-03-08T10:42:00.000Z', [
    { id: 'existing', emoji: '🙌', userId: 'member-2', kudosId: 'item-react', createdAt: '2025-03-08T10:43:00.000Z' },
  ])
  getPageMock.mockResolvedValue({ items: [kudos], page: 1, pageSize: 20 })
  addReactionMock.mockResolvedValue({
    id: 'reaction-added', emoji: '🎉', userId: 'member-1', kudosId: 'item-react', createdAt: '2025-03-08T10:44:00.000Z',
  })

  render(<BoardClient />)
  await screen.findByRole('article', { name: 'Kudos for Mina Patel' })
  fireEvent.click(screen.getByRole('button', { name: 'Add a reaction to kudos for Mina Patel' }))
  fireEvent.click(screen.getByRole('button', { name: 'React with 🎉' }))

  await waitFor(() => expect(addReactionMock).toHaveBeenCalledWith('item-react', '🎉'))
  expect(await screen.findByLabelText('🎉, 1 reaction')).toBeInTheDocument()
  expect(screen.getByLabelText('🙌, 1 reaction')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Add a reaction to kudos for Mina Patel' })).not.toBeInTheDocument()
})

test('[AC-11] removes kudos only after hide confirmation and keeps it visible after failure', async () => {
  getPageMock.mockResolvedValue({
    items: [
      makeKudos('hide-one', 'Mina Patel@example.com', '2025-03-08T10:42:00.000Z'),
      makeKudos('hide-two', 'Eli Chen@example.com', '2025-03-08T10:41:00.000Z'),
    ],
    page: 1,
    pageSize: 20,
  })
  hideMock.mockResolvedValueOnce({ id: 'hide-one', isHidden: true })
    .mockRejectedValueOnce(new Error('You do not have permission to hide this item.'))

  render(<BoardClient />)
  await screen.findByRole('article', { name: 'Kudos for Mina Patel' })
  fireEvent.click(screen.getAllByRole('button', { name: 'Hide kudos' })[0])
  expect(screen.getByRole('dialog', { name: 'Hide this kudos?' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Hide this kudos' }))

  await waitFor(() => expect(screen.queryByRole('article', { name: 'Kudos for Mina Patel' })).not.toBeInTheDocument())
  expect(screen.getByRole('article', { name: 'Kudos for Eli Chen' })).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Hide kudos' }))
  fireEvent.click(screen.getByRole('button', { name: 'Hide this kudos' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(/Hide was not completed/)
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  expect(screen.getByRole('article', { name: 'Kudos for Eli Chen' })).toBeInTheDocument()
})
