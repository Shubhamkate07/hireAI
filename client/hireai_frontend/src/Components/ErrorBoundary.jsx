/**
 * ============================================================
 * ErrorBoundary.jsx
 * ============================================================
 *
 * WHY a class component?
 * ──────────────────────
 * React's error boundary API (`componentDidCatch` + `getDerivedStateFromError`)
 * is only available on class components. There is no hooks equivalent.
 * This is one of the few cases where a class component is still required in
 * modern React.
 *
 * HOW IT WORKS
 * ────────────
 * When any child component throws during rendering, React unwinds the tree
 * up to the nearest ErrorBoundary. getDerivedStateFromError() captures the
 * error and sets `hasError: true`, causing the fallback UI to render instead
 * of the crashed subtree.
 *
 * USAGE
 * ─────
 *   // Wrap a page or subtree:
 *   <ErrorBoundary>
 *     <JobsListPage />
 *   </ErrorBoundary>
 *
 *   // With a custom fallback:
 *   <ErrorBoundary fallback={<p>Custom error message</p>}>
 *     <SomeComponent />
 *   </ErrorBoundary>
 *
 * NOTE: ErrorBoundaries do NOT catch:
 *   • Errors inside event handlers (use try/catch there)
 *   • Async errors (React Query handles those itself)
 *   • Errors in the boundary itself
 * ============================================================
 */
import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
    this.handleReset = this.handleReset.bind(this)
  }

  /**
   * getDerivedStateFromError is called during the render phase.
   * Return the new state — do NOT perform side effects here.
   */
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  /**
   * componentDidCatch is called during the commit phase.
   * Good place for logging to an error reporting service (Sentry, etc.)
   */
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Uncaught render error:', error, info.componentStack)
  }

  /** Reset state to let the user retry rendering the failed subtree. */
  handleReset() {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      // ── Custom fallback prop takes priority ────────────────────────────────
      if (this.props.fallback) {
        return this.props.fallback
      }

      // ── Default fallback UI ────────────────────────────────────────────────
      return (
        <div style={styles.wrap}>
          <div style={styles.card}>
            <div style={styles.iconWrap}>
              <span style={styles.icon}>💥</span>
            </div>
            <h2 style={styles.title}>Something went wrong</h2>
            <p style={styles.subtitle}>
              An unexpected error occurred while rendering this section.
            </p>
            {this.state.error?.message && (
              <pre style={styles.detail}>
                {this.state.error.message}
              </pre>
            )}
            <div style={styles.actions}>
              <button
                id="error-boundary-retry-btn"
                style={styles.retryBtn}
                onClick={this.handleReset}
              >
                🔄 Try Again
              </button>
              <button
                id="error-boundary-reload-btn"
                style={styles.reloadBtn}
                onClick={() => window.location.reload()}
              >
                ↺ Reload Page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  wrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '40vh',
    padding: '2rem',
    fontFamily: '"Inter", system-ui, sans-serif',
  },
  card: {
    maxWidth: '480px',
    width: '100%',
    background: '#fff',
    border: '1px solid #fecaca',
    borderRadius: '16px',
    padding: '2.5rem',
    textAlign: 'center',
    boxShadow: '0 4px 24px rgba(220, 38, 38, 0.08)',
  },
  iconWrap: {
    marginBottom: '1rem',
  },
  icon: {
    fontSize: '3rem',
    lineHeight: 1,
  },
  title: {
    margin: '0 0 0.5rem',
    fontSize: '1.35rem',
    fontWeight: 800,
    color: '#991b1b',
  },
  subtitle: {
    margin: '0 0 1rem',
    fontSize: '0.9rem',
    color: '#64748b',
    lineHeight: 1.6,
  },
  detail: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    fontSize: '0.8rem',
    color: '#dc2626',
    textAlign: 'left',
    overflow: 'auto',
    marginBottom: '1.25rem',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  retryBtn: {
    padding: '0.6rem 1.4rem',
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  reloadBtn: {
    padding: '0.6rem 1.4rem',
    background: '#fff',
    color: '#475569',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
}

export default ErrorBoundary
