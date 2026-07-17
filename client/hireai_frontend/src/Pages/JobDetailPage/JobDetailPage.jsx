/**
 * ============================================================
 * JobDetailPage.jsx — Step 2 of the Project Task
 * ============================================================
 *
 * WHAT THIS PAGE DOES
 * ────────────────────
 * Fetches and displays a single job by its ID using React Query.
 * Provides a fully-functional "Apply" button that:
 *   1. Opens a small modal form with a FileUploadInput for the resume
 *   2. Uses useMutation to POST to /api/jobs/:jobId/apply as multipart/form-data
 *   3. On success, invalidates ['myApplications'] cache and shows a
 *      disabled "Applied ✓" button so the user can't double-apply.
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
 * 4. useMutation for the Apply flow
 *    - mutationFn receives (jobId, resumeFile) and POSTs FormData
 *    - onSuccess → invalidate ['myApplications'] so that page reflects
 *      the new application if the user navigates there
 *    - isSuccess persists after the mutation completes, giving us a
 *      permanent "Applied ✓" state without extra local state
 *
 * 5. FormData + Content-Type gotcha
 *    We pass FormData directly to axios. The browser sets Content-Type
 *    automatically, including the critical `boundary` string. Setting
 *    Content-Type manually breaks multipart parsing on the server.
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
import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getJobById, applyToJob } from '../../services/jobService'
import FileUploadInput from '../../Components/FileUploadInput'

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

// ─── Apply Modal ───────────────────────────────────────────────────────────────
/**
 * ApplyModal
 * ──────────
 * A lightweight "sheet" modal that slides up from the bottom of the apply
 * section. It contains:
 *   • FileUploadInput — drag-and-drop resume picker
 *   • Submit button wired to mutate()
 *   • Cancel button
 *   • Error display from useMutation
 *
 * PROPS
 * ─────
 *   jobTitle    — displayed in the heading
 *   onClose()   — called when the modal should hide
 *   onSubmit(f) — called with the selected File when form is submitted
 *   isLoading   — disables the form while the mutation is in-flight
 *   error       — axios error object from useMutation, shown below the form
 */
