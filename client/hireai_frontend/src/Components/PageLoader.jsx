/**
 * ============================================================
 * PageLoader.jsx — Suspense fallback spinner
 * ============================================================
 *
 * This component renders while React downloads a lazy chunk.
 * It is passed as the `fallback` prop to <Suspense>.
 *
 * HOW THE SPINNER WORKS (pure CSS, zero dependencies):
 *   A <div> with a transparent border gets one colored side.
 *   CSS @keyframes `spin` rotates it 360° in an infinite loop.
 *   That single colored arc chasing itself = a spinner.
 *
 * WHY KEEP IT LIGHTWEIGHT:
 *   This component loads synchronously (it's NOT lazy) because
 *   Suspense needs the fallback BEFORE the lazy chunk arrives.
 *   Any heavy dependency here would increase the main bundle —
 *   defeating the purpose of code splitting.
 * ============================================================
 */

const PageLoader = () => {
  return (
    <div className="page-loader-wrap">
      {/* The spinner div — styled entirely via index.css */}
      <div className="page-loader-spinner" role="status" aria-label="Loading page..." />
      <p className="page-loader-text">Loading...</p>
    </div>
  )
}

export default PageLoader
