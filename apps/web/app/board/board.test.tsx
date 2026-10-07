import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import BoardClient from './board-client'
import { getKudosPage, hideKudos, submitKudosReaction, type KudosItem, type KudosPage } from '../../lib/kudos-api'

jest.mock('../../lib/kudos-api', () => ({
  getKudosPage: jest.fn(),
  hideKudos: jest.fn(),
  submitKudosReaction: jest.fn(),
  KUDOS_PAGE_SIZE: 20,
}))

const mockedGetPage = jest.mocked(getKudosPage)
const mockedHide = jest.mocked(hideKudos)
const mockedReact = jest.mocked(submitKudosReaction)

function item(id: string, createdAt: string, recipient = `Recipient ${id}`): KudosItem {
  return {
    id,
    recipient: { email: recipient },
    author: { email: 'Jordan Lee' },
    message: `A note of appreciation for ${id}.`,
    createdAt,
    reactions: [],
  }
}

function result(items: KudosItem[], page = 1, total = items.length): KudosPage {
  return { items, page, pageSize: 20, total }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockedReact.mockResolvedValue({ emoji: '🙌' })
  mockedHide.mockResolvedValue(undefined)
})

test('[AC-6] board shows newest first in pages of 20 with accessible navigation', async () => {
  const pageOne = Array.from({ length: 20 }, (_, index) => item(
    `item-${index}`,
    new Date(Date.UTC(2026, 0, 20 - index)).toISOString(),
    index === 0 ? 'Newest teammate' : `Teammate ${index}`,
  ))
  mockedGetPage.mockResolvedValueOnce(result(pageOne, 1, 21)).mockResolvedValueOnce(result([item('older-page', '2025-12-01T00:00:00.000Z')], 2, 21))
  render(<BoardClient />)

  const newest = await screen.findByRole('article', { name: 'Kudos for Newest teammate' })
  expect(screen.getAllByRole('article')).toHaveLength(20)
  const cardNames = screen.getAllByRole('article').map((card) => card.getAttribute('aria-label'))
  expect(cardNames[0]).toBe('Kudos for Newest teammate')
  expect(cardNames[1]).toBe('Kudos for Teammate 1')
  expect(newest).toBeInTheDocument()
  expect(screen.getByText('Showing newest kudos first.')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Go to next page' }))
  expect(await screen.findByRole('article', { name: 'Kudos for Recipient older-page' })).toBeInTheDocument()
  expect(mockedGetPage).toHaveBeenLastCalledWith(2)
  expect(screen.getByRole('navigation', { name: 'Kudos board pages' })).toHaveTextContent(/Page\s*2\s*of\s*2/)
})

test('[AC-8] member selects and submits an emoji reaction and sees the result', async () => {
  mockedGetPage.mockResolvedValue(result([item('react-item', '2026-01-20T00:00:00.000Z')]))
  mockedReact.mockResolvedValue({ emoji: '🙌', id: 'reaction-1' })
  render(<BoardClient />)
  const card = await screen.findByRole('article', { name: 'Kudos for Recipient react-item' })

  fireEvent.click(within(card).getByRole('button', { name: /Add a reaction/ }))
  fireEvent.click(within(card).getByRole('button', { name: 'React with 🙌' }))

  await waitFor(() => expect(mockedReact).toHaveBeenCalledWith('react-item', '🙌'))
  expect(within(card).getByRole('button', { name: /Your reaction 🙌, 1 reaction/ })).toBeInTheDocument()
  expect(screen.getByText('Reaction 🙌 added.')).toBeInTheDocument()
})

test('[AC-11] lead hide removes only after confirmation and keeps failed items visible', async () => {
  mockedGetPage.mockResolvedValue(result([
    item('confirmed', '2026-01-20T00:00:00.000Z', 'Confirmed recipient'),
    item('denied', '2026-01-19T00:00:00.000Z', 'Denied recipient'),
  ]))
  render(<BoardClient />)
  const confirmed = await screen.findByRole('article', { name: 'Kudos for Confirmed recipient' })
  fireEvent.click(within(confirmed).getByRole('button', { name: 'Hide kudos' }))
  expect(screen.getByRole('dialog', { name: 'Hide this kudos?' })).toBeInTheDocument()
  expect(confirmed).toBeInTheDocument()
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Hide this kudos' }))
  await waitFor(() => expect(mockedHide).toHaveBeenCalledWith('confirmed'))
  await waitFor(() => expect(screen.queryByRole('article', { name: 'Kudos for Confirmed recipient' })).not.toBeInTheDocument())
  expect(screen.getByText('Kudos hidden and removed from the board.')).toBeInTheDocument()

  const denied = screen.getByRole('article', { name: 'Kudos for Denied recipient' })
  mockedHide.mockRejectedValueOnce(Object.assign(new Error('Forbidden'), { status: 403 }))
  fireEvent.click(within(denied).getByRole('button', { name: 'Hide kudos' }))
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Hide this kudos' }))
  expect(await screen.findByText('You are not authorized to hide this kudos. It remains on the board.')).toBeInTheDocument()
  expect(screen.getByRole('article', { name: 'Kudos for Denied recipient' })).toBeInTheDocument()
})
