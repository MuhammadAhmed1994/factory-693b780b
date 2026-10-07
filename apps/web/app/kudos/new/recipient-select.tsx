'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import styles from './recipient-select.module.css'

export interface RecipientOption {
  id: string
  name: string
  email?: string
}

interface RecipientSelectProps {
  options: RecipientOption[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
  loading?: boolean
}

export default function RecipientSelect({
  options,
  value,
  onChange,
  disabled = false,
  invalid = false,
  describedBy,
  loading = false,
}: RecipientSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const selected = options.find((option) => option.id === value)
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return normalizedQuery
      ? options.filter((option) => `${option.name} ${option.email ?? ''}`.toLocaleLowerCase().includes(normalizedQuery))
      : options
  }, [options, query])

  useEffect(() => {
    if (activeIndex >= filteredOptions.length) setActiveIndex(Math.max(0, filteredOptions.length - 1))
  }, [activeIndex, filteredOptions.length])

  function showOptions() {
    if (disabled) return
    setQuery('')
    setActiveIndex(Math.max(0, options.findIndex((option) => option.id === value)))
    setOpen(true)
  }

  function select(option: RecipientOption) {
    onChange(option.id)
    setQuery('')
    setOpen(false)
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value)
    onChange('')
    setActiveIndex(0)
    setOpen(true)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!open) setOpen(true)
      else setActiveIndex((index) => Math.min(index + 1, filteredOptions.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(0, index - 1))
    } else if (event.key === 'Enter' && open && filteredOptions[activeIndex]) {
      event.preventDefault()
      select(filteredOptions[activeIndex])
    } else if (event.key === 'Escape' && open) {
      event.preventDefault()
      setOpen(false)
      setQuery('')
    }
  }

  const inputValue = open ? query : selected?.name ?? ''

  return (
    <div className={styles.root}>
      <input
        ref={inputRef}
        id="recipient"
        className={`${styles.input} ${invalid ? styles.invalid : ''}`}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="recipient-options"
        aria-activedescendant={open && filteredOptions[activeIndex] ? `recipient-option-${filteredOptions[activeIndex].id}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        placeholder={loading ? 'Loading teammates…' : 'Search for a teammate'}
        value={inputValue}
        disabled={disabled || loading}
        onClick={showOptions}
        onFocus={() => { if (!disabled && !loading && !open) showOptions() }}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120)
        }}
      />
      <span className={styles.chevron} aria-hidden="true">⌄</span>
      {open ? (
        <ul className={styles.listbox} id="recipient-options" role="listbox" aria-label="Team members">
          {filteredOptions.length ? filteredOptions.map((option, index) => (
            <li
              key={option.id}
              id={`recipient-option-${option.id}`}
              className={`${styles.option} ${index === activeIndex ? styles.optionActive : ''} ${option.id === value ? styles.optionSelected : ''}`}
              role="option"
              aria-selected={option.id === value}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => { select(option); inputRef.current?.focus() }}
            >
              {option.name}{option.email ? <span> · {option.email}</span> : null}
            </li>
          )) : <li className={styles.noResults} role="option" aria-disabled="true">No teammates match your search.</li>}
        </ul>
      ) : null}
    </div>
  )
}
