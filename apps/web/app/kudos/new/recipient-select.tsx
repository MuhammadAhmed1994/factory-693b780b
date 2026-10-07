'use client'

import { useId, useMemo, useState, type KeyboardEvent, type RefObject } from 'react'
import styles from './recipient-select.module.css'

export interface TeamMember {
  id: string
  email: string
}

interface RecipientSelectProps {
  members: TeamMember[]
  value: string
  onChange: (id: string) => void
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
  inputRef?: RefObject<HTMLInputElement | null>
}

/** Searchable, keyboard-operable single-select combobox for the member directory. */
export default function RecipientSelect({
  members,
  value,
  onChange,
  disabled = false,
  invalid = false,
  describedBy,
  inputRef,
}: RecipientSelectProps) {
  const generatedId = useId()
  const listboxId = `recipient-options-${generatedId}`
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const selected = members.find((member) => member.id === value)
  const filteredMembers = useMemo(() => {
    const search = query.trim().toLowerCase()
    return members.filter((member) => !search || member.email.toLowerCase().includes(search))
  }, [members, query])
  const showOptions = open && !disabled

  function choose(member: TeamMember) {
    onChange(member.id)
    setQuery('')
    setOpen(false)
    setActiveIndex(0)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((current) => Math.min(current + 1, filteredMembers.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((current) => Math.max(current - 1, 0))
    } else if (event.key === 'Enter' && showOptions && filteredMembers.length) {
      event.preventDefault()
      choose(filteredMembers[Math.min(activeIndex, filteredMembers.length - 1)])
    } else if (event.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div className={styles.select}>
      <div className={`${styles.control} ${invalid ? styles.invalid : ''}`}>
        <input
          ref={inputRef}
          id="recipient"
          type="text"
          role="combobox"
          autoComplete="off"
          className={styles.input}
          value={selected && !open ? selected.email : query}
          placeholder={disabled ? 'Recipient unavailable' : 'Search teammates'}
          disabled={disabled}
          aria-label="Recipient"
          aria-autocomplete="list"
          aria-expanded={showOptions}
          aria-controls={listboxId}
          aria-activedescendant={showOptions && filteredMembers[activeIndex] ? `${listboxId}-${activeIndex}` : undefined}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          onFocus={() => { if (!disabled) setOpen(true) }}
          onClick={() => { if (!disabled) setOpen(true) }}
          onChange={(event) => {
            setQuery(event.currentTarget.value)
            if (selected) onChange('')
            setActiveIndex(0)
            setOpen(true)
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        />
        {selected && !disabled ? (
          <button
            className={styles.clear}
            type="button"
            aria-label="Clear recipient"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onChange('')
              setQuery('')
              setOpen(true)
            }}
          >×</button>
        ) : <span className={styles.chevron} aria-hidden="true">⌄</span>}
      </div>
      {showOptions ? (
        <ul className={styles.options} id={listboxId} role="listbox" aria-label="Team members">
          {filteredMembers.length ? filteredMembers.map((member, index) => (
            <li
              className={`${styles.option} ${index === activeIndex ? styles.active : ''}`}
              id={`${listboxId}-${index}`}
              key={member.id}
              role="option"
              aria-selected={member.id === value}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(member)}
            >
              {member.email}
            </li>
          )) : <li className={styles.noResults} role="option" aria-disabled="true">No matching teammates.</li>}
        </ul>
      ) : null}
    </div>
  )
}
