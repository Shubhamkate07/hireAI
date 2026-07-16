/**
 * Practice Page — Exercises 2 & 3 in one place
 * Route: /practice  (public, no auth needed)
 */
import UserList from './UserList'
import CreatePostForm from './CreatePostForm'

const PracticePage = () => {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      padding: '2rem 1rem',
      fontFamily: '"Inter", system-ui, sans-serif',
    }}>
      <div style={{ maxWidth: '640px', margin: '0 auto 3rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          borderRadius: '16px',
          padding: '2rem',
          color: '#fff',
          marginBottom: '2rem',
          textAlign: 'center',
        }}>
          <h1 style={{ margin: 0, fontSize: '1.75rem' }}>🚀 React Query Practice</h1>
          <p style={{ margin: '8px 0 0', opacity: 0.85 }}>
            Exercises 2 (useQuery) & 3 (useMutation)
          </p>
          <p style={{ margin: '12px 0 0', fontSize: '0.85rem', opacity: 0.7 }}>
            Open React Query Devtools (bottom-right ⚛️ button) to watch the cache!
          </p>
        </div>

        {/* Exercise 2 — useQuery */}
        <UserList />

        <div style={{ height: '2rem' }} />

        {/* Exercise 3 — useMutation */}
        <CreatePostForm />
      </div>
    </div>
  )
}

export default PracticePage
