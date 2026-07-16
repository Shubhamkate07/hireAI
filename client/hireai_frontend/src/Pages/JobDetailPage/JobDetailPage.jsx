/**
 * ============================================================
 * JobDetailPage.jsx — Step 2 of the Project Task
 * ============================================================
 *
 * WHAT THIS PAGE DOES
 * ────────────────────
 * Fetches and displays a single job by its ID using React Query.
 * Provides an "Apply" button (placeholder until the Applications API exists).
 *
 * KEY CONCEPTS DEMONSTRATED
 * ──────────────────────────
 *
 * 1. useParams() — extracts `:id` from the URL (/jobs/42 → jobId = "42")
 *
 * 2. queryKey: ['job', jobId]
 *    Each job has its OWN cache entry keyed by its ID.
 *    ['job', '42'] and ['job', '99'] are completely separate cache entries.
 *    React Query caches the detail page data independently from the list.
 *
 * 3. staleTime: 1000 * 60 (1 minute)
 *    Job details change less frequently than the list.
 *    Navigating away and back within 1 min shows cached data instantly.
 *
 * 4. The "Apply" button is intentionally non-functional here.
 *    It will be wired to POST /api/applications once that API is ready.
 *    The button ID is set so future code can easily target it.
 *
 * ─── CACHE RELATIONSHIP WITH JobsListPage ────────────────────
 *
 * When you're on the jobs list, the cache looks like:
 *   ['jobs', { page: 1, ... }] → { jobs: [...], pagination: {...} }
 *
 * When you navigate to a detail page:
 *   ['job', '42'] → { id: 42, title: '...', ... }
 *
 * These are completely separate. React Query devtools will show both.
 * ============================================================
 */
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getJobById } from '../../services/jobService'

// ─── Sub-components ───────────────────────────────────────────────────────────

const SkeletonDetail = () => (
  <div style={sk.wrap}>
    <div style={{ ...sk.line, width: '60px', height: '14px', marginBottom: '2rem' }} />
    <div style={{ ...sk.line, width: '340px', height: '32px', marginBottom: '12px' }} />
    <div style={{ ...sk.line, width: '200px', height: '18px', marginBottom: '1.5rem' }} />
    <div style={{ display: 'flex', gap: '10px', marginBottom: '2rem' }}>
      <div style={{ ...sk.line, width: '90px', height: '28px' }} />
      <div style={{ ...sk.line, width: '80px', height: '28px' }} />
      <div style={{ ...sk.line, width: '120px', height: '28px' }} />
    </div>
    {[100, 90, 85, 95, 70].map((w, i) => (
      <div key={i} style={{ ...sk.line, width: `${w}%`, height: '14px', marginBottom: '10px' }} />
    ))}
  </div>
)

