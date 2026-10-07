'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { addKudosReaction, getKudosPage, hideKudos, type BoardKudos } from '../../lib/kudos-api'
import styles from './board-client.module.css'

const REACTION_CHOICES = ['🙌', '❤️', '🎉', '👏', '💡']

type LoadState = 'loading' | 'ready' | 'error'

function displayName(email: string) {
  const name = email.split('@')[0] ?? email
  return name.replace(/[._-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase()
}

function orderNewestFirst(items: BoardKudos[]) {
  return [...items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

export default function BoardClient() {
  const [items, setItems] = useState<BoardKudos[]>([])
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [loadError, setLoadError] = useState('')
  const [reactionErrors, setReactionErrors] = useState<Record<string, string>>({})
  const [pendingReaction, setPendingReaction] = useState<string | null>(null)
  const [submittedReactions, setSubmittedReactions] = useState<Record<string, string>>({})
  const [pickerFor, setPickerFor] = useState<string | null>(null)
  const [hideTarget, setHideTarget] = useState<BoardKudos | null>(null)
  const [hidePending, setHidePending] = useState(false)
  const [hideError, setHideError] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const hideTriggerRef = useRef<HTMLButtonElement>(null)
  const feedTitleRef = useRef<HTMLHeadingElement>(null)

  const loadPage = useCallback(async (requestedPage: number) => {
    setLoadState('loading')
    setLoadError('')
    try {
      const result = await getKudosPage(requestedPage)
      setItems(orderNewestFirst(result.items))
      setHasNext(result.items.length === 20)
      setPage(requestedPage)
      setLoadState('ready')
      setAnnouncement('Kudos loaded.')
    } catch {
      setLoadError("We couldn't load the board. Try again.")
      setLoadState('error')
    }
  }, [])

  useEffect(() => { void loadPage(1) }, [loadPage])

  useEffect(() => {
    if (!hideTarget) return
    cancelRef.current?.focus()
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !hidePending) {
        setHideTarget(null)
        setHideError('')
        requestAnimationFrame(() => hideTriggerRef.current?.focus())
      }
      if (event.key === 'Tab' && dialogRef.current) {
        const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled)'))
        if (!controls.length) return
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
  }, [hideTarget, hidePending])

  async function submitReaction(item: BoardKudos, emoji: string) {
    if (pendingReaction || submittedReactions[item.id]) return
    setPendingReaction(item.id)
    setReactionErrors((current) => ({ ...current, [item.id]: '' }))
    try {
      const reaction = await addKudosReaction(item.id, emoji)
      setItems((current) => current.map((entry) => entry.id === item.id && !entry.reactions.some((existing) => existing.id === reaction.id)
        ? { ...entry, reactions: [...entry.reactions, reaction] }
        : entry))
      setSubmittedReactions((current) => ({ ...current, [item.id]: reaction.emoji }))
      setPickerFor(null)
      setAnnouncement(`Reaction ${emoji} added.`)
    } catch {
      setReactionErrors((current) => ({ ...current, [item.id]: 'Your reaction could not be added. Please try again.' }))
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
      const result = await hideKudos(target.id)
      if (!result.isHidden) throw new Error('The server did not confirm the item was hidden. Please try again.')
      const remaining = items.filter((item) => item.id !== target.id)
      setItems(remaining)
      setHideTarget(null)
      setAnnouncement('Kudos hidden and removed from the board.')
      requestAnimationFrame(() => {
        if (remaining.length > 0) hideTriggerRef.current?.focus()
        else feedTitleRef.current?.focus()
      })
      if (remaining.length === 0 && page > 1) void loadPage(page - 1)
    } catch (error) {
      const message = error instanceof Error && error.message
        ? `Hide was not completed. ${error.message}`
        : 'Hide was not completed. You may not have permission, or the request failed. The kudos is still visible; try again or cancel.'
      setHideError(message)
    } finally {
      setHidePending(false)
    }
  }

  function cancelHide() {
    if (hidePending) return
    setHideTarget(null)
    setHideError('')
    requestAnimationFrame(() => hideTriggerRef.current?.focus())
  }

  return (
    <section aria-labelledby="feed-title" aria-busy={loadState === 'loading'}>
      <div className={styles.feedHeading}>
        <h2 id="feed-title" ref={feedTitleRef} tabIndex={-1}>Recent kudos</h2>
        <span className={styles.sortNote}>Showing newest kudos first.</span>
      </div>

      <div className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
      {loadState === 'loading' ? (
        <div className={styles.list} aria-label="Loading kudos">
          <div className={styles.skeleton} aria-hidden="true" />
          <div className={styles.skeleton} aria-hidden="true" />
          <div className={styles.skeleton} aria-hidden="true" />
          <p className={styles.srOnly} role="status">Loading kudos…</p>
        </div>
      ) : loadState === 'error' ? (
        <div className={styles.statePanel} role="alert">
          <h3>Board unavailable</h3>
          <p>{loadError}</p>
          <button type="button" className={styles.retry} onClick={() => void loadPage(page)}>Try again</button>
        </div>
      ) : items.length === 0 ? (
        <div className={styles.statePanel}>
          <h3>No kudos here yet.</h3>
          <p>Be the first to recognize a teammate.</p>
          <a className={styles.retry} href="/kudos/new">Give kudos</a>
        </div>
      ) : (
        <>
          <ul className={styles.list} aria-label="Newest kudos">
            {items.map((item) => {
              const recipient = displayName(item.recipient.email)
              const author = displayName(item.author.email)
              const groups = item.reactions.reduce<Record<string, number>>((counts, reaction) => {
                counts[reaction.emoji] = (counts[reaction.emoji] ?? 0) + 1
                return counts
              }, {})
              const ownReaction = submittedReactions[item.id]
              return (
                <li key={item.id}>
                  <article className={styles.card} aria-label={`Kudos for ${recipient}`}>
                    <div className={styles.cardTop}>
                      <span className={styles.avatar} aria-hidden="true">{initials(recipient)}</span>
                      <div className={styles.copy}>
                        <p className={styles.recipient}>Kudos to {recipient}</p>
                      </div>
                    </div>
                    <p className={styles.message}>{item.message}</p>
                    <div className={styles.cardFooter}>
                      <p className={styles.meta}><span>From <strong>{author}</strong></span><span aria-hidden="true">·</span>
                        <time dateTime={item.createdAt}>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.createdAt))}</time>
                      </p>
                      <div className={styles.reactions} aria-label="Reactions">
                        {Object.entries(groups).map(([emoji, count]) => (
                          <span className={styles.reactionChip} key={emoji} aria-label={`${emoji}, ${count} ${count === 1 ? 'reaction' : 'reactions'}`}>
                            <span aria-hidden="true">{emoji}</span> {count}
                          </span>
                        ))}
                        {ownReaction ? (
                          <span className={styles.srOnly} role="status">Your reaction {ownReaction} is recorded.</span>
                        ) : (
                          <button
                            type="button"
                            className={styles.reactionTrigger}
                            aria-label={`Add a reaction to kudos for ${recipient}`}
                            aria-expanded={pickerFor === item.id}
                            disabled={pendingReaction === item.id}
                            onClick={() => setPickerFor((current) => current === item.id ? null : item.id)}
                          >＋ <span className={styles.srOnly}>React</span></button>
                        )}
                        {pickerFor === item.id && !ownReaction && (
                          <div className={styles.reactionChoices} role="group" aria-label="Choose one reaction">
                            {REACTION_CHOICES.map((emoji) => (
                              <button key={emoji} type="button" className={styles.emojiButton}
                                aria-label={`React with ${emoji}`} disabled={pendingReaction === item.id}
                                onClick={() => void submitReaction(item, emoji)}>{emoji}</button>
                            ))}
                            {pendingReaction === item.id && <span className={styles.pending} role="status">Adding reaction…</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    {reactionErrors[item.id] && <p className={styles.error} role="alert">{reactionErrors[item.id]}</p>}
                    <div className={styles.moderation}>
                      <span className={styles.moderationLabel}>Lead moderation</span>
                      <button ref={hideTarget?.id === item.id ? hideTriggerRef : undefined} className={styles.hideButton} type="button"
                        onClick={(event) => { hideTriggerRef.current = event.currentTarget; setHideTarget(item); setHideError('') }}>
                        Hide kudos
                      </button>
                    </div>
                  </article>
                </li>
              )
            })}
          </ul>
          <nav className={styles.pagination} aria-label="Kudos board pages">
            <span className={styles.pageNote}>Up to 20 kudos per page</span>
            <div className={styles.pageControls}>
              <button className={styles.pageButton} type="button" onClick={() => void loadPage(page - 1)} disabled={page <= 1} aria-label="Previous page">← Previous</button>
              <span className={styles.pageNumber} aria-current="page" aria-label={`Page ${page}, current page`}>{page}</span>
              <button className={styles.pageButton} type="button" onClick={() => void loadPage(page + 1)} disabled={!hasNext} aria-label="Next page">Next →</button>
            </div>
          </nav>
        </>
      )}
      {hideTarget && (
        <div className={styles.dialogBackdrop}>
          <div ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="hide-dialog-title" aria-describedby="hide-dialog-description">
            <h2 id="hide-dialog-title">Hide this kudos?</h2>
            <p id="hide-dialog-description">This will remove the kudos for {displayName(hideTarget.recipient.email)} from the board. This action is only completed after the server confirms.</p>
            {hideError && <p className={styles.error} role="alert">{hideError}</p>}
            <div className={styles.dialogActions}>
              <button ref={cancelRef} className={styles.cancelButton} type="button" onClick={cancelHide} disabled={hidePending}>Cancel</button>
              <button className={styles.confirmButton} type="button" onClick={() => void confirmHide()} disabled={hidePending} aria-busy={hidePending}>{hidePending ? 'Hiding…' : 'Hide this kudos'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
