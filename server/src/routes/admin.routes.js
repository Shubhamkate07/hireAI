const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const rbacMiddleware = require('../middleware/rbac.middleware');
const adminController = require('../controllers/admin.controller');

/**
 * ============================================================
 * admin.routes.js — Admin Panel API Routes
 * ============================================================
 * ALL endpoints strictly protected by authMiddleware + rbacMiddleware(['admin'])
 */

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
