/**
 * ============================================================
 * EXERCISE 3 — useMutation + Query Invalidation
 * ============================================================
 *
 * useQuery = READ  → fetches data, caches it
 * useMutation = WRITE → sends data, then you decide what to do next
 *
 * Key concept: After a successful mutation (creating a post), you want
 * the ['posts'] list to refresh so users see the new item. You do this
 * by calling queryClient.invalidateQueries({ queryKey: ['posts'] }).
 *
 * "Invalidating" means: mark the cached data as stale → React Query
 * will re-fetch it the next time a component needs it.
 * ============================================================
 */
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

// ─── The mutation function ─────────────────────────────────────────────────────
// Same pattern as queryFn: a plain async function, no hooks.
// It receives whatever you pass to mutate(variables).
const createPost = async ({ title, body }) => {
  const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body, userId: 1 }),
  })

  if (!response.ok) {
    throw new Error('Failed to create post')
  }

  return response.json()  // JSONPlaceholder returns the created object
}

// ─── Component ────────────────────────────────────────────────────────────────
const CreatePostForm = () => {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  /**
   * useQueryClient() gives you direct access to the global QueryClient
   * (the same one created in main.jsx). You use it to invalidate / refetch
   * queries after a mutation succeeds.
   */
  const queryClient = useQueryClient()

  /**
   * useMutation({ mutationFn })
   *
   * Returns an object with:
   *   mutate(variables)   → call this to trigger the mutation (fire-and-forget)
   *   mutateAsync(vars)   → same but returns a Promise (useful with await)
   *   isPending           → true while the request is in-flight
   *   isSuccess           → true after a successful response
   *   isError             → true if the request threw
   *   data                → the resolved value from mutationFn
   *   error               → the Error that was thrown
   *   reset()             → clears success/error state back to idle
   *
   * Lifecycle callbacks:
   *   onSuccess(data, variables, context)
   *   onError(error, variables, context)
   *   onSettled(data, error, variables, context)  ← runs after success OR error
   */
  const mutation = useMutation({
    mutationFn: createPost,

    onSuccess: (newPost) => {
      // After the POST succeeds, mark the ['posts'] query as stale.
      // This causes any mounted component using useQuery(['posts']) to refetch.
      queryClient.invalidateQueries({ queryKey: ['posts'] })

      // Clear the form
      setTitle('')
      setBody('')

      console.log('✅ Post created:', newPost)
    },

    onError: (error) => {
      console.error('❌ Mutation failed:', error.message)
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return

    // Call mutate() with the variables that will be passed to createPost()
    mutation.mutate({ title, body })
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>✏️ Create Post (useMutation)</h2>

      {/* ── Success Banner ── */}
      {mutation.isSuccess && (
        <div style={styles.successBanner} role="alert">
          <span>🎉</span>
          <div>
            <strong>Post created!</strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
              ID: <code>{mutation.data.id}</code> — "{mutation.data.title}"
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', opacity: 0.8 }}>
              The ['posts'] query has been invalidated and will refetch.
            </p>
          </div>
          {/* Let user create another post */}
          <button onClick={() => mutation.reset()} style={styles.resetBtn}>
            ✕
          </button>
        </div>
      )}

      {/* ── Error Banner ── */}
      {mutation.isError && (
        <div style={styles.errorBanner} role="alert">
          <span>⚠️</span>
          <span>{mutation.error.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.group}>
          <label style={styles.label}>Title</label>
          <input
            style={styles.input}
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Enter post title..."
            disabled={mutation.isPending}
          />
        </div>

        <div style={styles.group}>
          <label style={styles.label}>Body</label>
          <textarea
            style={{ ...styles.input, minHeight: '100px', resize: 'vertical' }}
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Write post content..."
            disabled={mutation.isPending}
          />
        </div>

        {/* isPending is true while the network request is in-flight */}
        <button
          type="submit"
          style={mutation.isPending ? styles.btnDisabled : styles.btn}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? '⏳ Submitting...' : '🚀 Create Post'}
        </button>
      </form>
    </div>
  )
}

const styles = {
  container: {
    maxWidth: '520px',
    margin: '2rem auto',
    padding: '1.5rem',
    background: '#fff',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    fontFamily: 'Inter, sans-serif',
  },
  heading: { color: '#1e293b', marginTop: 0, marginBottom: '1.25rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  group: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  label: { fontSize: '0.875rem', fontWeight: 600, color: '#374151' },
  input: {
    padding: '0.65rem 0.9rem',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '0.9rem',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  },
  btn: {
    padding: '0.75rem',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff',
    border: 'none',
    fontWeight: 600,
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  btnDisabled: {
    padding: '0.75rem',
    borderRadius: '8px',
    background: '#c7d2fe',
    color: '#fff',
    border: 'none',
    fontWeight: 600,
    fontSize: '0.95rem',
    cursor: 'not-allowed',
  },
  successBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '10px',
    padding: '0.85rem 1rem',
    marginBottom: '1rem',
    color: '#15803d',
    position: 'relative',
  },
  errorBanner: {
    display: 'flex',
    gap: '0.75rem',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '10px',
    padding: '0.85rem 1rem',
    marginBottom: '1rem',
    color: '#dc2626',
  },
  resetBtn: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#15803d',
    fontWeight: 700,
    fontSize: '1rem',
  },
}

export default CreatePostForm
