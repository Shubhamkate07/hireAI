// Imported lazily to avoid circular dependency at module load time
// store → authSlice → authService → api → authEvent → store  would be circular
// So we use a lazy getter instead of a top-level import.

let _store = null;

export const injectStore = (store) => {
    _store = store;
};

export const triggerLogout = () => {
    if (_store) {
        // Import clearUser lazily to avoid circular imports
        import('./authSlice').then(({ clearUser }) => {
            _store.dispatch(clearUser());
        });
    }
};