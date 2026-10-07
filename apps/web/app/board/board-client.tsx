'use client'

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import Alert from '../../components/alert'
import KudosCard from '../../components/kudos-card'
import Pagination from '../../components/pagination'
import { getKudosPage, hideKudos, KUDOS_PAGE_SIZE, submitKudosReaction, type KudosItem, type KudosPage } from '../../lib/kudos-api'
import styles from './board-client.module.css'

const EMPTY_PAGE: KudosPage = { items: [], page: 1, pageSize: KUDOS_PAGE_SIZE, total: 0 }
type BoardClientProps = { initialPage?: number }

function personName(item: KudosItem, kind: 'author' | 'recipient') {
  const person = item[kind]
  const explicit = kind === 'author' ? item.authorName : item.recipientName
  return explicit || person?.name || person?.email || (kind === 'author' ? item.authorId : item.recipientId) || 'Team member'
}

export default function BoardClient({ initialPage = 1 }: BoardClientProps) {
  const [page, setPage] = useState(initialPage)
  const [board, setBoard] = useState<KudosPage>(EMPTY_PAGE)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedForHide, setSelectedForHide] = useState<KudosItem | null>(null)
  const [hiding, setHiding] = useState(false)
  const [hideError, setHideError] = useState('')
  const cancelButton = useRef<HTMLButtonElement>(null)

  const loadPage = useCallback(async (requestedPage: number) => {
    setLoading(true)
    setLoadError(false)
    try {
      const result = await getKudosPage(requestedPage)
      setBoard({ ...result, items: result.items.slice(0, KUDOS_PAGE_SIZE) })
      setPage(requestedPage)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadPage(initialPage) }, [initialPage, loadPage])
  useEffect(() => { if (selectedForHide) cancelButton.current?.focus() }, [selectedForHide])

  async function reactTo(item: KudosItem, emoji: string) {
    const recorded = await submitKudosReaction(item.id, emoji)
    const recordedEmoji = recorded.emoji || emoji
    setBoard((current) => ({
      ...current,
      items: current.items.map((candidate) => candidate.id === item.id
        ? { ...candidate, reactions: [...(candidate.reactions ?? []), { emoji: recordedEmoji, id: recorded.id }] }
        : candidate),
    }))
    setMessage(`Reaction ${recordedEmoji} added.`)
  }

  async function confirmHide() {
    if (!selectedForHide || hiding) return
    setHiding(true)
    setHideError('')
    try {
      await hideKudos(selectedForHide.id)
      const remaining = board.items.filter((item) => item.id !== selectedForHide.id)
      setBoard((current) => ({ ...current, items: current.items.filter((item) => item.id !== selectedForHide.id), total: Math.max(0, current.total - 1) }))
      setSelectedForHide(null)
      setMessage('Kudos hidden and removed from the board.')
      if (remaining.length === 0 && page > 1) await loadPage(page - 1)
    } catch (error) {
      const status = typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : undefined
      setHideError(status === 401 || status === 403
        ? 'You are not authorized to hide this kudos. It remains on the board.'
        : 'We could not hide this kudos. It remains on the board. Please try again.')
    } finally {
      setHiding(false)
    }
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && !hiding) {
      event.preventDefault()
      setSelectedForHide(null)
      setHideError('')
    }
    if (event.key === 'Tab') {
      const controls = event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled)')
      if (!controls.length) return
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
  }

  const totalPages = Math.max(1, Math.ceil(board.total / KUDOS_PAGE_SIZE))
  const showPagination = !loading && !loadError && board.items.length > 0 && (board.total > KUDOS_PAGE_SIZE || page > 1)

  return (
    <section className={styles.feed} aria-labelledby="feed-title">
      {message && <Alert variant="success" dismissible onDismiss={() => setMessage('')}>{message}</Alert>}
      <div className={styles.feedHeading}>
        <h2 id="feed-title">Recent kudos</h2>
        <span className={styles.sortNote}>Showing newest kudos first.</span>
      </div>

      {loading && (
        <div className={styles.skeletonList} aria-label="Loading kudos" role="status">
          <span className={styles.srOnly}>Loading kudos…</span>
          {[0, 1, 2].map((key) => <div className={styles.skeleton} aria-hidden="true" key={key}><span /><span /><span /></div>)}
        </div>
      )}

      {!loading && loadError && (
        <div className={styles.errorPanel} role="alert">
          <p>We couldn’t load the board. Try again.</p>
          <button type="button" onClick={() => void loadPage(page)}>Retry loading board</button>
        </div>
      )}

      {!loading && !loadError && board.items.length === 0 && (
        <div className={styles.empty}>
          <span className={styles.emptyMark} aria-hidden="true">✦</span>
          <h3>No kudos here yet.</h3>
          <p>Be the first to recognize a teammate.</p>
          <a href="/kudos/new">Give kudos</a>
        </div>
      )}

      {!loading && !loadError && board.items.length > 0 && (
        <ul className={styles.list} aria-label="Newest kudos">
          {board.items.map((item) => {
            const reactions = item.reactions ?? []
            const counts = new Map<string, number>()
            reactions.forEach(({ emoji }) => counts.set(emoji, (counts.get(emoji) ?? 0) + 1))
            return (
              <li key={item.id}>
                <KudosCard
                  recipient={personName(item, 'recipient')}
                  message={item.message}
                  author={personName(item, 'author')}
                  createdAt={item.createdAt}
                  variant="lead"
                  reaction={reactions.at(-1)?.emoji ?? null}
                  reactionCount={reactions.length}
                  onReact={(emoji) => reactTo(item, emoji)}
                  onHide={() => { setSelectedForHide(item); setHideError('') }}
                  hidePending={hiding && selectedForHide?.id === item.id}
                />
                {counts.size > 0 && <p className={styles.reactionSummary} aria-label="Reactions on this kudos">{[...counts].map(([emoji, count]) => <span key={emoji}>{emoji} {count}</span>)}</p>}
              </li>
            )
          })}
        </ul>
      )}

      {showPagination && <Pagination page={page} totalPages={totalPages} loading={loading} onPageChange={(nextPage) => { void loadPage(nextPage); document.documentElement.scrollTop = 0 }} />}

      {selectedForHide && (
        <div className={styles.dialogBackdrop}>
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="hide-title"
            aria-describedby="hide-description"
            onKeyDown={handleDialogKeyDown}
          >
            <p className={styles.dialogEyebrow}>Lead moderation</p>
            <h2 id="hide-title">Hide this kudos?</h2>
            <p id="hide-description">This will remove the kudos for {personName(selectedForHide, 'recipient')} from the visible board. The action can’t be undone here.</p>
            <blockquote>{selectedForHide.message}</blockquote>
            {hideError && <p className={styles.dialogError} role="alert">{hideError}</p>}
            <div className={styles.dialogActions}>
              <button ref={cancelButton} type="button" className={styles.cancelButton} disabled={hiding} onClick={() => { setSelectedForHide(null); setHideError('') }}>Cancel</button>
              <button type="button" className={styles.confirmButton} disabled={hiding} aria-busy={hiding} onClick={() => void confirmHide()}>{hiding ? 'Hiding…' : 'Hide this kudos'}</button>
            </div>
          </div>
        </div>
      )}
      <p className={styles.moderationNote}>Lead moderation is subject to your account permissions.</p>
    </section>
  )
}
