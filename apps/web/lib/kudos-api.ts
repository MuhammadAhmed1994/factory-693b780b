import { apiRequest } from './api-client'

export type KudosReaction = {
  emoji: string
  count?: number
}

export type KudosItem = {
  id: string
  recipient?: { id?: string; name?: string; email?: string }
  recipientName?: string
  message: string
  author?: { id?: string; name?: string; email?: string }
  authorName?: string
  authorId?: string
  createdAt: string
  reactions?: KudosReaction[]
}

export type KudosPage = {
  items: KudosItem[]
  page: number
  pageSize: number
}

export function listKudos(page: number): Promise<KudosPage> {
  return apiRequest<KudosPage>(`/kudos?page=${page}`)
}

export function addKudosReaction(kudosId: string, emoji: string): Promise<{ id?: string; emoji: string }> {
  return apiRequest(`/kudos/${encodeURIComponent(kudosId)}/reactions`, {
    method: 'POST',
    body: JSON.stringify({ emoji }),
  })
}

export function hideKudos(kudosId: string): Promise<unknown> {
  return apiRequest(`/kudos/${encodeURIComponent(kudosId)}/hide`, { method: 'PATCH' })
}
