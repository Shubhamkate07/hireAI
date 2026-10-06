const adminService = require('../services/admin.service');
const ApiResponse  = require('../utils/ApiResponse');

/**
 * ============================================================
 * admin.controller.js — HTTP Handler Layer for Admin Panel
 * ============================================================
 */

const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const result = await adminService.updateUserRole(req.params.id, role, req.user.id);
    return res.status(200).json(new ApiResponse(200, result, 'User role updated successfully'));
  } catch (err) {
    next(err);
  }
};

const updateUserStatus = async (req, res, next) => {
  try {
    const { is_active } = req.body;
    const isActiveBool = is_active === true || is_active === 1 || is_active === '1' || is_active === 'active';
    const result = await adminService.updateUserStatus(req.params.id, isActiveBool, req.user.id);
    return res.status(200).json(new ApiResponse(200, result, 'User status updated successfully'));
  } catch (err) {
    next(err);
  }
};

const bulkDeactivateUsers = async (req, res, next) => {
  try {
    const { userIds } = req.body;
    const result = await adminService.bulkDeactivateUsers(userIds, req.user.id);
    return res.status(200).json(new ApiResponse(200, result, `Successfully deactivated ${result.deactivatedCount} non-admin users`));
  } catch (err) {
    next(err);
  }
};

const updateJobStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const result = await adminService.updateJobStatus(req.params.id, status);
    return res.status(200).json(new ApiResponse(200, result, 'Job status updated successfully'));
  } catch (err) {
    next(err);
  }
};

const deleteJob = async (req, res, next) => {
  try {
    const result = await adminService.deleteJob(req.params.id);
    return res.status(200).json(new ApiResponse(200, result, 'Job deleted successfully'));
  } catch (err) {
    next(err);
  }
};

const getAllAssessments = async (req, res, next) => {
  try {
    const assessments = await adminService.getAllAssessments();
    return res.status(200).json(new ApiResponse(200, assessments, 'Assessments fetched successfully'));
  } catch (err) {
    next(err);
  }
};

const getAssessmentFull = async (req, res, next) => {
  try {
    const assessment = await adminService.getAssessmentFull(req.params.id);
    return res.status(200).json(new ApiResponse(200, assessment, 'Full assessment details fetched'));
  } catch (err) {
    next(err);
  }
};

const updateAssessment = async (req, res, next) => {
  try {
    const assessment = await adminService.updateAssessment(req.params.id, req.body);
    return res.status(200).json(new ApiResponse(200, assessment, 'Assessment updated successfully'));
  } catch (err) {
    next(err);
  }
};

const deleteAssessment = async (req, res, next) => {
  try {
    const result = await adminService.deleteAssessment(req.params.id);
    return res.status(200).json(new ApiResponse(200, result, 'Assessment deleted successfully'));
  } catch (err) {
    next(err);
  }
};

const addQuestion = async (req, res, next) => {
  try {
    const result = await adminService.addQuestion(req.params.id, req.body);
    return res.status(201).json(new ApiResponse(201, result, 'Question added successfully'));
  } catch (err) {
    next(err);
  }
};

const updateQuestion = async (req, res, next) => {
  try {
    const result = await adminService.updateQuestion(req.params.id, req.body);
    return res.status(200).json(new ApiResponse(200, result, 'Question updated successfully'));
  } catch (err) {
    next(err);
  }
};

const deleteQuestion = async (req, res, next) => {
  try {
    const result = await adminService.deleteQuestion(req.params.id);
    return res.status(200).json(new ApiResponse(200, result, 'Question deleted successfully'));
  } catch (err) {
    next(err);
  }
};

const getActivityLog = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, type = 'all' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const activities = await adminService.getActivityLog(limit, offset, type);
    return res.status(200).json(new ApiResponse(200, activities, 'Activity log fetched successfully'));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  updateUserRole,
  updateUserStatus,
  bulkDeactivateUsers,
  updateJobStatus,
  deleteJob,
  getAllAssessments,
  getAssessmentFull,
  updateAssessment,
  deleteAssessment,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  getActivityLog,
};
