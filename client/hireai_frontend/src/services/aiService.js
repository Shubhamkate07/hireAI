import api from './api';

/**
 * ============================================================
 * aiService.js — Client API service for HireAI Gemini features
 * ============================================================
 */

/**
 * Generate assessment questions using Gemini AI
 * @param {Object} params
 * @param {string} params.roleTitle - e.g. "React Developer" or "DevOps Engineer"
 * @param {string} [params.difficulty='Intermediate'] - "Beginner" | "Intermediate" | "Advanced"
 * @param {number} [params.count=5] - 1 to 10
 * @returns {Promise<Array>} Array of question objects
 */
export const generateAssessmentQuestionsAI = async ({ roleTitle, difficulty = 'Intermediate', count = 5 }) => {
  const response = await api.post('/ai/generate-assessment', {
    roleTitle,
    difficulty,
    count,
  });
  return response.data?.data || [];
};

/**
 * Generate structured job description using Gemini AI
 * @param {Object} params
 * @param {string} params.title - Job title
 * @param {string} [params.company] - Company name
 * @param {string} [params.jobType='full-time'] - Job type
 * @param {string} [params.keySkills] - Key skills or focus areas
 * @param {string} [params.experienceLevel] - e.g. "Entry", "Mid-Level", "Senior"
 * @returns {Promise<Object>} { description, suggestedSalaryMin, suggestedSalaryMax }
 */
export const generateJobDescriptionAI = async ({ title, company, jobType, keySkills, experienceLevel }) => {
  const response = await api.post('/ai/generate-job-description', {
    title,
    company,
    jobType,
    keySkills,
    experienceLevel,
  });
  return response.data?.data || {};
};

/**
 * Screen applicant resume and compute match score against job using Gemini AI
 * @param {number|string} applicationId
 * @returns {Promise<Object>} { matchScore, topMatchedSkills, skillGaps, summary, recommendation }
 */
export const screenResumeAI = async (applicationId) => {
  const response = await api.post(`/ai/screen-resume/${applicationId}`);
  return response.data?.data || null;
};

/**
 * Get personalized candidate feedback and study plan for a completed assessment
 * @param {number|string} assessmentId
 * @returns {Promise<Object>} { summary, strengths, areasForImprovement, studyPlan }
 */
export const getAssessmentFeedbackAI = async (assessmentId) => {
  const response = await api.get(`/ai/assessment-feedback/${assessmentId}`);
  return response.data?.data || null;
};
