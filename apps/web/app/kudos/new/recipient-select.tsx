'use client'

import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import styles from './recipient-select.module.css'

export interface Recipient {
  id: string
  name: string
  email?: string
}

interface RecipientSelectProps {
  recipients: Recipient[]
  value: string
  onChange: (recipientId: string) => void
  disabled?: boolean
  loading?: boolean
  error?: string
}

export default function RecipientSelect({
  recipients,
  value,
  onChange,
  disabled = false,
  loading = false,
  error,
}: RecipientSelectProps) {
  const id = useId()
  const inputId = `${id}-input`
  const listId = `${id}-listbox`
  const errorId = `${id}-error`
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const selected = recipients.find((recipient) => recipient.id === value)
  const filtered = useMemo(() => recipients.filter((recipient) =>
    `${recipient.name} ${recipient.email ?? ''}`.toLowerCase().includes(query.toLowerCase()),
  ), [recipients, query])

  function choose(recipient: Recipient) {
    onChange(recipient.id)
    setQuery('')
    setOpen(false)
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((index) => Math.min(index + 1, filtered.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter' && open && filtered[activeIndex]) {
      event.preventDefault()
      choose(filtered[activeIndex])
    } else if (event.key === 'Escape') {
      setOpen(false)
      setQuery('')
    } else if (event.key === 'Backspace' && !query && selected) {
      onChange('')
    }
  }

  return (
    <div className={styles.wrapper}>
      <label className={styles.label} htmlFor={inputId}>Recipient</label>
      <div className={`${styles.control} ${error ? styles.invalid : ''}`}>
        <input
          ref={inputRef}
          id={inputId}
          className={styles.input}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && filtered[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
          value={open ? query : selected?.name ?? ''}
          placeholder={loading ? 'Loading teammates…' : 'Choose a teammate'}
          disabled={disabled || loading}
          onFocus={() => selected ? undefined : setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value)
            setActiveIndex(0)
            setOpen(true)
            if (value) onChange('')
          }}
          onKeyDown={onKeyDown}
        />
        {selected && !disabled && !loading ? (
          <button
            className={styles.clear}
            type="button"
            aria-label="Clear recipient"
            onClick={() => {
              onChange('')
              setQuery('')
              setOpen(true)
              inputRef.current?.focus()
            }}
          >×</button>
        ) : <span className={styles.chevron} aria-hidden="true">⌄</span>}
      </div>
      {loading ? <p className={styles.hint} role="status">Loading teammates…</p> : null}
      {!loading && open && !disabled ? (
        <ul className={styles.options} id={listId} role="listbox" aria-label="Team members">
          {filtered.length ? filtered.map((recipient, index) => (
            <li
              id={`${id}-option-${index}`}
              key={recipient.id}
              role="option"
              aria-selected={recipient.id === value}
              className={index === activeIndex ? styles.activeOption : styles.option}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(recipient)}
            >
              <span>{recipient.name}</span>
              {recipient.email ? <span className={styles.email}>{recipient.email}</span> : null}
            </li>
          )) : <li className={styles.noOptions}>No matching teammates.</li>}
        </ul>
      ) : null}
      {error ? <p className={styles.error} id={errorId}>{error}</p> : null}
    </div>
  )
}
