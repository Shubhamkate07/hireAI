/**
 * ============================================================
 * jobService.js  — Data Access Layer for Jobs
 * ============================================================
 *
 * WHY a separate service file?
 * ─────────────────────────────
 * useQuery needs a "queryFn" — a plain async function.
 * Instead of writing the fetch logic inline inside every component,
 * we centralise it here. Benefits:
 *   1. Reuse — any component can import getJobs() without duplicating code
 *   2. Testability — you can unit-test this function in isolation
 *   3. Single source of truth for URL paths and param names
 *
 * All calls go through the shared `api` axios instance (services/api.js)
 * which already handles:
 *   • baseURL (from VITE_API_URL env var)
 *   • withCredentials: true  (sends httpOnly cookies)
 *   • 401 interception → automatic logout
 * ============================================================
 */
import api from './api'

// ─────────────────────────────────────────────────────────────────────────────
// getJobs(params)
//
// Called by JobsListPage with: { page, limit, status, job_type, location, search }
//
// The `params` object maps directly to the query-string your backend expects:
//   GET /api/jobs?page=1&limit=10&status=open&job_type=remote
//
// Axios automatically serialises a params object into a query string.
// You never have to manually build "?page=1&limit=10" strings.
// ─────────────────────────────────────────────────────────────────────────────
export const getJobs = async (params = {}) => {
  // Strip out empty/undefined values so we don't send ?status=&job_type=
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== undefined && value !== null)
  )

  const response = await api.get('/jobs', { params: cleanParams })

  // Your backend wraps the result in ApiResponse: { statusCode, data, message }
  // We return response.data.data to give the component the raw payload.
  return response.data.data   // { jobs: [...], pagination: { page, limit, total, totalPages } }
}

// ─────────────────────────────────────────────────────────────────────────────
// getJobById(id)
//
// Fetches a single job. Used by a detail page via:
//   useQuery({ queryKey: ['job', id], queryFn: () => getJobById(id) })
// ─────────────────────────────────────────────────────────────────────────────
export const getJobById = async (id) => {
  const response = await api.get(`/jobs/${id}`)
  return response.data.data   // single job object
}

// ─────────────────────────────────────────────────────────────────────────────
// applyToJob(jobId, resumeFile)
//
// Posts to POST /api/jobs/:jobId/apply as multipart/form-data.
//
// IMPORTANT: We pass FormData directly to axios and do NOT set Content-Type.
// When axios receives a FormData body, the browser automatically sets:
//   Content-Type: multipart/form-data; boundary=<generated-boundary>
// If you manually set Content-Type: 'multipart/form-data', the boundary
// string is missing and the server cannot parse the request body.
// ─────────────────────────────────────────────────────────────────────────────
export const applyToJob = async (jobId, resumeFile) => {
  const formData = new FormData()
  if (resumeFile) {
    formData.append('resume', resumeFile)
  }

  // Correct — let axios/browser set Content-Type automatically
  const response = await api.post(`/jobs/${jobId}/apply`, formData)
  return response.data.data
}
