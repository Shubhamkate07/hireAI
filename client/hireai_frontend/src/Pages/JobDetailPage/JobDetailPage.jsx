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
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import BackButton from '../../Components/BackButton'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getJobById, applyToJob, getMyApplications } from '../../services/jobService'
import { getAssessmentByJobId } from '../../services/assessmentService'
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

  const user = useSelector((state) => state.auth?.user)
  const isRecruiterOrAdmin = user?.role === 'recruiter' || user?.role === 'admin'

  // Query candidate's applications so we know if already applied even on page refresh
  const { data: myApps } = useQuery({
    queryKey: ['myApplications'],
    queryFn: getMyApplications,
    enabled: user?.role === 'candidate',
    staleTime: 1000 * 60,
  })

  // ── Check if this job has an assessment ──────────────────────────────────
  // GET /api/assessments/by-job/:jobId
  // Returns { id, title, time_limit_minutes, candidate_status, remaining_seconds, candidate_score } or null.
  // We use this to show or hide the "Take Assessment" button and track attempt state.
  // enabled: !!jobId ensures the query only runs once jobId is available.
  const { data: jobAssessment } = useQuery({
    queryKey: ['job-assessment', jobId],
    queryFn:  () => getAssessmentByJobId(jobId),
    enabled:  !!jobId,
    staleTime: 5000,  // 5 seconds so status refreshes quickly upon returning
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

  // Candidate application status: true if just submitted OR already in their applications list
  const alreadyApplied = hasApplied || (myApps || []).some(app => Number(app.job_id) === Number(jobId))

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
      `}</style>

      {/* ── Back button ── */}
      <BackButton to="/jobs" label="Back to Jobs" />

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

            {/* ── Apply & Assessment Section ──────────────────────────────────
                Behaviour matrix:
                  job.status !== 'open'  → show "position closed" notice
                  isRecruiterOrAdmin     → show role info banner & manage buttons (no candidate test)
                  candidate:
                    alreadyApplied       → show permanent "Applied ✓" badge
                    otherwise            → show active "Apply Now" button
                    assessment:
                      'completed'        → show "🎯 Assessment Completed" score badge + leaderboard
                      'in_progress'      → show "⏱ Resume Assessment" button + leaderboard
                      'not_started'      → show "📝 Take Assessment" button + leaderboard
                ─────────────────────────────────────────────────────────────── */}
            <div style={styles.applySection}>
              {job.status === 'open' ? (
                <>
                  {isRecruiterOrAdmin ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                      <div style={{ ...styles.appliedBadge, background: '#f8fafc', borderColor: '#cbd5e1' }}>
                        <span style={{ fontSize: '1.25rem' }}>ℹ️</span>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, color: '#334155' }}>
                            Viewing as {user?.role}
                          </p>
                          <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                            Candidate application submissions and quiz attempts are reserved for applicants.
                          </p>
                        </div>
                      </div>

                      {/* Recruiter / Admin assessment management */}
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {jobAssessment ? (
                          <>
                            <Link
                              to={user?.role === 'admin' ? `/admin/assessments/${jobAssessment.id}` : `/recruiter/assessments/${jobAssessment.id}/edit`}
                              style={{ ...styles.assessmentBtn, background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
                            >
                              ⚙️ Manage Assessment
                              <span style={styles.assessmentMeta}>
                                {jobAssessment.title} · {jobAssessment.time_limit_minutes} min
                              </span>
                            </Link>

                            <Link
                              to={`/assessments/${jobAssessment.id}/leaderboard`}
                              style={styles.leaderboardBtn}
                            >
                              🏆 Leaderboard
                              <span style={styles.assessmentMeta}>
                                View candidate rankings
                              </span>
                            </Link>
                          </>
                        ) : (
                          <Link
                            to={`/recruiter/assessments/new?job_id=${jobId}`}
                            style={{ ...styles.assessmentBtn, background: 'linear-gradient(135deg, #0284c7, #0369a1)' }}
                          >
                            ➕ Create Assessment
                            <span style={styles.assessmentMeta}>
                              Design screening quiz for this role
                            </span>
                          </Link>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* ── Candidate View: Action Center ── */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                      
                      {/* Step 1: Application Box */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '16px',
                        padding: '16px 20px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '14px',
                      }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1rem' }}>📄</span>
                            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#f1f5f9' }}>
                              Step 1: Application Submission
                            </h3>
                          </div>
                          <p style={{ margin: '4px 0 0 24px', fontSize: '0.82rem', color: '#94a3b8' }}>
                            {alreadyApplied
                              ? 'Your resume has been submitted and is under review.'
                              : 'Submit your resume and candidate details to apply for this position.'}
                          </p>
                        </div>

                        <div>
                          {alreadyApplied ? (
                            <div style={styles.appliedBadge}>
                              <span style={{ fontSize: '1.15rem' }}>✅</span>
                              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#34d399' }}>
                                Application Submitted
                              </span>
                            </div>
                          ) : (
                            <button
                              id="apply-btn"
                              style={styles.applyBtn}
                              onClick={() => setShowModal(true)}
                              aria-label={`Apply for ${job.title} at ${job.company}`}
                            >
                              ✉️ Apply Now
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Step 2: Assessment & Leaderboard Box */}
                      {jobAssessment && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '16px',
                          padding: '16px 20px',
                          background: 'rgba(99, 102, 241, 0.05)',
                          border: '1px solid rgba(99, 102, 241, 0.2)',
                          borderRadius: '14px',
                        }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '1rem' }}>🧠</span>
                              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#f1f5f9' }}>
                                Step 2: Technical Screening Assessment
                              </h3>
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '999px',
                                background: jobAssessment.candidate_status === 'completed'
                                  ? 'rgba(52, 211, 153, 0.15)'
                                  : jobAssessment.candidate_status === 'in_progress'
                                  ? 'rgba(251, 191, 36, 0.15)'
                                  : 'rgba(99, 102, 241, 0.15)',
                                color: jobAssessment.candidate_status === 'completed'
                                  ? '#34d399'
                                  : jobAssessment.candidate_status === 'in_progress'
                                  ? '#fbbf24'
                                  : '#818cf8',
                                border: '1px solid currentColor',
                              }}>
                                {jobAssessment.candidate_status === 'completed'
                                  ? 'Completed'
                                  : jobAssessment.candidate_status === 'in_progress'
                                  ? 'In Progress'
                                  : `${jobAssessment.time_limit_minutes} Mins`}
                              </span>
                            </div>
                            <p style={{ margin: '4px 0 0 24px', fontSize: '0.82rem', color: '#94a3b8' }}>
                              {jobAssessment.title} · Tests core competency for this role.
                            </p>
                          </div>

                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {jobAssessment.candidate_status === 'completed' ? (
                              <div id="assessment-completed-badge" style={styles.completedBadge}>
                                <span>🎯 Score: <strong>{jobAssessment.candidate_score ?? 0} pts</strong></span>
                              </div>
                            ) : jobAssessment.candidate_status === 'in_progress' ? (
                              <Link
                                id="resume-assessment-btn"
                                to={`/assessments/${jobAssessment.id}`}
                                style={styles.resumeBtn}
                              >
                                ⏱ Resume Quiz (~{Math.max(1, Math.ceil((jobAssessment.remaining_seconds || 60) / 60))}m left)
                              </Link>
                            ) : (
                              <Link
                                id="take-assessment-btn"
                                to={`/assessments/${jobAssessment.id}`}
                                style={styles.assessmentBtn}
                              >
                                📝 Take Assessment
                              </Link>
                            )}

                            <Link
                              id="view-leaderboard-btn"
                              to={`/assessments/${jobAssessment.id}/leaderboard`}
                              style={styles.leaderboardBtn}
                            >
                              🏆 Leaderboard
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
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
    maxWidth: '860px',
    margin: '0 auto',
    padding: '2.5rem 1.5rem',
    fontFamily: '"Inter", system-ui, sans-serif',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '1.5rem',
    fontSize: '0.875rem',
    color: '#818cf8',
    textDecoration: 'none',
    fontWeight: 600,
    transition: 'color 0.15s',
  },
  card: {
    background: 'var(--color-surface, #111520)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '20px',
    padding: '2.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1.25rem',
  },
  title: {
    margin: 0,
    fontSize: '1.85rem',
    fontWeight: 800,
    color: '#f8fafc',
    lineHeight: 1.25,
    letterSpacing: '-0.02em',
  },
  company: {
    margin: '8px 0 0',
    fontSize: '1.05rem',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: 500,
  },
  badge: {
    padding: '5px 14px',
    borderRadius: '999px',
    fontSize: '0.8rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    flexShrink: 0,
    alignSelf: 'flex-start',
    marginTop: '4px',
  },
  meta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
    alignItems: 'center',
  },
  chip: {
    fontSize: '0.85rem',
    color: '#cbd5e1',
    background: 'rgba(255, 255, 255, 0.04)',
    padding: '6px 14px',
    borderRadius: '999px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    fontWeight: 500,
  },
  divider: {
    border: 'none',
    borderTop: '1px solid rgba(255, 255, 255, 0.07)',
    margin: '0.5rem 0',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '1.05rem',
    fontWeight: 700,
    color: '#f1f5f9',
    letterSpacing: '-0.01em',
  },
  description: {
    margin: 0,
    fontSize: '0.95rem',
    color: '#cbd5e1',
    lineHeight: 1.8,
    whiteSpace: 'pre-wrap',
  },
  applySection: {
    marginTop: '0.5rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.07)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '1rem',
  },
  applyBtn: {
    padding: '12px 28px',
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.18s ease',
    boxShadow: '0 4px 16px rgba(99, 102, 241, 0.35)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  },
  appliedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(52, 211, 153, 0.12)',
    border: '1px solid rgba(52, 211, 153, 0.35)',
    borderRadius: '12px',
    padding: '10px 18px',
  },
  completedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(52, 211, 153, 0.12)',
    border: '1px solid rgba(52, 211, 153, 0.35)',
    borderRadius: '10px',
    padding: '10px 18px',
    color: '#34d399',
    fontSize: '0.9rem',
    fontWeight: 600,
  },
  closedNotice: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '0.92rem',
    color: '#94a3b8',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '1rem 1.25rem',
    width: '100%',
  },
  assessmentBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 22px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff',
    borderRadius: '10px',
    fontSize: '0.9rem',
    fontWeight: 700,
    textDecoration: 'none',
    transition: 'all 0.18s ease',
    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
  },
  resumeBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 22px',
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    color: '#fff',
    borderRadius: '10px',
    fontSize: '0.9rem',
    fontWeight: 700,
    textDecoration: 'none',
    transition: 'all 0.18s ease',
    boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
  },
  leaderboardBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    background: 'rgba(251, 191, 36, 0.08)',
    color: '#fbbf24',
    borderRadius: '10px',
    fontSize: '0.9rem',
    fontWeight: 700,
    textDecoration: 'none',
    transition: 'all 0.18s ease',
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
    border: '1px solid rgba(251, 191, 36, 0.35)',
  },
  assessmentMeta: {
    fontSize: '0.78rem',
    fontWeight: 400,
    opacity: 0.85,
  },
  errorBox: {
    display: 'flex',
    gap: '1.25rem',
    alignItems: 'flex-start',
    background: 'rgba(248, 113, 113, 0.08)',
    border: '1px solid rgba(248, 113, 113, 0.3)',
    borderRadius: '16px',
    padding: '1.75rem',
  },
}

export default JobDetailPage
