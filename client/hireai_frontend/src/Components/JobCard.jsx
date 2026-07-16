/**
 * ============================================================
 * JobCard.jsx — Presentational component for a single job
 * ============================================================
 * This component has NO data-fetching logic.
 * It only receives a `job` prop and renders it.
 * This is the "dumb component" pattern — easy to test and reuse.
 * ============================================================
 */

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

const JobCard = ({ job }) => {
  const jobType = JOB_TYPE_COLORS[job.job_type] ?? { bg: '#f1f5f9', text: '#475569', label: job.job_type }
  const status  = STATUS_COLORS[job.status]     ?? { bg: '#f1f5f9', text: '#475569' }

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
      {postedDate && (
        <p style={styles.date}>Posted {postedDate}</p>
      )}
    </article>
  )
}

const styles = {
  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: '1.25rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    transition: 'box-shadow 0.2s, transform 0.2s',
    cursor: 'default',
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
    fontSize: '1.05rem',
    fontWeight: 700,
    color: '#0f172a',
    lineHeight: 1.3,
  },
  company: {
    margin: '4px 0 0',
    fontSize: '0.875rem',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  companyIcon: { fontSize: '0.8rem' },
  badge: {
    padding: '3px 10px',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'capitalize',
    flexShrink: 0,
  },
  meta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.6rem',
    alignItems: 'center',
  },
  metaItem: {
    fontSize: '0.82rem',
    color: '#475569',
    background: '#f8fafc',
    padding: '3px 10px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
  },
  typeBadge: {
    fontSize: '0.8rem',
    fontWeight: 600,
    padding: '3px 10px',
    borderRadius: '6px',
  },
  description: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#64748b',
    lineHeight: 1.6,
    borderTop: '1px solid #f1f5f9',
    paddingTop: '0.75rem',
  },
  date: {
    margin: 0,
    fontSize: '0.78rem',
    color: '#94a3b8',
  },
}

export default JobCard
