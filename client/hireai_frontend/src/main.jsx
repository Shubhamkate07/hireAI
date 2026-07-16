import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'

import { store } from './store/store.js';
import { Provider } from 'react-redux'
import { injectStore } from './services/authEvent.js';
import { checkAuth } from './store/slices/authSlice.js';

// ─── React Query ──────────────────────────────────────────────────────────────
// QueryClient is the in-memory cache brain of React Query.
// We configure it once here and share it across the whole app via QueryClientProvider.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

const queryClient = new QueryClient()

// Give the Axios interceptor a reference to the store
// so it can dispatch clearUser() on any 401 response
injectStore(store);

// Restore session from httpOnly cookie before rendering
store.dispatch(checkAuth());

createRoot(document.getElementById('root')).render(
  // QueryClientProvider makes `queryClient` available to every useQuery/useMutation
  // in the component tree — just like Redux Provider does for the store.
  <QueryClientProvider client={queryClient}>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>

    {/* Exercise 4: React Query Devtools
        Shows a floating panel (bottom-right) to inspect the cache,
        stale/fresh status, background refetches, and query history.
        Only renders in development — tree-shaken out of production builds. */}
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
)
