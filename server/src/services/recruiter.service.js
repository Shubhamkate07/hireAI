/**
 * ============================================================
 * recruiter.service.js — Business logic for the Recruiter Portal
 * ============================================================
 *
 * INTERVIEW Q1: What is a state machine?
 * ───────────────────────────────────────
 * A state machine defines a set of STATES and the allowed TRANSITIONS
 * between them. The VALID_TRANSITIONS map below IS the state machine:
 *
 *   { currentState: [allowedNextStates] }
 *
 * Before any status update, we look up the current status in this map
 * and check if the requested new status is in its allowed list.
 * If not → 400 error. Simple, explicit, bug-resistant.
 *
 * INTERVIEW Q2: Why is notification creation non-blocking?
 * ─────────────────────────────────────────────────────────
 * The recruiter only cares that the status was updated.
 * Making them wait for a notification INSERT before getting their
 * 200 response would make the API feel slow for no benefit to them.
 * We use fire-and-forget: start the notification INSERT, do NOT await
 * it, return the response immediately. If the notification fails, we
 * log the error (.catch(console.error)) but the API response is unaffected.
 * ============================================================
 */

const applicationModel    = require('../models/application.model');
const jobModel            = require('../models/job.model');
const ApiError            = require('../utils/ApiError');
const notificationService = require('./notification.service');

// ─── State Machine ────────────────────────────────────────────────────────────
// Each key = a valid current status.
// Its value = the list of statuses it is allowed to move TO.
// Empty array = terminal state (no further transitions allowed).
//
// Pipeline: applied → under_review → shortlisted → hired
//                              ↘                ↘
//                           rejected           rejected
//
const VALID_TRANSITIONS = {
    'applied':      ['under_review', 'rejected'],
    'under_review': ['shortlisted', 'rejected'],
    'shortlisted':  ['hired', 'rejected'],
    'rejected':     [],    // terminal — cannot un-reject silently
    'hired':        [],    // terminal — cannot un-hire silently
};

// ─── getRecruiterJobs ─────────────────────────────────────────────────────────
// Returns all jobs posted by this recruiter, each with an application_count.
// One SQL query — no loop, no N+1.
const getRecruiterJobs = async (recruiterId) => {
    return jobModel.findJobsWithApplicationCount(recruiterId);
};

// ─── getApplicantsForJob ──────────────────────────────────────────────────────
// Returns all applicants for a job — but only if the logged-in recruiter owns it.
const getApplicantsForJob = async (jobId, recruiterId) => {

    // Ownership check first
    const job = await jobModel.findJobById(jobId);
    if (!job) throw new ApiError(404, 'Job not found');

    if (job.posted_by !== recruiterId) {
        throw new ApiError(403, 'You can only view applicants for your own jobs');
    }

    return applicationModel.findApplicationsByJob(jobId);
};

// ─── updateApplicationStatus ──────────────────────────────────────────────────
// The core recruiter action: move a candidate through the hiring pipeline.
//
// Steps:
//   1. Load the application — confirm it exists
//   2. Load the job — confirm the recruiter owns it
//   3. Check the state machine — confirm the transition is valid
//   4. Write the new status (+ optional notes) to the DB
//   5. Fire-and-forget notification to the candidate
//   6. Return the new status immediately (don't wait for step 5)
const updateApplicationStatus = async (applicationId, recruiterId, newStatus, notes) => {

    // ── Step 1: Does this application exist? ──────────────────────────────────
    const application = await applicationModel.findById(applicationId);
    if (!application) throw new ApiError(404, 'Application not found');

    // ── Step 2: Does this recruiter own the job? ──────────────────────────────
    const job = await jobModel.findJobById(application.job_id);
    if (!job) throw new ApiError(404, 'Job not found');

    if (job.posted_by !== recruiterId) {
        throw new ApiError(403, 'You can only update applications for your own jobs');
    }

    // ── Step 3: Is this transition allowed by the state machine? ─────────────
    const validNext = VALID_TRANSITIONS[application.status];

    if (!validNext) {
        // Defensive: current status is not in our map at all
        throw new ApiError(400, `Unknown current status: ${application.status}`);
    }

    if (!validNext.includes(newStatus)) {
        throw new ApiError(
            400,
            `Cannot move from '${application.status}' to '${newStatus}'. ` +
            `Allowed transitions: [${validNext.join(', ') || 'none — this is a terminal state'}]`
        );
    }

    // ── Step 4: Persist the new status and notes ──────────────────────────────
    const updatedApplication = await applicationModel.updateApplicationStatus(applicationId, newStatus, notes ?? null);

    // ── Step 5: Notify the candidate — FIRE AND FORGET ───────────────────────
    // We deliberately do NOT await this.
    // The recruiter gets their response from Step 6 immediately.
    // If this INSERT fails (e.g. DB hiccup), we just log it — it does not
    // affect the status update that already succeeded.
    notificationService.createNotification(
        application.candidate_id,                          // who gets the notification
        'application_status_changed',                      // type (used by frontend to pick icon)
        'Application Status Updated',                      // title (short headline)
        `Your application for "${job.title}" has been moved to: ${newStatus}`,
        applicationId,                                     // reference_id (polymorphic)
        'application'                                      // reference_type (polymorphic)
    ).catch(console.error); // log any failure silently, don't crash

    // ── Step 6: Return the full updated application object ──────────────────
    return updatedApplication;
};

module.exports = {
    getRecruiterJobs,
    getApplicantsForJob,
    updateApplicationStatus,
};
