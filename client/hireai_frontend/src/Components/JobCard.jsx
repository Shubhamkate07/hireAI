/**
 * ============================================================
 * JobCard.jsx — Presentational component for a single job
 * ============================================================
 * This component has NO data-fetching logic.
 * It only receives a `job` prop and renders it.
 * This is the "dumb component" pattern — easy to test and reuse.
 *
 * OPTIMIZATION: Wrapped in React.memo
 *   React.memo makes React skip re-rendering this component if
 *   its props did not change. So if the parent (JobsListPage)
 *   re-renders because the user typed something in the search
 *   box, but this specific card's `job` data is identical,
 *   React will reuse the last rendered output and skip the work.
 * ============================================================
 */
import { memo } from 'react'

const JOB_TYPE_COLORS = {
  remote: { bg: 'rgba(59, 130, 246, 0.12)', text: '#60a5fa', label: '🌐 Remote' },
  onsite: { bg: 'rgba(34, 197, 94, 0.12)', text: '#4ade80', label: '🏢 On-site' },
  hybrid: { bg: 'rgba(168, 85, 247, 0.12)', text: '#c084fc', label: '🔀 Hybrid' },
  contract: { bg: 'rgba(249, 115, 22, 0.12)', text: '#fb923c', label: '📝 Contract' },
  internship: { bg: 'rgba(236, 72, 153, 0.12)', text: '#f472b6', label: '🎓 Internship' },
}

const STATUS_COLORS = {
  open: { bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80' },
  closed: { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171' },
  paused: { bg: 'rgba(234, 179, 8, 0.15)', text: '#fde047' },
}

const JobCard = ({ job, onApply }) => {
  const jobType = JOB_TYPE_COLORS[job.job_type] ?? { bg: '#f1f5f9', text: '#475569', label: job.job_type }
  const status = STATUS_COLORS[job.status] ?? { bg: '#f1f5f9', text: '#475569' }

  const formatSalary = (min, max) => {
    if (!min && !max) return null
    const fmt = n => `$${Number(n).toLocaleString()}`
    if (min && max) return `${fmt(min)} – ${fmt(max)}`
    if (min) return `From ${fmt(min)}`
    return `Up to ${fmt(max)}`
  }

  const salary = formatSalary(job.salary_min, job.salary_max)

  // Format the date to "Jul 14, 2026" style
  const postedDate = job.created_at
    ? new Date(job.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <article style={styles.card}>
      {/* Header row */}
      <div style={styles.header}>
        <div style={styles.titleWrap}>
          <h3 style={styles.title}>{job.title}</h3>
          <p style={styles.company}>
            <span style={styles.companyIcon}>🏢</span>
            {job.company}
          </p>
        </div>

        {/* Status badge */}
        <span style={{ ...styles.badge, background: status.bg, color: status.text }}>
          {job.status}
        </span>
      </div>

      {/* Meta row */}
      <div style={styles.meta}>
        {job.location && (
          <span style={styles.metaItem}>
            📍 {job.location}
          </span>
        )}

        <span style={{ ...styles.typeBadge, background: jobType.bg, color: jobType.text }}>
          {jobType.label}
        </span>

        {salary && (
          <span style={styles.metaItem}>
            💰 {salary}
          </span>
        )}
      </div>

      {/* Description snippet */}
      {job.description && (
        <p style={styles.description}>
          {job.description.length > 150
            ? job.description.slice(0, 150) + '…'
            : job.description}
        </p>
      )}

      {/* Footer */}
      <div style={styles.footer}>
        {postedDate && (
          <p style={styles.date}>Posted {postedDate}</p>
        )}
        {onApply && (
          <button style={styles.applyBtn} onClick={(e) => { e.preventDefault(); onApply(job); }}>
            Apply
          </button>
        )}
      </div>
    </article>
  )
}

const styles = {
  card: {
    background: '#111520',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '14px',
    padding: '1.25rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
    transition: 'box-shadow 0.2s, transform 0.2s, border-color 0.2s',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
  },
  titleWrap: { flex: 1 },
  title: {
    margin: 0,
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#f8fafc',
    lineHeight: 1.3,
  },
  company: {
    margin: '4px 0 0',
    fontSize: '0.875rem',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  companyIcon: { fontSize: '0.85rem' },
  badge: {
    padding: '4px 12px',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'capitalize',
    letterSpacing: '0.04em',
    flexShrink: 0,
  },
  meta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.65rem',
    alignItems: 'center',
  },
  metaItem: {
    fontSize: '0.82rem',
    color: '#cbd5e1',
    background: 'rgba(255, 255, 255, 0.04)',
    padding: '4px 12px',
    borderRadius: '6px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  typeBadge: {
    fontSize: '0.8rem',
    fontWeight: 600,
    padding: '4px 12px',
    borderRadius: '6px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  description: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#94a3b8',
    lineHeight: 1.6,
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
    paddingTop: '0.75rem',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
  },
  date: {
    margin: 0,
    fontSize: '0.78rem',
    color: '#64748b',
  },
  applyBtn: {
    padding: '6px 16px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '0.82rem',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
    transition: 'all 0.15s ease',
  },
}

// React.memo wraps the component here at the export point.
// The name 'JobCard' is preserved so React DevTools still shows it correctly.
export default memo(JobCard)
