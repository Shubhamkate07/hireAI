const adminModel = require('../models/admin.model');
const userModel  = require('../models/user.model');
const ApiError   = require('../utils/ApiError');
const redis      = require('../config/redis');

/**
 * ============================================================
 * admin.service.js — Business Logic for Admin Management
 * ============================================================
 */

const updateUserRole = async (targetUserId, role, currentAdminId) => {
  const allowedRoles = ['candidate', 'recruiter', 'admin'];
  if (!allowedRoles.includes(role)) {
    throw new ApiError(400, `Invalid role: ${role}. Allowed roles: [candidate, recruiter, admin]`);
  }

  const user = await userModel.findUserById(targetUserId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  await adminModel.updateUserRole(targetUserId, role);
  return { id: targetUserId, role };
};

const updateUserStatus = async (targetUserId, isActive, currentAdminId) => {
  if (Number(targetUserId) === Number(currentAdminId) && !isActive) {
    throw new ApiError(400, 'You cannot deactivate your own admin account.');
  }

  const user = await userModel.findUserById(targetUserId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  await adminModel.updateUserStatus(targetUserId, isActive);
  return { id: targetUserId, is_active: isActive ? 1 : 0 };
};

const bulkDeactivateUsers = async (userIds, currentAdminId) => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new ApiError(400, 'userIds array is required.');
  }

  const safeUserIds = userIds.filter((id) => Number(id) !== Number(currentAdminId));
  if (safeUserIds.length === 0) {
    throw new ApiError(400, 'No eligible users to deactivate.');
  }

  const count = await adminModel.bulkDeactivateUsers(safeUserIds);
  return { deactivatedCount: count, userIds: safeUserIds };
};

const updateJobStatus = async (jobId, status) => {
  const allowedStatuses = ['open', 'closed', 'draft'];
  if (!allowedStatuses.includes(status)) {
    throw new ApiError(400, `Invalid status: ${status}. Allowed: [open, closed, draft]`);
  }

  const updated = await adminModel.updateJobStatus(jobId, status);
  if (!updated) {
    throw new ApiError(404, 'Job not found');
  }

  // Invalidate job list cache & analytics cache
  try {
    const keys = await redis.keys('jobs:list:*');
    if (keys.length > 0) await redis.del(keys);
    await redis.del('analytics:platform');
  } catch (err) {
    console.error('Redis cache clear error in admin updateJobStatus:', err.message);
  }

  return { id: jobId, status };
};

const deleteJob = async (jobId) => {
  const deleted = await adminModel.deleteJob(jobId);
  if (!deleted) {
    throw new ApiError(404, 'Job not found');
  }

  try {
    const keys = await redis.keys('jobs:list:*');
    if (keys.length > 0) await redis.del(keys);
    await redis.del('analytics:platform');
  } catch (err) {
    console.error('Redis cache clear error in admin deleteJob:', err.message);
  }

  return { id: jobId, deleted: true };
};

const getAllAssessments = async () => {
  return adminModel.getAllAssessmentsWithCounts();
};

const getAssessmentFull = async (assessmentId) => {
  const assessment = await adminModel.getAssessmentFull(assessmentId);
  if (!assessment) {
    throw new ApiError(404, 'Assessment not found');
  }
  return assessment;
};

const updateAssessment = async (assessmentId, payload) => {
  const updated = await adminModel.updateAssessment(assessmentId, payload);
  if (!updated) {
    throw new ApiError(404, 'Assessment not found');
  }
  return adminModel.getAssessmentFull(assessmentId);
};

const deleteAssessment = async (assessmentId) => {
  const deleted = await adminModel.deleteAssessment(assessmentId);
  if (!deleted) {
    throw new ApiError(404, 'Assessment not found');
  }
  return { id: assessmentId, deleted: true };
};

const addQuestion = async (assessmentId, questionData) => {
  const assessment = await adminModel.getAssessmentFull(assessmentId);
  if (!assessment) {
    throw new ApiError(404, 'Assessment not found');
  }

  const questionId = await adminModel.addQuestion(assessmentId, questionData);
  return { id: questionId, assessment_id: assessmentId, ...questionData };
};

const updateQuestion = async (questionId, questionData) => {
  const updated = await adminModel.updateQuestion(questionId, questionData);
  if (!updated) {
    throw new ApiError(404, 'Question not found');
  }
  return { id: questionId, ...questionData };
};

const deleteQuestion = async (questionId) => {
  const deleted = await adminModel.deleteQuestion(questionId);
  if (!deleted) {
    throw new ApiError(404, 'Question not found');
  }
  return { id: questionId, deleted: true };
};

const getActivityLog = async (limit = 50, offset = 0, typeFilter = 'all') => {
  return adminModel.getActivityLog(limit, offset, typeFilter);
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