const sk = {
  wrap: {
    background: '#fff',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    padding: '2.5rem',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  line: {
    background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: '6px',
  },
}

// ─── Badge helpers ─────────────────────────────────────────────────────────────
const JOB_TYPE_COLORS = {
  remote:     { bg: '#eff6ff', text: '#1d4ed8', label: '🌐 Remote' },
  onsite:     { bg: '#f0fdf4', text: '#15803d', label: '🏢 On-site' },
  hybrid:     { bg: '#faf5ff', text: '#7e22ce', label: '🔀 Hybrid' },
  contract:   { bg: '#fff7ed', text: '#c2410c', label: '📝 Contract' },
  internship: { bg: '#fdf4ff', text: '#a21caf', label: '🎓 Internship' },
}

const STATUS_COLORS = {
  open:   { bg: '#dcfce7', text: '#166534' },
  closed: { bg: '#fee2e2', text: '#991b1b' },
  paused: { bg: '#fef9c3', text: '#854d0e' },
}

// ─── Main Component ────────────────────────────────────────────────────────────
const JobDetailPage = () => {
  /**
   * useParams extracts route parameters from the URL.
   * For the route /jobs/:id, visiting /jobs/42 gives us: { id: '42' }
   */
  const { id: jobId } = useParams()

  /**
   * ─── useQuery — Single Job Fetch ────────────────────────────────────────
   *
   * queryKey: ['job', jobId]
   *   The second element is the specific job's ID.
   *   This makes each job detail page its own cache entry, completely
   *   separate from the list cache (['jobs', queryParams]).
   *
   * queryFn: () => getJobById(jobId)
   *   Calls GET /api/jobs/:id and returns the single job object.
   *
   * staleTime: 60 seconds (2× longer than the list)
   *   Job details are less volatile than search results.
   *   If you navigate back to this job within 60s, React Query shows
   *   the cached data instantly without a network request.
   *
   * retry: 2
   *   On network errors, retry twice before showing the error state.
   */
  const {
    data: job,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['job', jobId],
    queryFn:  () => getJobById(jobId),
    staleTime: 1000 * 60,   // 1 minute
    retry: 2,
  })

  // ── Format helpers ─────────────────────────────────────────────────────────
  const formatSalary = (min, max) => {
    if (!min && !max) return null
    const fmt = n => `$${Number(n).toLocaleString()}`
    if (min && max) return `${fmt(min)} – ${fmt(max)}`
    if (min) return `From ${fmt(min)}`
    return `Up to ${fmt(max)}`
  }

  const formatDate = (dateStr) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString('en-US', {
          month: 'long', day: 'numeric', year: 'numeric',
        })
      : null

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
        #apply-btn:hover {
          background: #4f46e5;
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.35);
        }
        #apply-btn:active {
          transform: translateY(0);
        }
        .back-link:hover {
          color: #4f46e5;
        }
      `}</style>

      {/* ── Back button ── */}
      <Link to="/jobs" className="back-link" style={styles.backLink}>
        ← Back to Jobs
      </Link>

      {/* ── Loading ── */}
      {isLoading && <SkeletonDetail />}

      {/* ── Error ── */}
      {isError && (
        <div style={styles.errorBox}>
          <span style={{ fontSize: '2rem' }}>⚠️</span>
          <div>
            <h3 style={{ margin: '0 0 4px', color: '#dc2626' }}>
              {error?.response?.status === 404 ? 'Job not found' : 'Failed to load job'}
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#ef4444' }}>
              {error?.response?.data?.message || error?.message || 'Something went wrong'}
            </p>
            <Link to="/jobs" style={{ ...styles.backLink, marginTop: '12px', display: 'inline-block' }}>
              ← Return to job listings
            </Link>
          </div>
        </div>
      )}

      {/* ── Job detail ── */}
      {!isLoading && !isError && job && (() => {
        const jobType = JOB_TYPE_COLORS[job.job_type] ?? { bg: '#f1f5f9', text: '#475569', label: job.job_type }
        const status  = STATUS_COLORS[job.status]     ?? { bg: '#f1f5f9', text: '#475569' }
        const salary  = formatSalary(job.salary_min, job.salary_max)
        const posted  = formatDate(job.created_at)

        return (
          <div style={styles.card}>

            {/* ── Card Header ── */}
            <div style={styles.cardHeader}>
              <div style={{ flex: 1 }}>
                <h1 style={styles.title}>{job.title}</h1>
                <p style={styles.company}>
                  <span>🏢</span> {job.company}
                </p>
              </div>

              {/* Status badge */}
              <span style={{ ...styles.badge, background: status.bg, color: status.text }}>
                {job.status}
              </span>
            </div>

            {/* ── Meta chips ── */}
            <div style={styles.meta}>
              {job.location && (
                <span style={styles.chip}>📍 {job.location}</span>
              )}
              <span style={{ ...styles.chip, background: jobType.bg, color: jobType.text, fontWeight: 600 }}>
                {jobType.label}
              </span>
              {salary && (
                <span style={styles.chip}>💰 {salary}</span>
              )}
              {posted && (
                <span style={styles.chip}>📅 Posted {posted}</span>
              )}
            </div>

            {/* ── Divider ── */}
            <hr style={styles.divider} />

            {/* ── Description ── */}
            {job.description ? (
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>About this role</h2>
                <p style={styles.description}>{job.description}</p>
              </div>
            ) : (
              <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>No description provided.</p>
            )}

            {/* ── Apply Section ─────────────────────────────────────────────────
                The "Apply" button is intentionally non-functional at this stage.
                It will be wired to:
                  POST /api/applications  { jobId, ... }
                once the Applications API is implemented.

                The button is already styled and accessible. Future integration:
                  onClick={() => mutate({ jobId: job.id })}
                where `mutate` comes from useMutation.
                ─────────────────────────────────────────────────────────────── */}
            <div style={styles.applySection}>
              {job.status === 'open' ? (
                <>
                  <button
                    id="apply-btn"
                    style={styles.applyBtn}
                    disabled
                    title="Applications API coming soon"
                    aria-label={`Apply for ${job.title} at ${job.company}`}
                  >
                    ✉️ Apply Now
                  </button>
                  <p style={styles.applyNote}>
                    Applications will open once the backend API is ready.
                  </p>
                </>
              ) : (
                <div style={styles.closedNotice}>
                  <span>🔒</span>
                  <span>This position is <strong>{job.status}</strong> and not accepting applications.</span>
                </div>
              )}
            </div>

          </div>
        )
      })()}
    </div>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page: {
    maxWidth: '820px',
    margin: '0 auto',
    padding: '2rem 1.5rem',
    fontFamily: '"Inter", system-ui, sans-serif',
  },
  backLink: {
    display: 'inline-block',
    marginBottom: '1.5rem',
    fontSize: '0.875rem',
    color: '#6366f1',
    textDecoration: 'none',
    fontWeight: 500,
    transition: 'color 0.15s',
  },
  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '2.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    boxShadow: '0 1px 8px rgba(15, 23, 42, 0.06)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
  },
  title: {
    margin: 0,
    fontSize: '1.75rem',
    fontWeight: 800,
    color: '#0f172a',
    lineHeight: 1.25,
  },
  company: {
    margin: '6px 0 0',
    fontSize: '1rem',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  badge: {
    padding: '4px 12px',
    borderRadius: '999px',
    fontSize: '0.8rem',
    fontWeight: 600,
    textTransform: 'capitalize',
    flexShrink: 0,
    alignSelf: 'flex-start',
    marginTop: '4px',
  },
  meta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.6rem',
    alignItems: 'center',
  },
  chip: {
    fontSize: '0.83rem',
    color: '#475569',
    background: '#f8fafc',
    padding: '5px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  divider: {
    border: 'none',
    borderTop: '1px solid #f1f5f9',
    margin: '0.25rem 0',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: 700,
    color: '#0f172a',
  },
  description: {
    margin: 0,
    fontSize: '0.9375rem',
    color: '#475569',
    lineHeight: 1.75,
    whiteSpace: 'pre-wrap',
  },
  applySection: {
    marginTop: '0.5rem',
    paddingTop: '1.25rem',
    borderTop: '1px solid #f1f5f9',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '0.6rem',
  },
  applyBtn: {
    padding: '0.75rem 2rem',
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'not-allowed',   // will become 'pointer' once enabled
    opacity: 0.7,            // will become 1 once enabled
    transition: 'background 0.2s, transform 0.15s, box-shadow 0.2s',
    letterSpacing: '0.01em',
  },
  applyNote: {
    margin: 0,
    fontSize: '0.8rem',
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  closedNotice: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.9rem',
    color: '#64748b',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '0.75rem 1rem',
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
}

export default JobDetailPage
