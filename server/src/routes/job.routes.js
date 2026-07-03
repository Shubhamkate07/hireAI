const express = require("express");

const jobController =
    require("../controllers/job.controller");

const authMiddleware =
    require("../middleware/auth.middleware");

const rbacMiddleware =
    require("../middleware/rbac.middleware");

const {
    createJobValidation,
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

module.exports = router;
