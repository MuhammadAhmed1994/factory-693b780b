'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import KudosCard from '../../components/kudos-card'
import Pagination from '../../components/pagination'
import { addKudosReaction, hideKudos, listKudos, type KudosItem } from '../../lib/kudos-api'
import styles from './board-client.module.css'

type HideRequest = { item: KudosItem; trigger: HTMLElement }

function recipientName(item: KudosItem) {
  return item.recipient?.name ?? item.recipientName ?? item.recipient?.email ?? 'A teammate'
}

function authorName(item: KudosItem) {
  return item.author?.name ?? item.authorName ?? item.author?.email ?? item.authorId ?? 'A teammate'
}

function sortedNewestFirst(items: KudosItem[]) {
  return [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export default function BoardClient() {
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<KudosItem[]>([])
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [hideRequest, setHideRequest] = useState<HideRequest | null>(null)
  const [hidePending, setHidePending] = useState(false)
  const [hideError, setHideError] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const dialogCancelRef = useRef<HTMLButtonElement>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)

  const loadPage = useCallback(async (nextPage: number) => {
    setLoading(true)
    setLoadError(false)
    setNotice('')
    try {
      const result = await listKudos(nextPage)
      setItems(sortedNewestFirst(result.items ?? []))
      setPageSize(result.pageSize || 20)
      setPage(nextPage)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPage(1)
  }, [loadPage])

  useEffect(() => {
    if (hideRequest) dialogCancelRef.current?.focus()
  }, [hideRequest])

  useEffect(() => {
    if (!hideRequest) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !hidePending) closeDialog()
      if (event.key === 'Tab') {
        const controls = document.querySelectorAll<HTMLButtonElement>('[data-hide-dialog] button:not(:disabled)')
        if (controls.length < 2) return
        const first = controls[0]
        const last = controls[controls.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [hideRequest, hidePending])

  function openDialog(item: KudosItem, trigger: HTMLElement) {
    restoreFocusRef.current = trigger
    setHideError(null)
    setHideRequest({ item, trigger })
  }

  function closeDialog() {
    if (hidePending) return
    setHideRequest(null)
    window.setTimeout(() => restoreFocusRef.current?.focus(), 0)
  }

  async function confirmHide() {
    if (!hideRequest || hidePending) return
    setHidePending(true)
    setHideError(null)
    try {
      await hideKudos(hideRequest.item.id)
      const hiddenId = hideRequest.item.id
      setItems((current) => current.filter((item) => item.id !== hiddenId))
      setNotice('Kudos hidden and removed from the board.')
      setHideRequest(null)
      window.setTimeout(() => document.getElementById('feed-heading')?.focus(), 0)
    } catch {
      const message = 'This kudos was not hidden. Your lead permissions may be required. Please try again or contact a team lead.'
      setHideError(message)
    } finally {
      setHidePending(false)
    }
  }

  async function submitReaction(itemId: string, emoji: string) {
    const result = await addKudosReaction(itemId, emoji)
    const recordedEmoji = result?.emoji ?? emoji
    setItems((current) => current.map((item) => item.id === itemId
      ? { ...item, reactions: [...(item.reactions ?? []), { emoji: recordedEmoji, count: 1 }] }
      : item))
  }

  const canGoNext = items.length >= pageSize

  return (
    <section className={styles.feed} aria-labelledby="feed-heading">
      <div className={styles.feedHeading}>
        <h2 id="feed-heading" tabIndex={-1}>Recent kudos</h2>
        {!loading && !loadError && items.length > 0 && <span className={styles.sortNote}>Showing newest kudos first.</span>}
      </div>

      {notice && <p className={styles.notice} role="status" aria-live="polite">{notice}</p>}
      {loadError ? (
        <div className={styles.state} role="alert">
          <p>We couldn&apos;t load the board. Try again.</p>
          <button type="button" className={styles.secondaryButton} onClick={() => void loadPage(page)}>Retry</button>
        </div>
      ) : loading ? (
        <div className={styles.skeletonList} role="status" aria-label="Loading kudos" aria-busy="true">
          <span className={styles.srOnly}>Loading kudos…</span>
          {[0, 1, 2].map((skeleton) => <div key={skeleton} className={styles.skeleton} aria-hidden="true"><i /><b /><span /></div>)}
        </div>
      ) : items.length === 0 ? (
        <div className={styles.state}>
          <h3>No kudos here yet.</h3>
          <p>Be the first to recognize a teammate.</p>
          <a className={styles.secondaryButton} href="/kudos/new">Give kudos</a>
        </div>
      ) : (
        <>
          <ul className={styles.list} aria-label="Newest kudos">
            {items.map((item) => (
              <li key={item.id}>
                <KudosCard
                  recipient={recipientName(item)}
                  message={item.message}
                  author={authorName(item)}
                  createdAt={item.createdAt}
                  reaction={item.reactions?.[0]?.emoji ?? null}
                  reactionCount={item.reactions?.[0]?.count ?? 0}
                  onReact={(emoji) => submitReaction(item.id, emoji)}
                  variant="lead"
                  onHide={(event?: unknown) => {
                    const target = event && typeof event === 'object' && 'currentTarget' in event
                      ? (event as { currentTarget: HTMLElement }).currentTarget
                      : document.activeElement as HTMLElement
                    openDialog(item, target)
                  }}
                  hidePending={hidePending && hideRequest?.item.id === item.id}
                  hideError={null}
                />
              </li>
            ))}
          </ul>
          <Pagination page={page} totalPages={canGoNext ? page + 1 : page} loading={loading} onPageChange={(next) => {
            const reduceMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
            window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
            void loadPage(next)
          }} />
        </>
      )}

      {hideRequest && (
        <div className={styles.backdrop}>
          <section
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="hide-title"
            aria-describedby="hide-description"
            data-hide-dialog
          >
            <h2 id="hide-title">Hide this kudos?</h2>
            <p id="hide-description">This will remove the kudos for {recipientName(hideRequest.item)} from the board. This action can&apos;t be undone here.</p>
            {hideError && <p className={styles.dialogError} role="alert">{hideError}</p>}
            <div className={styles.dialogActions}>
              <button ref={dialogCancelRef} type="button" className={styles.secondaryButton} onClick={closeDialog} disabled={hidePending}>Cancel</button>
              <button type="button" className={styles.dangerButton} onClick={() => void confirmHide()} disabled={hidePending} aria-busy={hidePending}>
                {hidePending ? 'Hiding…' : 'Hide this kudos'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}
