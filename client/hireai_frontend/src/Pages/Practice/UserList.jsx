/**
 * ============================================================
 * EXERCISE 2 — UserList with useQuery
 * ============================================================
 *
 * COMPARE: The old useEffect + fetch pattern required you to:
 *  1. useState({ data: null, loading: true, error: null })
 *  2. A useEffect with a fetch() call inside
 *  3. Manual loading check
 *  4. Manual error check
 *  5. Cleanup / AbortController to avoid stale state on unmount
 *  6. Re-run logic if a dependency changed
 *
 * With useQuery ALL of that disappears. You just describe:
 *  • WHAT to fetch  → queryKey
 *  • HOW to fetch   → queryFn
 * React Query gives you { data, isLoading, isError, error } automatically.
 * ============================================================
 */
import { useQuery } from '@tanstack/react-query'

// ─── Pure fetch function (no state, no hooks, just async/await) ───────────────
// This function is called your "queryFn". It must return a Promise.
// React Query calls it, caches the result, and gives it to your component.
const fetchUsers = async () => {
  const response = await fetch('https://jsonplaceholder.typicode.com/users')

  // React Query does NOT automatically throw on 4xx/5xx — you must do this.
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()  // returns a Promise<User[]>
}

// ─── Component ────────────────────────────────────────────────────────────────
const UserList = () => {
  /**
   * useQuery({ queryKey, queryFn })
   *
   * queryKey: ['users']
   *   • Acts like a cache ID. Any other component that calls useQuery with
   *     the same key gets the SAME cached result — no duplicate network request.
   *   • If the key changes, React Query re-fetches automatically.
   *
   * queryFn: fetchUsers
   *   • The async function to run. React Query manages when to call it:
   *     on mount, when the window regains focus, after staleTime expires, etc.
   *
   * Returned values:
   *   data      → The resolved value from fetchUsers (array of users)
   *   isLoading → true only during the very first fetch (no cached data yet)
   *   isError   → true if queryFn threw an error
   *   error     → the Error object that was thrown
   */
  const { data: users, isLoading, isError, error } = useQuery({
    queryKey: ['users'],   // cache key — must be unique across your app
    queryFn: fetchUsers,   // the function to call
  })

  // ── Loading state (auto-managed, no useState needed) ──────────────────────
  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingWrapper}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading users...</p>
        </div>
      </div>
    )
  }

  // ── Error state (auto-managed, no try/catch needed in the component) ───────
  if (isError) {
    return (
      <div style={styles.container}>
        <div style={styles.errorBox}>
          <span>⚠️</span>
          <p>Error: {error.message}</p>
        </div>
      </div>
    )
  }

  // ── Success state — data is guaranteed to be defined here ──────────────────
  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>👥 Users (via useQuery)</h2>
      <p style={styles.subtext}>
        Fetched {users.length} users with <strong>zero</strong> manual
        loading/error state. React Query handled everything.
      </p>

      <ul style={styles.list}>
        {users.map(user => (
          <li key={user.id} style={styles.card}>
            <div style={styles.avatar}>{user.name.charAt(0)}</div>
            <div>
              <p style={styles.name}>{user.name}</p>
              <p style={styles.email}>{user.email}</p>
              <p style={styles.company}>🏢 {user.company.name}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Inline styles (no CSS file needed for exercise) ──────────────────────────
const styles = {
  container: {
    maxWidth: '640px',
    margin: '2rem auto',
    padding: '1rem',
    fontFamily: 'Inter, sans-serif',
  },
  heading: {
    color: '#1e293b',
    marginBottom: '0.5rem',
  },
  subtext: {
    color: '#64748b',
    marginBottom: '1.5rem',
    fontSize: '0.9rem',
  },
  loadingWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
    padding: '4rem',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #6366f1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: { color: '#64748b' },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '1rem',
    color: '#dc2626',
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1rem',
  },
  avatar: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '1.1rem',
    flexShrink: 0,
  },
  name: { fontWeight: 600, color: '#1e293b', margin: 0 },
  email: { color: '#64748b', fontSize: '0.85rem', margin: '2px 0' },
  company: { color: '#94a3b8', fontSize: '0.8rem', margin: 0 },
}

export default UserList
