/**
 * ============================================================
 * ai.controller.js  — Controller for AI-Powered Features
 * ============================================================
 */

const aiService        = require('../services/ai.service');
const applicationModel = require('../models/application.model');
const jobModel         = require('../models/job.model');
const userModel        = require('../models/user.model');
const assessmentModel  = require('../models/assessment.model');
const ApiResponse      = require('../utils/ApiResponse');
const ApiError         = require('../utils/ApiError');

/**
 * POST /api/ai/generate-assessment
 * Generates structured questions for an assessment based on role and difficulty.
 * Body: { roleTitle, difficulty, count }
 */
const generateAssessmentQuestions = async (req, res, next) => {
    try {
        const { roleTitle, difficulty, count } = req.body;

        const questions = await aiService.generateAssessmentQuestions({
            roleTitle,
            difficulty,
            count
        });

        return res.status(200).json(
            new ApiResponse(200, questions, 'Questions generated successfully by AI')
        );
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/ai/generate-job-description
 * Generates a structured job description with Gemini AI
 * Body: { title, company, jobType, keySkills, experienceLevel }
 */
const generateJobDescription = async (req, res, next) => {
    try {
        const { title, company, jobType, keySkills, experienceLevel } = req.body;

        const result = await aiService.generateJobDescription({
            title,
            company,
            jobType,
            keySkills,
            experienceLevel
        });

        return res.status(200).json(
            new ApiResponse(200, result, 'Job description generated successfully by AI')
        );
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/ai/screen-resume/:applicationId
 * Evaluates candidate application/resume against the job description with Gemini AI
 */
const screenResume = async (req, res, next) => {
    try {
        const { applicationId } = req.params;

        const application = await applicationModel.findById(applicationId);
        if (!application) {
            throw new ApiError(404, 'Application not found');
        }

        const job = await jobModel.findJobById(application.job_id);
        if (!job || (req.user.role !== 'admin' && job.posted_by !== req.user.id)) {
            throw new ApiError(403, 'You can only screen applicants for your own jobs');
        }
        const candidate = await userModel.findUserById(application.candidate_id);

        const screeningResult = await aiService.screenResume({
            candidateName: candidate?.name,
            candidateEmail: candidate?.email,
            resumePath: application.resume_path,
            jobTitle: job?.title || 'Target Role',
            jobDescription: job?.description,
            jobRequirements: job?.requirements
        });

        return res.status(200).json(
            new ApiResponse(200, screeningResult, 'Resume screened successfully by AI')
        );
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/ai/assessment-feedback/:assessmentId
 * Generates personalized performance feedback and study plan for a completed assessment attempt
 */
const generateCandidateFeedback = async (req, res, next) => {
    try {
        const { assessmentId } = req.params;
        const candidateId = req.user.id;

        const attempt = await assessmentModel.findAttemptByCandidate(assessmentId, candidateId);
        if (!attempt || !attempt.submitted_at) {
            throw new ApiError(400, 'Assessment attempt must be completed before generating AI feedback');
        }

        const assessment = await assessmentModel.findAssessmentById(assessmentId);
        const questions = await assessmentModel.findByAssessmentId(assessmentId);
        const submittedAnswers = attempt.submitted_answers || [];

        const questionsWithAnswers = questions.map(q => {
            const sub = submittedAnswers.find(a => a.questionId === q.id);
            return {
                question: q.question_text,
                type: q.question_type,
                candidateAnswer: sub?.answer || '(No answer)',
                points: q.points,
            };
        });

        const totalPossible = questions.reduce((sum, q) => sum + (Number(q.points) || 10), 0);

        const feedback = await aiService.generateCandidateFeedback({
            assessmentTitle: assessment?.title || 'Technical Assessment',
            score: attempt.score || 0,
            totalPossible,
            questionsWithAnswers
        });

        return res.status(200).json(
            new ApiResponse(200, feedback, 'Assessment feedback generated successfully by AI')
        );
    } catch (err) {
        next(err);
    }
};

module.exports = {
    generateAssessmentQuestions,
    generateJobDescription,
    screenResume,
    generateCandidateFeedback,
};
