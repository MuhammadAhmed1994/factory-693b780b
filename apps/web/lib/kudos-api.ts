import { apiRequest } from './api-client'

export const KUDOS_PAGE_SIZE = 20

export type KudosReaction = {
  id?: string
  emoji: string
  userId?: string
  createdAt?: string
}

export type KudosItem = {
  id: string
  recipient?: { id?: string; email?: string; name?: string }
  recipientName?: string
  recipientId?: string
  author?: { id?: string; email?: string; name?: string }
  authorName?: string
  authorId?: string
  message: string
  createdAt: string
  reactions?: KudosReaction[]
  isHidden?: boolean
}

export type KudosPage = {
  items: KudosItem[]
  page: number
  pageSize: number
  total: number
}

export type ReactionResult = KudosReaction & { kudosId?: string }

export async function getKudosPage(page: number): Promise<KudosPage> {
  const result = await apiRequest<KudosPage>(`/kudos?page=${page}`)
  return {
    ...result,
    items: [...result.items].sort((left, right) => {
      const difference = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      return difference || right.id.localeCompare(left.id)
    }).slice(0, KUDOS_PAGE_SIZE),
  }
}

export function submitKudosReaction(kudosId: string, emoji: string): Promise<ReactionResult> {
  return apiRequest<ReactionResult>(`/kudos/${encodeURIComponent(kudosId)}/reactions`, {
    method: 'POST',
    body: JSON.stringify({ emoji }),
  })
}

export function hideKudos(kudosId: string): Promise<unknown> {
  return apiRequest(`/kudos/${encodeURIComponent(kudosId)}/hide`, { method: 'PATCH' })
}
