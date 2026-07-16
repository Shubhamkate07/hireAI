const express = require("express");

const jobController =
    require("../controllers/job.controller");

const authMiddleware =
    require("../middleware/auth.middleware");

const rbacMiddleware =
    require("../middleware/rbac.middleware");

const {
    createJobValidation,
    updateJobValidation,
    validate,
} = require("../middleware/validation.middleware");

const router = express.Router();

// POST /api/jobs — protected, recruiter or admin only
router.post(
    "/",
    authMiddleware,
    rbacMiddleware(["recruiter", "admin"]),
    createJobValidation,
    validate,
    jobController.createJob
);

// GET /api/jobs/my-jobs — recruiter's own jobs (all statuses)
// ⚠️  Must be defined BEFORE /:id so Express doesn't interpret
//    "my-jobs" as a dynamic :id param.
router.get(
    "/my-jobs",
    authMiddleware,
    rbacMiddleware(["recruiter", "admin"]),
    jobController.getMyJobs
);

// GET /api/jobs — public, no auth required
router.get(
    "/",
    jobController.listJobs
);

// GET /api/jobs/:id — public, returns 404 if not found
router.get(
    "/:id",
    jobController.getJobById
);

// PATCH /api/jobs/:id — update a job (owner recruiter or admin only)
router.patch(
    "/:id",
    authMiddleware,
    rbacMiddleware(["recruiter", "admin"]),
    updateJobValidation,
    validate,
    jobController.updateJob
);

// DELETE /api/jobs/:id — soft-close a job (owner recruiter or admin only)
router.delete(
    "/:id",
    authMiddleware,
    rbacMiddleware(["recruiter", "admin"]),
    jobController.deleteJob
);

module.exports = router;
