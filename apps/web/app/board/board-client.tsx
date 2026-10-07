'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import Alert from '../../components/alert'
import KudosCard from '../../components/kudos-card'
import Pagination from '../../components/pagination'
import { ApiError } from '../../lib/api-client'
import { addKudosReaction, getKudosPage, hideKudos, type BoardKudos, type KudosBoardPage } from '../../lib/kudos-api'
import styles from './board-client.module.css'

const PAGE_SIZE = 20
const LOAD_ERROR = "We couldn't load the board. Try again."

function displayName(email: string) {
  const name = email.split('@')[0].replace(/[._-]+/g, ' ').trim()
  return name.replace(/\b\w/g, (letter) => letter.toUpperCase()) || email
}

function newestFirst(items: BoardKudos[]) {
  return [...items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

export default function BoardClient() {
  const [page, setPage] = useState(1)
  const [board, setBoard] = useState<KudosBoardPage | null>(null)
  const [items, setItems] = useState<BoardKudos[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [status, setStatus] = useState('')
  const [hideTarget, setHideTarget] = useState<BoardKudos | null>(null)
  const [hiding, setHiding] = useState(false)
  const [hideError, setHideError] = useState('')
  const [ownReactions, setOwnReactions] = useState<Record<string, string>>({})
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const hideTriggerRef = useRef<HTMLButtonElement | null>(null)
  const requestId = useRef(0)

  const loadPage = useCallback(async (targetPage: number) => {
    const request = ++requestId.current
    setLoading(true)
    setLoadError(false)
    try {
      const result = await getKudosPage(targetPage)
      if (request !== requestId.current) return
      const sortedItems = newestFirst(result.items).slice(0, PAGE_SIZE)
      setBoard({ ...result, items: sortedItems })
      setItems(sortedItems)
    } catch {
      if (request === requestId.current) setLoadError(true)
    } finally {
      if (request === requestId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPage(page)
    return () => { requestId.current += 1 }
  }, [loadPage, page])

  useEffect(() => {
    if (!hideTarget) hideTriggerRef.current?.focus()
  }, [hideTarget])

  async function submitReaction(item: BoardKudos, emoji: string) {
    const created = await addKudosReaction(item.id, emoji)
    const recorded = {
      id: created?.id ?? `${item.id}-${Date.now()}`,
      userId: created?.userId ?? '',
      kudosId: item.id,
      emoji: created?.emoji ?? emoji,
    }
    setItems((current) => current.map((entry) => entry.id === item.id
      ? { ...entry, reactions: [...entry.reactions, recorded] }
      : entry))
    setOwnReactions((current) => ({ ...current, [item.id]: recorded.emoji }))
    setStatus(`Reaction ${recorded.emoji} added.`)
  }

  function requestHide(item: BoardKudos, trigger: HTMLButtonElement) {
    hideTriggerRef.current = trigger
    setHideError('')
    setHideTarget(item)
  }

  async function confirmHide() {
    if (!hideTarget || hiding) return
    setHiding(true)
    setHideError('')
    try {
      await hideKudos(hideTarget.id)
      const remaining = items.filter((item) => item.id !== hideTarget.id)
      const nextTotal = Math.max(0, (board?.totalItems ?? items.length) - 1)
      setItems(remaining)
      setBoard((current) => current ? { ...current, items: remaining, totalItems: nextTotal } : current)
      setStatus('Kudos hidden and removed from the board.')
      setHideTarget(null)
      const lastPage = Math.max(1, Math.ceil(nextTotal / PAGE_SIZE))
      if (remaining.length === 0 && page > 1 && page > lastPage) setPage(lastPage)
      else if (remaining.length === 0 && page > 1) setPage(page - 1)
    } catch (error) {
      const message = error instanceof ApiError && (error.status === 401 || error.status === 403)
        ? 'This action was not completed. Only team leads can hide kudos. The item is still on the board.'
        : 'Could not hide this kudos. Check your connection and try again; the item is still on the board.'
      setHideError(message)
    } finally {
      setHiding(false)
    }
  }

  function onDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && !hiding) {
      setHideTarget(null)
      return
    }
    if (event.key !== 'Tab') return
    const first = cancelRef.current
    const last = confirmRef.current
    if (!first || !last) return
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const totalPages = useMemo(() => Math.max(1, Math.ceil((board?.totalItems ?? 0) / PAGE_SIZE)), [board])

  return (
    <main className={styles.main}>
      <section className={styles.intro} aria-labelledby="board-title">
        <div>
          <p className={styles.eyebrow}><span aria-hidden="true" />Team recognition</p>
          <h1 id="board-title">Kudos board</h1>
          <p className={styles.subtitle}>A place to recognize the people who make our team better.</p>
        </div>
        <Link className={styles.giveButton} href="/kudos/new"><span aria-hidden="true">＋</span>Give kudos</Link>
      </section>

      <section aria-labelledby="feed-title">
        <div className={styles.feedHeading}>
          <h2 id="feed-title">Recent kudos</h2>
          <span className={styles.sortNote}>Showing newest kudos first.</span>
        </div>

        {status ? <div className={styles.srOnly} role="status" aria-live="polite">{status}</div> : null}
        {loadError ? (
          <Alert variant="error" dismissible={false}>
            <span>{LOAD_ERROR}</span>{' '}
            <button type="button" className={styles.retryButton} onClick={() => void loadPage(page)}>Try again</button>
          </Alert>
        ) : null}

        {loading ? (
          <div className={styles.feed} aria-label="Loading kudos" aria-busy="true">
            {Array.from({ length: 3 }, (_, index) => <div key={index} className={styles.skeleton} aria-hidden="true"><span /><span /><span /></div>)}
            <p className={styles.srOnly} role="status">Loading kudos…</p>
          </div>
        ) : !loadError && items.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyMark} aria-hidden="true">✳</span>
            <h2>No kudos here yet.</h2>
            <p>Be the first to recognize a teammate.</p>
            <Link className={styles.giveButton} href="/kudos/new">Give kudos</Link>
          </div>
        ) : !loadError ? (
          <>
            <ul className={styles.feed} aria-label="Newest kudos">
              {items.map((item) => {
                const counts = item.reactions.reduce<Record<string, number>>((result, reaction) => {
                  result[reaction.emoji] = (result[reaction.emoji] ?? 0) + 1
                  return result
                }, {})
                return (
                  <li key={item.id}>
                    <KudosCard
                      recipient={displayName(item.recipient.email)}
                      message={item.message}
                      author={displayName(item.author.email)}
                      createdAt={item.createdAt}
                      reaction={ownReactions[item.id] ?? null}
                      reactionCount={item.reactions.length}
                      onReact={(emoji) => submitReaction(item, emoji)}
                      onHide={(event?: unknown) => {
                        const trigger = event instanceof HTMLButtonElement ? event : document.activeElement as HTMLButtonElement
                        requestHide(item, trigger)
                      }}
                      variant="lead"
                    />
                    {Object.keys(counts).length ? <p className={styles.reactionSummary} aria-label="Current reactions">{Object.entries(counts).map(([emoji, count]) => <span key={emoji}>{emoji} <span>{count}</span></span>)}</p> : null}
                  </li>
                )
              })}
            </ul>
            {totalPages > 1 ? <Pagination page={page} totalPages={totalPages} loading={loading} onPageChange={setPage} /> : null}
          </>
        ) : null}
      </section>

      {hideTarget ? (
        <div className={styles.dialogBackdrop}>
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="hide-title"
            aria-describedby="hide-description"
            onKeyDown={onDialogKeyDown}
          >
            <p className={styles.dialogEyebrow}>Lead moderation</p>
            <h2 id="hide-title">Hide this kudos?</h2>
            <p id="hide-description">This will remove the kudos for {displayName(hideTarget.recipient.email)} from the board. This action only completes if the server confirms it.</p>
            {hideError ? <p className={styles.dialogError} role="alert">{hideError}</p> : null}
            <div className={styles.dialogActions}>
              <button ref={cancelRef} type="button" className={styles.cancelButton} onClick={() => setHideTarget(null)} disabled={hiding}>Cancel</button>
              <button ref={confirmRef} type="button" className={styles.confirmButton} onClick={() => void confirmHide()} disabled={hiding} aria-busy={hiding} autoFocus>
                {hiding ? 'Hiding…' : 'Hide this kudos'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
