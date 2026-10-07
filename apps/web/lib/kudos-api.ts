import { apiRequest } from './api-client'

export interface BoardReaction {
  id: string
  userId: string
  kudosId: string
  emoji: string
}

export interface BoardKudos {
  id: string
  message: string
  createdAt: string
  recipient: { id: string; email: string }
  author: { id: string; email: string }
  reactions: BoardReaction[]
}

export interface KudosBoardPage {
  items: BoardKudos[]
  page: number
  pageSize: number
  totalItems: number
}

export interface CreatedReaction extends BoardReaction {}

export async function getKudosPage(page: number): Promise<KudosBoardPage> {
  return apiRequest<KudosBoardPage>(`/kudos?page=${page}`)
}

export async function addKudosReaction(kudosId: string, emoji: string): Promise<CreatedReaction> {
  return apiRequest<CreatedReaction>(`/kudos/${encodeURIComponent(kudosId)}/reactions`, {
    method: 'POST',
    body: JSON.stringify({ emoji }),
  })
}

export async function hideKudos(kudosId: string): Promise<void> {
  await apiRequest(`/kudos/${encodeURIComponent(kudosId)}/hide`, { method: 'PATCH' })
}
