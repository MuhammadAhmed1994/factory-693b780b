import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import BoardClient from './board-client'
import { ApiError } from '../../lib/api-client'
import { addKudosReaction, getKudosPage, hideKudos } from '../../lib/kudos-api'
import type { BoardKudos, KudosBoardPage } from '../../lib/kudos-api'

jest.mock('../../lib/kudos-api', () => ({
  addKudosReaction: jest.fn(),
  getKudosPage: jest.fn(),
  hideKudos: jest.fn(),
}))

const mockedGetPage = jest.mocked(getKudosPage)
const mockedReact = jest.mocked(addKudosReaction)
const mockedHide = jest.mocked(hideKudos)

function item(id: string, recipient: string, createdAt: string, reactions: BoardKudos['reactions'] = []): BoardKudos {
  return {
    id,
    recipient: { id: `recipient-${id}`, email: `${recipient.toLowerCase().replaceAll(' ', '.')}@example.com` },
    author: { id: `author-${id}`, email: 'jordan.lee@example.com' },
    message: `A note for ${recipient}`,
    createdAt,
    reactions,
  }
}

function result(items: BoardKudos[], page = 1, totalItems = items.length): KudosBoardPage {
  return { items, page, pageSize: 20, totalItems }
}

beforeEach(() => {
  jest.clearAllMocks()
})

it('[AC-6] shows newest-first kudos and loads another page of the board', async () => {
  const newest = item('newest', 'Mina Patel', '2025-03-08T10:42:00.000Z')
  const older = item('older', 'Eli Chen', '2025-03-08T09:18:00.000Z')
  mockedGetPage.mockResolvedValueOnce(result([older, newest], 1, 21))
    .mockResolvedValueOnce(result([item('page-two', 'Samira Brooks', '2025-03-07T12:00:00.000Z')], 2, 21))

  render(<BoardClient />)

  const list = await screen.findByRole('list', { name: 'Newest kudos' })
  const recipientHeadings = within(list).getAllByRole('heading', { level: 3 })
  expect(recipientHeadings.map((heading) => heading.textContent)).toEqual(['Mina Patel', 'Eli Chen'])
  expect(screen.getByRole('navigation', { name: 'Kudos board pages' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Go to next page' })).toBeEnabled()

  fireEvent.click(screen.getByRole('button', { name: 'Go to next page' }))
  expect(await screen.findByRole('heading', { name: 'Samira Brooks' })).toBeInTheDocument()
  expect(mockedGetPage).toHaveBeenLastCalledWith(2)
})

it('[AC-8] submits one selected emoji and displays the confirmed reaction', async () => {
  const kudos = item('reactable', 'Mina Patel', '2025-03-08T10:42:00.000Z')
  mockedGetPage.mockResolvedValue(result([kudos]))
  mockedReact.mockResolvedValue({ id: 'reaction-1', userId: 'member-1', kudosId: kudos.id, emoji: '❤️' })

  render(<BoardClient />)

  await screen.findByRole('article', { name: 'Kudos for Mina Patel' })
  fireEvent.click(screen.getByText('＋ React'))
  fireEvent.click(screen.getByRole('button', { name: 'React with ❤️' }))

  await waitFor(() => expect(mockedReact).toHaveBeenCalledWith('reactable', '❤️'))
  expect(await screen.findByText('Your reaction: ❤️')).toBeInTheDocument()
  expect(screen.getByLabelText('❤️, 1 reaction')).toHaveTextContent('❤️ 1')
})

it('[AC-11] removes kudos only after confirmed hide and keeps it visible after rejection', async () => {
  const kudos = item('moderated', 'Mina Patel', '2025-03-08T10:42:00.000Z')
  mockedGetPage.mockResolvedValue(result([kudos]))
  mockedHide.mockResolvedValue(kudos)

  const { unmount } = render(<BoardClient />)
  const article = await screen.findByRole('article', { name: 'Kudos for Mina Patel' })
  fireEvent.click(within(article).getByRole('button', { name: 'Hide kudos' }))
  fireEvent.click(screen.getByRole('button', { name: 'Hide this kudos' }))
  await waitFor(() => expect(mockedHide).toHaveBeenCalledWith('moderated'))
  expect(await screen.findByText('Kudos hidden and removed from the board.')).toBeInTheDocument()
  expect(screen.queryByRole('article', { name: 'Kudos for Mina Patel' })).not.toBeInTheDocument()

  unmount()
  mockedGetPage.mockResolvedValue(result([kudos]))
  mockedHide.mockRejectedValue(new ApiError(403, 'Forbidden'))
  render(<BoardClient />)
  const visibleArticle = await screen.findByRole('article', { name: 'Kudos for Mina Patel' })
  fireEvent.click(within(visibleArticle).getByRole('button', { name: 'Hide kudos' }))
  fireEvent.click(screen.getByRole('button', { name: 'Hide this kudos' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('You are not authorized to hide kudos')
  expect(screen.getByRole('article', { name: 'Kudos for Mina Patel' })).toBeInTheDocument()
})
