/**
 * ============================================================
 * JobsListPage.jsx — Steps 2, 3, 4 + Search with useDebounce
 * ============================================================
 *
 * STEP 2 — useQuery with loading skeleton + error state
 * STEP 3 — Pagination: Previous/Next update `page` state
 *           → changing `page` changes the queryKey → refetches
 * STEP 4 — Filters (status, job_type) are part of the queryKey
 *           → changing a filter resets to page 1 and refetches
 *
 * STEP 5 — Search with useDebounce (today's new feature)
 *           Raw input: `search` state — updates on every keystroke (no lag)
 *           Debounced:  `debouncedSearch` — updates 400ms after typing stops
 *           queryKey uses `debouncedSearch` → refetch only fires after pause
 *
 * ─── WHY TWO SEPARATE STATE VALUES FOR SEARCH? ──────────────
 *
 *   search         → controls the <input> value (instant, for UI responsiveness)
 *   debouncedSearch → goes into the queryKey (delayed, prevents excess requests)
 *
 *   The input ALWAYS feels instant to the user.
 *   The network request only fires after they've paused typing.
 *
 * ─── HOW QUERY KEY DRIVES EVERYTHING ────────────────────────
 *
 * queryKey: ['jobs', { page, status, job_type, search: debouncedSearch }]
 *
 * When ANY part of the key changes:
 *   • React Query creates a new cache entry
 *   • Triggers a fresh network request
 *   • Shows cached data from the old key while fetching (placeholderData)
 * ============================================================
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getJobs } from '../../services/jobService'
import useDebounce from '../../hooks/useDebounce'
import JobCard from '../../Components/JobCard'

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div style={sk.card}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
      <div>
        <div style={{ ...sk.line, width: '200px', height: '18px', marginBottom: '8px' }} />
        <div style={{ ...sk.line, width: '130px', height: '13px' }} />
      </div>
      <div style={{ ...sk.line, width: '60px', height: '22px', borderRadius: '999px' }} />
    </div>
    <div style={{ display: 'flex', gap: '8px', marginBottom: '0.75rem' }}>
      <div style={{ ...sk.line, width: '100px', height: '24px' }} />
      <div style={{ ...sk.line, width: '80px', height: '24px' }} />
    </div>
    <div style={{ ...sk.line, width: '100%', height: '12px', marginBottom: '6px' }} />
    <div style={{ ...sk.line, width: '85%', height: '12px' }} />
  </div>
)

const sk = {
  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: '1.25rem 1.5rem',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  line: {
    background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: '6px',
  },
}

// ─── Filter options ────────────────────────────────────────────────────────────
const STATUS_OPTIONS  = ['', 'open', 'closed', 'paused']
const JOB_TYPE_OPTIONS = ['', 'remote', 'onsite', 'hybrid', 'contract', 'internship']

// ─── Main Component ────────────────────────────────────────────────────────────
const JobsListPage = () => {
  // ── Local UI state only — NO data state needed ─────────────────────────────
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    status:   '',
    job_type: '',
  })

  // ── Search state — TWO values on purpose ──────────────────────────────────
  //
  // `search`         → bound to the <input> directly. Updates on every keystroke.
  //                    This keeps the input responsive (no input lag for the user).
  //
  // `debouncedSearch` → produced by useDebounce. Only updates 400ms after the
  //                    last keystroke. THIS goes into the queryKey so React Query
  //                    doesn't fire a network request on every single character.
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)

  // ── Build params — only debouncedSearch enters the queryKey ───────────────
  const queryParams = {
    page,
    limit: 10,
    ...filters,
    search: debouncedSearch,   // ← debounced, not raw
  }

  /**
   * ─── useQuery ─────────────────────────────────────────────────────────────
   *
   * queryKey: ['jobs', queryParams]
   *
   *   queryParams contains `debouncedSearch` (not `search`).
   *   So the key — and therefore the fetch — only changes after the user
   *   pauses typing for 400ms. Typing 8 chars rapidly → 1 network request.
   */
  const {
    data,
    isLoading,     // true only during the FIRST fetch (no cached data)
    isFetching,    // true during ANY fetch, including background refetches
    isError,
    error,
    isPlaceholderData,
  } = useQuery({
    queryKey: ['jobs', queryParams],
    queryFn:  () => getJobs(queryParams),
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 30,
  })

  // ── Derived values ─────────────────────────────────────────────────────────
  const jobs       = data?.jobs ?? []
  const pagination = data?.pagination ?? {}
  const totalPages = pagination.totalPages ?? 1
  const hasNextPage = page < totalPages

  // ── Filter change handler ─────────────────────────────────────────────────
  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
    setPage(1)
  }

  // ── Search change handler ─────────────────────────────────────────────────
  // Only updates the raw `search` state. useDebounce handles the delay.
  const handleSearchChange = (e) => {
    setSearch(e.target.value)
    setPage(1)  // Reset to page 1 when search changes
  }

  // ── Clear all filters + search ────────────────────────────────────────────
  const handleClearAll = () => {
    setFilters({ status: '', job_type: '' })
    setSearch('')
    setPage(1)
  }

  const hasActiveFilters = filters.status || filters.job_type || search

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.6; }
        }
        .search-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
          outline: none;
        }
        .job-link {
          text-decoration: none;
          color: inherit;
          display: block;
        }
        .job-link:hover > article {
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.12);
          transform: translateY(-2px);
          border-color: #c7d2fe;
        }
      `}</style>

      {/* ── Page Header ── */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>🎯 Job Listings</h1>
          <p style={styles.subheading}>
            {pagination.total !== undefined
              ? `${pagination.total} job${pagination.total !== 1 ? 's' : ''} found`
              : 'Searching for jobs…'}
          </p>
        </div>

        {/* Background-fetch indicator */}
        {isFetching && !isLoading && (
          <div style={styles.fetchingBadge}>
            <div style={styles.fetchingDot} /> Updating…
          </div>
        )}
      </div>

      {/* ── Filter + Search Bar ───────────────────────────────────────────────
          The search input is wired to `search` state (instant UI update).
          But the queryKey uses `debouncedSearch`, so fetches are throttled.

          Visual hint: while the debounce timer is still counting down
          (search !== debouncedSearch), we show a subtle "Typing…" label
          to signal that a search is pending.
          ─────────────────────────────────────────────────────────────────── */}
      <div style={styles.filterBar}>

        {/* Search — raw input state, debounced query */}
        <div style={{ ...styles.filterGroup, flex: 1, minWidth: '200px' }}>
          <label style={styles.filterLabel}>
            Search
            {/* Show "typing…" while debounce is pending */}
            {search !== debouncedSearch && (
              <span style={styles.typingHint}> · typing…</span>
            )}
          </label>
          <div style={styles.searchWrap}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              id="job-search"
              type="text"
              className="search-input"
              placeholder="Search by title or company…"
              value={search}
              onChange={handleSearchChange}
              style={styles.searchInput}
            />
          </div>
        </div>

        {/* Status dropdown */}
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Status</label>
          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            style={styles.select}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt} value={opt}>
                {opt ? opt.charAt(0).toUpperCase() + opt.slice(1) : 'All Statuses'}
              </option>
            ))}
          </select>
        </div>

        {/* Job Type dropdown */}
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>Job Type</label>
          <select
            name="job_type"
            value={filters.job_type}
            onChange={handleFilterChange}
            style={styles.select}
          >
            {JOB_TYPE_OPTIONS.map(opt => (
              <option key={opt} value={opt}>
                {opt ? opt.charAt(0).toUpperCase() + opt.slice(1) : 'All Types'}
              </option>
            ))}
          </select>
        </div>

        {/* Clear all */}
        {hasActiveFilters && (
          <button style={styles.clearBtn} onClick={handleClearAll}>
            ✕ Clear all
          </button>
        )}
      </div>

      {/* ── Content Area ─────────────────────────────────────────────────────── */}

      {/* LOADING: First fetch */}
      {isLoading && (
        <div style={styles.jobList}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* ERROR */}
      {isError && (
        <div style={styles.errorBox}>
          <div style={styles.errorIcon}>⚠️</div>
          <div>
            <h3 style={{ margin: '0 0 4px', color: '#dc2626' }}>Failed to load jobs</h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#ef4444' }}>
              {error?.response?.data?.message || error?.message || 'Something went wrong'}
            </p>
            <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              React Query will automatically retry 2 more time(s).
            </p>
          </div>
        </div>
      )}

      {/* SUCCESS */}
      {!isLoading && !isError && (
        <>
          {jobs.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>🔍</div>
              <h3 style={{ color: '#1e293b', margin: '0 0 8px' }}>No jobs found</h3>
              <p style={{ color: '#64748b', margin: 0 }}>
                {search
                  ? `No results for "${search}". Try a different keyword.`
                  : 'Try adjusting your filters or check back later.'}
              </p>
            </div> 
          ) : (
            <div style={{ ...styles.jobList, opacity: isPlaceholderData ? 0.6 : 1, transition: 'opacity 0.2s' }}>
              {jobs.map(job => (
                // Each card links to /jobs/:id — the detail page we build next
                <Link key={job.id} to={`/jobs/${job.id}`} className="job-link">
                  <JobCard job={job} />
                </Link>
              ))}
            </div>
          )}

          {/* ── Pagination Controls ──────────────────────────────────────── */}
          {totalPages > 1 && (
            <div style={styles.pagination}>
              <button
                style={page === 1 ? styles.pageButtonDisabled : styles.pageButton}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || isFetching}
              >
                ← Previous
              </button>

              <span style={styles.pageInfo}>
                Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                {pagination.total ? ` · ${pagination.total} total` : ''}
              </span>

              <button
                style={!hasNextPage ? styles.pageButtonDisabled : styles.pageButton}
                onClick={() => setPage(p => p + 1)}
                disabled={!hasNextPage || isFetching}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page: {
    maxWidth: '860px',
    margin: '0 auto',
    padding: '2rem 1.5rem',
    fontFamily: '"Inter", system-ui, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.5rem',
  },
  heading: {
    margin: 0,
    fontSize: '1.8rem',
    fontWeight: 800,
    color: '#0f172a',
  },
  subheading: {
    margin: '4px 0 0',
    color: '#64748b',
    fontSize: '0.9rem',
  },
  fetchingBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.8rem',
    color: '#6366f1',
    background: '#eef2ff',
    padding: '6px 12px',
    borderRadius: '999px',
    fontWeight: 500,
  },
  fetchingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#6366f1',
    animation: 'pulse 1s ease-in-out infinite',
  },
  filterBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem',
    alignItems: 'flex-end',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1rem 1.25rem',
    marginBottom: '1.5rem',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  filterLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  typingHint: {
    color: '#6366f1',
    fontWeight: 500,
    textTransform: 'none',
    letterSpacing: 0,
  },
  searchWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '10px',
    fontSize: '0.85rem',
    pointerEvents: 'none',
  },
  searchInput: {
    padding: '0.5rem 0.8rem 0.5rem 2rem',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    background: '#fff',
    fontSize: '0.875rem',
    color: '#1e293b',
    width: '100%',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  select: {
    padding: '0.5rem 0.8rem',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    background: '#fff',
    fontSize: '0.875rem',
    color: '#1e293b',
    outline: 'none',
    cursor: 'pointer',
    minWidth: '150px',
  },
  clearBtn: {
    alignSelf: 'flex-end',
    padding: '0.5rem 0.9rem',
    borderRadius: '8px',
    border: '1px solid #fecaca',
    background: '#fff',
    color: '#dc2626',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  jobList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  errorBox: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'flex-start',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '14px',
    padding: '1.5rem',
  },
  errorIcon: { fontSize: '2rem' },
  emptyState: {
    textAlign: 'center',
    padding: '4rem 2rem',
    background: '#f8fafc',
    borderRadius: '14px',
    border: '1px dashed #cbd5e1',
  },
  emptyIcon: { fontSize: '2.5rem', marginBottom: '0.75rem' },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1.25rem',
    marginTop: '0.5rem',
  },
  pageButton: {
    padding: '0.6rem 1.25rem',
    borderRadius: '8px',
    border: '1px solid #6366f1',
    background: '#fff',
    color: '#6366f1',
    fontWeight: 600,
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'background 0.2s, color 0.2s',
  },
  pageButtonDisabled: {
    padding: '0.6rem 1.25rem',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    color: '#cbd5e1',
    fontWeight: 600,
    fontSize: '0.875rem',
    cursor: 'not-allowed',
  },
  pageInfo: {
    fontSize: '0.875rem',
    color: '#64748b',
    minWidth: '160px',
    textAlign: 'center',
  },
}

export default JobsListPage
