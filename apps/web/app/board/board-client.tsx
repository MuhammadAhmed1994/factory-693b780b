'use client'

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ApiError } from '../../lib/api-client'
import { addKudosReaction, hideKudos, listKudos, type KudosBoardItem } from '../../lib/kudos-api'
import Pagination from '../../components/pagination'
import styles from './board-client.module.css'

const EMOJIS = ['🙌', '❤️', '🎉', '👏', '💡']

function displayName(person: KudosBoardItem['author']): string {
  return person.name || person.email
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

function newestFirst(items: KudosBoardItem[]): KudosBoardItem[] {
  return [...items].sort((first, second) => {
    const dateDifference = new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
    return Number.isNaN(dateDifference) || dateDifference === 0 ? 0 : dateDifference
  })
}

export default function BoardClient() {
  const [items, setItems] = useState<KudosBoardItem[]>([])
  const [page, setPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reactionPending, setReactionPending] = useState<string | null>(null)
  const [reactionErrors, setReactionErrors] = useState<Record<string, string>>({})
  const [ownReactions, setOwnReactions] = useState<Record<string, string>>({})
  const [openPicker, setOpenPicker] = useState<string | null>(null)
  const [hideTarget, setHideTarget] = useState<KudosBoardItem | null>(null)
  const [hidePending, setHidePending] = useState(false)
  const [hideError, setHideError] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const cancelRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<HTMLButtonElement | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const requestSequence = useRef(0)

  const loadPage = useCallback(async (requestedPage: number) => {
    const sequence = ++requestSequence.current
    setLoading(true)
    setLoadError(null)
    try {
      const result = await listKudos(requestedPage)
      if (sequence !== requestSequence.current) return
      setItems(newestFirst(result.items).slice(0, 20))
      setPage(result.page)
      setTotalItems(result.totalItems)
    } catch {
      if (sequence === requestSequence.current) setLoadError("We couldn't load the board. Try again.")
    } finally {
      if (sequence === requestSequence.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPage(1)
    return () => { requestSequence.current += 1 }
  }, [loadPage])

  useEffect(() => {
    if (!hideTarget) return
    cancelRef.current?.focus()
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape' && !hidePending) {
        event.preventDefault()
        closeDialog()
      }
      if (event.key === 'Tab') {
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
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  // Dialog lifecycle is intentionally keyed to the selected item.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hideTarget?.id, hidePending])

  function closeDialog() {
    setHideTarget(null)
    setHideError(null)
    openerRef.current?.focus()
  }

  async function reactTo(item: KudosBoardItem, emoji: string) {
    if (reactionPending) return
    setReactionPending(item.id)
    setReactionErrors((current) => ({ ...current, [item.id]: '' }))
    try {
      const created = await addKudosReaction(item.id, emoji)
      setItems((current) => current.map((entry) => entry.id === item.id
        ? { ...entry, reactions: [...entry.reactions, { ...created, emoji }] }
        : entry))
      setOwnReactions((current) => ({ ...current, [item.id]: emoji }))
      setOpenPicker(null)
      setAnnouncement(`Reaction ${emoji} added.`)
    } catch (error) {
      const message = errorMessage(error, 'Your reaction could not be added. Please try again.')
      setReactionErrors((current) => ({ ...current, [item.id]: message }))
      setAnnouncement('')
    } finally {
      setReactionPending(null)
    }
  }

  async function confirmHide() {
    if (!hideTarget || hidePending) return
    setHidePending(true)
    setHideError(null)
    try {
      const result = await hideKudos(hideTarget.id)
      if (!result?.isHidden) throw new Error('The API did not confirm that this kudos was hidden.')
      const remainingItems = items.filter((item) => item.id !== hideTarget.id)
      const updatedTotal = Math.max(0, totalItems - 1)
      setItems(remainingItems)
      setTotalItems(updatedTotal)
      setAnnouncement('Kudos hidden and removed from the board.')
      setHideTarget(null)
      if (remainingItems.length === 0 && page > 1 && updatedTotal > 0) {
        setPage(page - 1)
        void loadPage(page - 1)
      } else {
        headingRef.current?.focus()
      }
    } catch (error) {
      setHideError(errorMessage(error, 'The kudos was not hidden. Check your access and try again.'))
      setAnnouncement('')
    } finally {
      setHidePending(false)
    }
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' && event.target === dialogRef.current) event.preventDefault()
  }

  const totalPages = Math.max(1, Math.ceil(totalItems / 20))

  return (
    <section aria-labelledby="feed-heading" className={styles.feedSection}>
      <div className={styles.feedHeading}>
        <h2 ref={headingRef} id="feed-heading" tabIndex={-1}>Recent kudos</h2>
        <span className={styles.sortNote}>Showing newest kudos first.</span>
      </div>
      <p className={styles.leadNote}>Team leads can hide kudos. Hide requests are confirmed by the server.</p>

      {announcement && <p className={styles.srOnly} role="status" aria-live="polite">{announcement}</p>}

      {loading ? (
        <div className={styles.list} aria-label="Loading kudos" aria-busy="true">
          {Array.from({ length: 3 }, (_, index) => <div className={styles.skeleton} key={index} aria-hidden="true" />)}
          <p className={styles.srOnly} role="status">Loading kudos…</p>
        </div>
      ) : loadError ? (
        <div className={styles.loadError} role="alert">
          <p>{loadError}</p>
          <button type="button" onClick={() => void loadPage(page)}>Retry loading kudos</button>
        </div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          <span aria-hidden="true">✦</span>
          <p>No kudos here yet. Be the first to recognize a teammate.</p>
          <a href="/kudos/new">Give kudos</a>
        </div>
      ) : (
        <>
          <ul className={styles.list} aria-label="Newest kudos">
            {items.map((item) => {
              const reactionCounts = item.reactions.reduce<Record<string, number>>((counts, reaction) => {
                counts[reaction.emoji] = (counts[reaction.emoji] || 0) + 1
                return counts
              }, {})
              const ownReaction = ownReactions[item.id]
              return (
                <li key={item.id}>
                  <article className={styles.card} aria-label={`Kudos for ${item.recipient.name || item.recipient.email}`}>
                    <div className={styles.recipientLine}>
                      <span className={styles.avatar} aria-hidden="true">{(item.recipient.name || item.recipient.email).slice(0, 1).toUpperCase()}</span>
                      <div><span className={styles.recipientLabel}>Kudos to</span><h3>{item.recipient.name || item.recipient.email}</h3></div>
                    </div>
                    <p className={styles.message}>{item.message}</p>
                    <div className={styles.cardFooter}>
                      <p className={styles.byline}>From <strong>{displayName(item.author)}</strong><span aria-hidden="true"> · </span><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time></p>
                      <div className={styles.reactions} aria-label="Reactions">
                        {Object.entries(reactionCounts).map(([emoji, count]) => (
                          <span className={styles.reactionChip} key={emoji} aria-label={`${emoji}, ${count} ${count === 1 ? 'reaction' : 'reactions'}`}><span aria-hidden="true">{emoji}</span> {count}</span>
                        ))}
                        <div className={styles.picker}>
                          <button type="button" className={styles.reactButton} aria-label={ownReaction ? `Your reaction ${ownReaction}` : 'Add a reaction'} aria-expanded={openPicker === item.id} aria-busy={reactionPending === item.id} disabled={Boolean(reactionPending) || Boolean(ownReaction)} onClick={() => setOpenPicker((current) => current === item.id ? null : item.id)}>
                            {reactionPending === item.id ? 'Adding…' : ownReaction ? `Reacted ${ownReaction}` : '＋ React'}
                          </button>
                          {!ownReaction && openPicker === item.id && <div id={`emoji-choices-${item.id}`} className={styles.emojiChoices} role="group" aria-label="Choose one reaction">
                            {EMOJIS.map((emoji) => <button key={emoji} type="button" aria-label={`React with ${emoji}`} disabled={Boolean(reactionPending)} onClick={() => void reactTo(item, emoji)}>{emoji}</button>)}
                          </div>}
                        </div>
                        {reactionErrors[item.id] && <p className={styles.inlineError} role="alert">{reactionErrors[item.id]}</p>}
                      </div>
                    </div>
                    <div className={styles.moderation}>
                      <span>Lead moderation</span>
                      <button type="button" aria-label={`Hide kudos for ${item.recipient.name || item.recipient.email}`} onClick={(event) => {
                        openerRef.current = event.currentTarget
                        setHideError(null)
                        setHideTarget(item)
                      }}>Hide kudos</button>
                    </div>
                  </article>
                </li>
              )
            })}
          </ul>
          <Pagination page={page} totalPages={totalPages} loading={loading} onPageChange={(requestedPage) => {
            headingRef.current?.focus()
            void loadPage(requestedPage)
          }} />
        </>
      )}

      {hideTarget && <div className={styles.dialogBackdrop}>
        <div ref={dialogRef} className={styles.dialog} role="alertdialog" aria-modal="true" aria-labelledby="hide-dialog-title" aria-describedby="hide-dialog-description" tabIndex={-1} onKeyDown={handleDialogKeyDown}>
          <p className={styles.dialogEyebrow}>Lead moderation</p>
          <h2 id="hide-dialog-title">Hide this kudos?</h2>
          <p id="hide-dialog-description">This will remove the kudos for {hideTarget.recipient.name || hideTarget.recipient.email} from the board. The action is only complete after the server confirms.</p>
          {hideError && <p className={styles.hideError} role="alert">{hideError} The kudos remains visible; you can retry or cancel.</p>}
          <div className={styles.dialogActions}>
            <button type="button" ref={cancelRef} className={styles.cancelButton} onClick={closeDialog} disabled={hidePending}>Cancel</button>
            <button type="button" className={styles.confirmButton} onClick={() => void confirmHide()} disabled={hidePending} aria-busy={hidePending}>{hidePending ? 'Hiding…' : 'Hide this kudos'}</button>
          </div>
        </div>
      </div>}
    </section>
  )
}
