/**
 * ============================================================
 * admin.routes.js — System Governance & Admin Control Center Routes
 * ============================================================
 * Scope: System-wide platform governance (User role/status overrides,
 *        Job overrides/deletions, Assessment question management,
 *        and System Audit Log streaming).
 *
 * Authentication: Strictly Protected
 * Required Role: 'admin' (enforced via rbacMiddleware)
 * ============================================================
 */
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const rbacMiddleware = require('../middleware/rbac.middleware');
const adminController = require('../controllers/admin.controller');

router.use(authMiddleware);
router.use(rbacMiddleware(['admin']));

// Users Management
router.patch('/users/:id/role', adminController.updateUserRole);
router.patch('/users/:id/status', adminController.updateUserStatus);
router.post('/users/deactivate', adminController.bulkDeactivateUsers);

// Jobs Management
router.patch('/jobs/:id/status', adminController.updateJobStatus);
router.delete('/jobs/:id', adminController.deleteJob);

// Assessments Management
router.get('/assessments', adminController.getAllAssessments);
router.get('/assessments/:id', adminController.getAssessmentFull);
router.patch('/assessments/:id', adminController.updateAssessment);
router.delete('/assessments/:id', adminController.deleteAssessment);

// Questions Management
router.post('/assessments/:id/questions', adminController.addQuestion);
router.patch('/questions/:id', adminController.updateQuestion);
router.delete('/questions/:id', adminController.deleteQuestion);

// Activity Log
router.get('/activity', adminController.getActivityLog);

module.exports = router;
