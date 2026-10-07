import { apiRequest } from './api-client'

export type KudosReaction = {
  id: string
  emoji: string
  userId: string
  kudosId: string
  createdAt: string
}

export type BoardKudos = {
  id: string
  message: string
  createdAt: string
  author: { id: string; email: string }
  recipient: { id: string; email: string }
  reactions: KudosReaction[]
}

export type KudosPage = {
  items: BoardKudos[]
  page: number
  pageSize: number
}

export type CreatedReaction = KudosReaction

export async function getKudosPage(page: number): Promise<KudosPage> {
  return apiRequest<KudosPage>(`/kudos?page=${page}`)
}

export async function addKudosReaction(kudosId: string, emoji: string): Promise<CreatedReaction> {
  return apiRequest<CreatedReaction>(`/kudos/${encodeURIComponent(kudosId)}/reactions`, {
    method: 'POST',
    body: JSON.stringify({ emoji }),
  })
}

export async function hideKudos(kudosId: string): Promise<{ id: string; isHidden: boolean }> {
  return apiRequest<{ id: string; isHidden: boolean }>(`/kudos/${encodeURIComponent(kudosId)}/hide`, {
    method: 'PATCH',
  })
}