const ApplyModal = ({ jobTitle, onClose, onSubmit, isLoading, error }) => {
  const [resumeFile, setResumeFile] = useState(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(resumeFile)
  }

  // Friendly error message extraction
  const errorMsg =
    error?.response?.data?.message ||
    error?.message ||
    'Something went wrong. Please try again.'

  return (
    /* ── Backdrop ─────────────────────────────────────────────────────────── */
    <div
      id="apply-modal-backdrop"
      style={modal.backdrop}
      onClick={(e) => e.target === e.currentTarget && !isLoading && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="apply-modal-title"
    >
      <div style={modal.sheet}>
        {/* Header */}
        <div style={modal.header}>
          <div>
            <h2 id="apply-modal-title" style={modal.title}>Apply for this role</h2>
            <p style={modal.subtitle}>{jobTitle}</p>
          </div>
          <button
            id="apply-modal-close-btn"
            style={modal.closeBtn}
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close application form"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div style={modal.section}>
            <label style={modal.label} htmlFor="resume-upload-zone">
              Resume <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <FileUploadInput
              onFileSelect={setResumeFile}
              selectedFile={resumeFile}
              disabled={isLoading}
            />
            <p style={modal.hint}>
              Your resume will be sent to the recruiter for review.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={modal.errorBox} role="alert">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div style={modal.actions}>
            <button
              id="apply-cancel-btn"
              type="button"
              style={modal.cancelBtn}
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              id="apply-submit-btn"
              type="submit"
              style={{
                ...modal.submitBtn,
                ...(isLoading || !resumeFile ? modal.submitBtnDisabled : {}),
              }}
              disabled={isLoading || !resumeFile}
            >
              {isLoading ? (
                <>
                  <span style={modal.spinner} /> Submitting…
                </>
              ) : (
                '✉️ Submit Application'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const modal = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.45)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '0',
  },
  sheet: {
    background: '#fff',
    borderRadius: '20px 20px 0 0',
    padding: '1.75rem 1.75rem 2rem',
    width: '100%',
    maxWidth: '560px',
    boxShadow: '0 -8px 40px rgba(15, 23, 42, 0.15)',
    fontFamily: '"Inter", system-ui, sans-serif',
    animation: 'slideUp 0.25s ease',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.25rem',
  },
  title: {
    margin: 0,
    fontSize: '1.15rem',
    fontWeight: 800,
    color: '#0f172a',
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: '0.85rem',
    color: '#64748b',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.1rem',
    color: '#94a3b8',
    padding: '4px 6px',
    borderRadius: '6px',
  },
  section: {
    marginBottom: '1rem',
  },
  label: {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 700,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.5rem',
  },
  hint: {
    margin: '0.5rem 0 0',
    fontSize: '0.775rem',
    color: '#94a3b8',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    fontSize: '0.85rem',
    color: '#dc2626',
    marginBottom: '1rem',
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'flex-end',
    marginTop: '1.25rem',
  },
  cancelBtn: {
    padding: '0.65rem 1.25rem',
    background: '#fff',
    color: '#475569',
    border: '1px solid #cbd5e1',
    borderRadius: '9px',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0.65rem 1.5rem',
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '9px',
    fontSize: '0.875rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 0.2s, opacity 0.2s',
  },
  submitBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  spinner: {
    display: 'inline-block',
    width: '14px',
    height: '14px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
}

// ─── Main Component ────────────────────────────────────────────────────────────
const JobDetailPage = () => {
  /**
   * useParams extracts route parameters from the URL.
   * For the route /jobs/:id, visiting /jobs/42 gives us: { id: '42' }
   */
  const { id: jobId } = useParams()

  // Controls modal visibility
  const [showModal, setShowModal] = useState(false)

  /**
   * useQueryClient gives us access to the shared QueryClient instance,
   * so we can call invalidateQueries() after a successful mutation.
   */
  const queryClient = useQueryClient()

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

  /**
   * ─── useMutation — Apply Flow ─────────────────────────────────────────────
   *
   * mutationFn: receives the resumeFile, posts FormData to the server.
   *
   * onSuccess:
   *   1. invalidateQueries(['myApplications']) — marks any cached "my
   *      applications" list as stale. Next time the user visits that page,
   *      React Query will automatically refetch and include this new entry.
   *   2. Closes the modal.
   *
   * isSuccess:
   *   Stays true permanently after a successful mutation (unlike isLoading
   *   which resets). We use this to flip the button to "Applied ✓" forever.
   *
   * isError / error:
   *   Passed into ApplyModal to surface the server's error message.
   */
  const {
    mutate,
    isPending,
    isSuccess: hasApplied,
    isError:   isApplyError,
    error:     applyError,
  } = useMutation({
    mutationFn: (resumeFile) => applyToJob(jobId, resumeFile),

    onSuccess: () => {
      /**
       * invalidateQueries marks ALL queries whose key starts with
       * ['myApplications'] as stale. The next mount of the
       * "My Applications" page will trigger a fresh fetch.
       */
      queryClient.invalidateQueries({ queryKey: ['myApplications'] })
      setShowModal(false)
    },
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
        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        #apply-btn:hover:not(:disabled) {
          background: #4f46e5;
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.35);
        }
        #apply-btn:active:not(:disabled) {
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
                Behaviour matrix:
                  job.status !== 'open'  → show "position closed" notice
                  hasApplied             → show disabled "Applied ✓" button
                  otherwise              → show active "Apply Now" button
                ─────────────────────────────────────────────────────────────── */}
            <div style={styles.applySection}>
              {job.status === 'open' ? (
                <>
                  {hasApplied ? (
                    /* ── Success state: permanent "Applied ✓" ──────────────── */
                    <div style={styles.appliedBadge}>
                      <span style={{ fontSize: '1.25rem' }}>✅</span>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, color: '#166534' }}>
                          Application Submitted!
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#15803d' }}>
                          You've applied to this job. Good luck!
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* ── Default: "Apply Now" opens modal ──────────────────── */
                    <button
                      id="apply-btn"
                      style={styles.applyBtn}
                      onClick={() => setShowModal(true)}
                      aria-label={`Apply for ${job.title} at ${job.company}`}
                    >
                      ✉️ Apply Now
                    </button>
                  )}
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

      {/* ── Apply Modal (rendered outside the card for z-index reasons) ────── */}
      {showModal && job && (
        <ApplyModal
          jobTitle={`${job.title} at ${job.company}`}
          onClose={() => setShowModal(false)}
          onSubmit={(file) => mutate(file)}
          isLoading={isPending}
          error={isApplyError ? applyError : null}
        />
      )}
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
    cursor: 'pointer',
    transition: 'background 0.2s, transform 0.15s, box-shadow 0.2s',
    letterSpacing: '0.01em',
  },
  appliedBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '12px',
    padding: '0.875rem 1.25rem',
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
