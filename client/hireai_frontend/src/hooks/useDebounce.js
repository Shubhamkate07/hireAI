/**
 * ============================================================
 * useDebounce.js — Custom React Hook
 * ============================================================
 *
 * WHY debounce a search input?
 * ─────────────────────────────
 * Without debounce, typing "frontend" fires 8 network requests:
 *   f → fr → fro → fron → front → fronte → fronten → frontend
 *
 * With debounce (e.g. 400ms), React Query only fires ONE request —
 * the one after the user stops typing for 400ms.
 *
 * HOW it works:
 * ─────────────
 * 1. `value` (the raw input) changes on every keystroke — local state, instant.
 * 2. `debouncedValue` only updates 400ms after the last keystroke.
 * 3. We put `debouncedValue` in the queryKey, NOT `value`.
 * 4. So React Query only refetches after the user stops typing.
 *
 * Implementation:
 * ────────────────
 *   useEffect runs whenever `value` or `delay` changes.
 *   It sets a timer to update `debouncedValue` after `delay` ms.
 *   The cleanup function (returned from useEffect) cancels the
 *   previous timer if `value` changes again before it fires.
 *   This is the classic debounce pattern in React hooks.
 * ============================================================
 */
import { useState, useEffect } from 'react'

/**
 * useDebounce
 *
 * @param {*}      value  — The raw value to debounce (e.g. search input string)
 * @param {number} delay  — Milliseconds to wait after the last change (default: 400)
 * @returns {*}           — The debounced value, updated only after `delay` ms of silence
 *
 * Usage:
 *   const [search, setSearch] = useState('')
 *   const debouncedSearch = useDebounce(search, 400)
 *
 *   // Put debouncedSearch in the queryKey, NOT search
 *   useQuery({ queryKey: ['jobs', { page, debouncedSearch }], ... })
 */
const useDebounce = (value, delay = 400) => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    // Start a timer: update the debounced value after `delay` ms
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Cleanup: if `value` changes before the timer fires, cancel the old timer.
    // This is what makes it a "debounce" — only the LAST change within the
    // delay window actually triggers the state update.
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

export default useDebounce
