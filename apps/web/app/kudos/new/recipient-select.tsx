'use client'

import { useId, useState, type KeyboardEvent, type RefObject } from 'react'
import styles from './recipient-select.module.css'

export interface Member { id: string; email: string }

interface RecipientSelectProps {
  members: Member[]
  value: Member | null
  onChange: (member: Member | null) => void
  disabled?: boolean
  loading?: boolean
  invalid?: boolean
  describedBy?: string
  inputRef?: RefObject<HTMLInputElement | null>
}

export default function RecipientSelect({
  members, value, onChange, disabled = false, loading = false, invalid = false, describedBy, inputRef,
}: RecipientSelectProps) {
  const id = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const shown = members.filter((member) => member.email.toLowerCase().includes(query.toLowerCase()))

  function choose(member: Member) {
    onChange(member)
    setQuery('')
    setOpen(false)
  }

  function keyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActive((index) => Math.min(index + 1, shown.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setActive((index) => Math.max(0, index - 1))
    } else if (event.key === 'Enter' && open && shown[active]) {
      event.preventDefault()
      choose(shown[active])
    } else if (event.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  const activeOption = open && shown[active] ? `${id}-option-${active}` : undefined
  return (
    <div className={styles.wrapper}>
      <input
        ref={inputRef}
        id="recipient"
        className={`${styles.input} ${invalid ? styles.invalid : ''}`}
        type="text"
        role="combobox"
        value={open ? query : value?.email ?? ''}
        placeholder={loading ? 'Loading teammates…' : 'Search teammates by email'}
        disabled={disabled}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-activedescendant={activeOption}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        onFocus={() => { if (!disabled) setOpen(true) }}
        onClick={() => { if (!disabled) setOpen(true) }}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
          setActive(0)
          if (value) onChange(null)
        }}
        onKeyDown={keyDown}
      />
      {open && !disabled ? (
        <ul className={styles.options} id={`${id}-listbox`} role="listbox" aria-label="Teammates">
          {shown.length ? shown.map((member, index) => (
            <li
              key={member.id}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={value?.id === member.id}
              className={`${styles.option} ${active === index ? styles.active : ''}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(member)}
            >
              {member.email}
            </li>
          )) : <li className={styles.noResults} role="option" aria-disabled="true">No teammates found.</li>}
        </ul>
      ) : null}
    </div>
  )
}
