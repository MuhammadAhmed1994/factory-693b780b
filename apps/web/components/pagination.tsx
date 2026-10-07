'use client'

import styles from './pagination.module.css'

type PaginationProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  loading?: boolean
}

export default function Pagination({ page, totalPages, onPageChange, loading = false }: PaginationProps) {
  const lastPage = Math.max(1, Math.floor(totalPages))
  const currentPage = Math.min(lastPage, Math.max(1, Math.floor(page)))

  return (
    <nav className={styles.pagination} aria-label="Kudos board pages" aria-busy={loading}>
      <button
        type="button"
        className={styles.button}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={loading || currentPage <= 1}
        aria-label="Go to previous page"
      >
        <span aria-hidden="true">←</span> Previous
      </button>
      <span className={styles.pageStatus} aria-live="polite">
        {loading ? 'Loading page…' : <>Page <strong>{currentPage}</strong> of {lastPage}</>}
      </span>
      <button
        type="button"
        className={styles.button}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={loading || currentPage >= lastPage}
        aria-label="Go to next page"
      >
        Next <span aria-hidden="true">→</span>
      </button>
    </nav>
  )
}
