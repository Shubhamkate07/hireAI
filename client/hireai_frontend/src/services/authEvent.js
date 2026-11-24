// Centralized auth event dispatcher
// Eliminates circular dependency between store, authSlice, authService, and api

let _store = null;

export const injectStore = (store) => {
    _store = store;
};

export const triggerLogout = () => {
    if (_store) {
        // Dispatch clearUser action directly without importing authSlice
        _store.dispatch({ type: 'auth/clearUser' });
    }
};