import { apiRequest } from './api-client'

export type BoardReaction = {
  id: string
  userId: string
  kudosId: string
  emoji: string
  createdAt?: string
}

export type BoardKudos = {
  id: string
  recipient: { id: string; email: string }
  author: { id: string; email: string }
  message: string
  createdAt: string
  reactions: BoardReaction[]
}

export type KudosBoardPage = {
  items: BoardKudos[]
  page: number
  pageSize: number
  totalItems: number
}

export type CreatedReaction = BoardReaction & {
  user?: { id: string; email: string }
}

export async function getKudosPage(page: number): Promise<KudosBoardPage> {
  return apiRequest<KudosBoardPage>(`/kudos?page=${page}`)
}

export async function addKudosReaction(kudosId: string, emoji: string): Promise<CreatedReaction> {
  return apiRequest<CreatedReaction>(`/kudos/${encodeURIComponent(kudosId)}/reactions`, {
    method: 'POST',
    body: JSON.stringify({ emoji }),
  })
}

export async function hideKudos(kudosId: string): Promise<BoardKudos> {
  return apiRequest<BoardKudos>(`/kudos/${encodeURIComponent(kudosId)}/hide`, {
    method: 'PATCH',
  })
}
