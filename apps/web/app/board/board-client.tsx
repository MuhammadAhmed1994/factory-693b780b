'use client'

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import Pagination from '../../components/pagination'
import { ApiError } from '../../lib/api-client'
import { addKudosReaction, getKudosPage, hideKudos, type BoardKudos, type KudosBoardPage } from '../../lib/kudos-api'
import styles from './board-client.module.css'

type LoadState = 'loading' | 'ready' | 'error'

function displayName(email: string): string {
  const name = email.split('@')[0].replace(/[._-]+/g, ' ').trim()
  return name.replace(/\b\w/g, (letter) => letter.toUpperCase()) || email
}

function errorText(error: unknown, action: 'load' | 'reaction' | 'hide'): string {
  if (action === 'load') return "We couldn't load the board. Try again."
  if (action === 'reaction') {
    return error instanceof ApiError && error.status === 409
      ? 'You have already reacted to this kudos. Refresh the board to see your reaction.'
      : 'Your reaction could not be added. Please try again.'
  }
  if (error instanceof ApiError && error.status === 403) {
    return 'You are not authorized to hide kudos. The item is still on the board.'
  }
  return 'Kudos could not be hidden. The item is still on the board. Please try again.'
}

function groupReactions(item: BoardKudos) {
  const grouped = new Map<string, number>()
  for (const reaction of item.reactions ?? []) {
    grouped.set(reaction.emoji, (grouped.get(reaction.emoji) ?? 0) + 1)
  }
  return Array.from(grouped, ([emoji, count]) => ({ emoji, count }))
}

