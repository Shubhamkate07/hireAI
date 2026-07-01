import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'

import { store } from './store/store.js';
import { Provider } from 'react-redux'
import { injectStore } from './services/authEvent.js';
import { checkAuth } from './store/slices/authSlice.js';

// Give the Axios interceptor a reference to the store
// so it can dispatch clearUser() on any 401 response
injectStore(store);

// Restore session from httpOnly cookie before rendering
store.dispatch(checkAuth());

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </Provider>
)
