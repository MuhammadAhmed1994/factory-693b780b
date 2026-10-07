import { apiRequest } from './api-client'

export interface KudosReaction {
  id?: string
  userId?: string
  emoji: string
  createdAt?: string
}

export interface KudosBoardItem {
  id: string
  message: string
  createdAt: string
  recipient: { id?: string; email: string; name?: string }
  author: { id?: string; email: string; name?: string }
  reactions: KudosReaction[]
}

export interface KudosBoardPage {
  items: KudosBoardItem[]
  page: number
  pageSize: number
  totalItems: number
}

export interface CreatedReaction extends KudosReaction {
  id: string
  kudosId?: string
  userId?: string
}

export interface HiddenKudos {
  id: string
  isHidden: boolean
  hiddenAt?: string
}

export function listKudos(page: number): Promise<KudosBoardPage> {
  return apiRequest<KudosBoardPage>(`/kudos?page=${encodeURIComponent(page)}`)
}

export function addKudosReaction(kudosId: string, emoji: string): Promise<CreatedReaction> {
  return apiRequest<CreatedReaction>(`/kudos/${encodeURIComponent(kudosId)}/reactions`, {
    method: 'POST',
    body: JSON.stringify({ emoji }),
  })
}

export function hideKudos(kudosId: string): Promise<HiddenKudos> {
  return apiRequest<HiddenKudos>(`/kudos/${encodeURIComponent(kudosId)}/hide`, {
    method: 'PATCH',
  })
}