export default function BoardClient() {
  const [page, setPage] = useState<KudosBoardPage | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [loadError, setLoadError] = useState('')
  const [pendingReaction, setPendingReaction] = useState<string | null>(null)
  const [reactionErrors, setReactionErrors] = useState<Record<string, string>>({})
  const [submittedReactions, setSubmittedReactions] = useState<Record<string, string>>({})
  const [hideTarget, setHideTarget] = useState<BoardKudos | null>(null)
  const [hidePending, setHidePending] = useState(false)
  const [hideError, setHideError] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const hideTriggerRef = useRef<HTMLElement | null>(null)
  const loadRequestRef = useRef(0)

  const loadPage = useCallback(async (requestedPage: number) => {
    const requestNumber = ++loadRequestRef.current
    setLoadState('loading')
    setLoadError('')
    try {
      const result = await getKudosPage(requestedPage)
      if (requestNumber !== loadRequestRef.current) return
      // The service contract is newest-first. Sort defensively when valid timestamps are present.
      const ordered = [...result.items].sort((a, b) => {
        const difference = Date.parse(b.createdAt) - Date.parse(a.createdAt)
        return Number.isNaN(difference) ? 0 : difference
      })
      setPage({ ...result, items: ordered })
      setCurrentPage(result.page || requestedPage)
      setLoadState('ready')
    } catch (error) {
      if (requestNumber !== loadRequestRef.current) return
      setLoadError(errorText(error, 'load'))
      setLoadState('error')
    }
  }, [])

  useEffect(() => {
    void loadPage(1)
    return () => { loadRequestRef.current += 1 }
  }, [loadPage])

  useEffect(() => {
    if (!hideTarget) return
    const previousFocus = document.activeElement as HTMLElement | null
    cancelRef.current?.focus()
    return () => {
      if (hideTriggerRef.current?.isConnected) hideTriggerRef.current.focus()
      else if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [hideTarget])

  function openHideDialog(item: BoardKudos, trigger: HTMLElement) {
    hideTriggerRef.current = trigger
    setHideError('')
    setHideTarget(item)
  }

  async function submitReaction(item: BoardKudos, emoji: string) {
    if (pendingReaction) return
    setPendingReaction(item.id)
    setReactionErrors((errors) => ({ ...errors, [item.id]: '' }))
    try {
      await addKudosReaction(item.id, emoji)
      setPage((current) => current ? {
        ...current,
        items: current.items.map((candidate) => candidate.id === item.id
          ? { ...candidate, reactions: [...candidate.reactions, { id: `local-${item.id}`, userId: 'current-user', kudosId: item.id, emoji }] }
          : candidate),
      } : current)
      setSubmittedReactions((current) => ({ ...current, [item.id]: emoji }))
      setAnnouncement(`Reaction ${emoji} added.`)
    } catch (error) {
      const message = errorText(error, 'reaction')
      setReactionErrors((errors) => ({ ...errors, [item.id]: message }))
      setAnnouncement('')
    } finally {
      setPendingReaction(null)
    }
  }

  async function confirmHide() {
    if (!hideTarget || hidePending) return
    const target = hideTarget
    setHidePending(true)
    setHideError('')
    try {
      await hideKudos(target.id)
      setPage((current) => current ? {
        ...current,
        items: current.items.filter((item) => item.id !== target.id),
        totalItems: Math.max(0, current.totalItems - 1),
      } : current)
      setAnnouncement('Kudos hidden and removed from the board.')
      setHideTarget(null)
      const itemsOnPage = (page?.items.length ?? 1) - 1
      if (itemsOnPage === 0 && currentPage > 1) {
        void loadPage(currentPage - 1)
      }
    } catch (error) {
      setHideError(errorText(error, 'hide'))
      setAnnouncement('')
    } finally {
      setHidePending(false)
    }
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && !hidePending) {
      setHideTarget(null)
      return
    }
    if (event.key !== 'Tab') return
    const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled)')
    if (!controls?.length) return
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

  const totalPages = page ? Math.max(1, Math.ceil(page.totalItems / Math.max(page.pageSize, 1))) : 1

  return (
    <section className={styles.board} aria-labelledby="feed-title">
      <div className={styles.feedHeading}>
        <h2 id="feed-title">Recent kudos</h2>
        <span className={styles.sortNote}>Showing newest kudos first.</span>
      </div>

      {announcement ? <p className={styles.srOnly} role="status" aria-live="polite">{announcement}</p> : null}
      {loadState === 'loading' ? (
        <div className={styles.skeletonList} role="status" aria-label="Loading kudos…">
          <span className={styles.srOnly}>Loading kudos…</span>
          {[0, 1, 2].map((key) => <div className={styles.skeleton} key={key} aria-hidden="true"><span /><span /><span /></div>)}
        </div>
      ) : null}

      {loadState === 'error' ? (
        <div className={styles.errorPanel} role="alert">
          <p>{loadError}</p>
          <button type="button" className={styles.secondaryButton} onClick={() => void loadPage(currentPage)}>Try again</button>
        </div>
      ) : null}

      {loadState === 'ready' && page?.items.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyMark} aria-hidden="true">✦</span>
          <p>No kudos here yet. Be the first to recognize a teammate.</p>
          <a href="/kudos/new">Give kudos</a>
        </div>
      ) : null}

      {loadState === 'ready' && page && page.items.length > 0 ? (
        <>
          <ul className={styles.feed} aria-label="Newest kudos">
            {page.items.map((item) => {
              const reactions = groupReactions(item)
              const selectedReaction = submittedReactions[item.id]
              const isPending = pendingReaction === item.id
              return (
                <li key={item.id}>
                  <article className={styles.card} aria-label={`Kudos for ${displayName(item.recipient.email)}`}>
                    <div className={styles.cardTop}>
                      <span className={styles.avatar} aria-hidden="true">{displayName(item.recipient.email).split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>
                      <div className={styles.identity}>
                        <span className={styles.recipientLabel}>Kudos to</span>
                        <h3>{displayName(item.recipient.email)}</h3>
                      </div>
                    </div>
                    <p className={styles.message}>{item.message}</p>
                    <div className={styles.cardFooter}>
                      <p className={styles.metadata}>From <strong>{displayName(item.author.email)}</strong><span aria-hidden="true">·</span><time dateTime={item.createdAt}>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.createdAt))}</time></p>
                      <div className={styles.actions}>
                        <div className={styles.reactions} aria-label="Reactions">
                          {reactions.map(({ emoji, count }) => <span className={styles.reactionChip} key={emoji} aria-label={`${emoji}, ${count} ${count === 1 ? 'reaction' : 'reactions'}`}><span aria-hidden="true">{emoji}</span> {count}</span>)}
                          {selectedReaction ? <span className={styles.selectedReaction} role="status">Your reaction: {selectedReaction}</span> : null}
                        </div>
                        {!selectedReaction ? (
                          <div className={styles.reactionPicker}>
                            <details>
                              <summary aria-label={`Add a reaction to kudos for ${displayName(item.recipient.email)}`} aria-disabled={isPending}>
                                {isPending ? 'Adding…' : '＋ React'}
                              </summary>
                              <div className={styles.emojiOptions} role="group" aria-label="Choose one reaction">
                                {['🙌', '❤️', '🎉', '👏', '💡'].map((emoji) => <button key={emoji} type="button" disabled={isPending} aria-label={`React with ${emoji}`} onClick={() => void submitReaction(item, emoji)}>{emoji}</button>)}
                              </div>
                            </details>
                            {isPending ? <span className={styles.pending} role="status">Adding reaction…</span> : null}
                          </div>
                        ) : null}
                        <div className={styles.moderation}>
                          <span className={styles.moderationLabel}>Lead moderation</span>
                          <button className={styles.hideButton} type="button" disabled={hidePending} onClick={(event) => openHideDialog(item, event.currentTarget)}>Hide kudos</button>
                        </div>
                      </div>
                    </div>
                    {reactionErrors[item.id] ? <p className={styles.actionError} role="alert">{reactionErrors[item.id]}</p> : null}
                  </article>
                </li>
              )
            })}
          </ul>
          {page.totalItems > 0 ? <Pagination page={currentPage} totalPages={totalPages} loading={false} onPageChange={(nextPage) => void loadPage(nextPage)} /> : null}
        </>
      ) : null}

      {hideTarget ? (
        <div className={styles.dialogBackdrop}>
          <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="hide-title" aria-describedby="hide-description" ref={dialogRef} onKeyDown={handleDialogKeyDown}>
            <p className={styles.dialogEyebrow}>Lead moderation</p>
            <h2 id="hide-title">Hide this kudos?</h2>
            <p id="hide-description">This will remove the kudos for {displayName(hideTarget.recipient.email)} from the board. This action can’t be undone here.</p>
            {hideError ? <p className={styles.dialogError} role="alert">{hideError}</p> : null}
            <div className={styles.dialogActions}>
              <button type="button" className={styles.secondaryButton} disabled={hidePending} ref={cancelRef} onClick={() => setHideTarget(null)}>Cancel</button>
              <button type="button" className={styles.confirmButton} disabled={hidePending} aria-busy={hidePending} onClick={() => void confirmHide()}>{hidePending ? 'Hiding…' : 'Hide this kudos'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
