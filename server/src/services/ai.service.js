const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');
const config = require('../config/env.config');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

// Candidate models in preference order (fast, JSON-supported, free-tier friendly)
const MODEL_CANDIDATES = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash',
];

// Initialize Gemini SDK with your API key
const getAiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY || config.ai?.apiKey;
    if (!apiKey) {
        throw new ApiError(500, 'GEMINI_API_KEY is not configured in server/.env');
    }
    return new GoogleGenAI({ apiKey });
};

/**
 * Helper to call Gemini with automatic model fallback
 */
const generateWithFallback = async ({ prompt, contents, temperature = 0.2 }) => {
    const ai = getAiClient();
    let lastError = null;

    const inputContents = contents || prompt;

    // Two passes over the model list with a short pause: free-tier models often
    // return transient 503 (high demand) / 429 (per-minute limit).
    const errors = [];
    for (let pass = 0; pass < 2; pass++) {
        if (pass > 0) await new Promise((r) => setTimeout(r, 2000));
        for (const model of MODEL_CANDIDATES) {
            try {
                const response = await ai.models.generateContent({
                    model,
                    contents: inputContents,
                    config: {
                        responseMimeType: 'application/json',
                        temperature,
                    }
                });

                const text = response.text?.trim();
                if (text) {
                    return JSON.parse(text);
                }
            } catch (err) {
                lastError = err;
                errors.push(`${model}: ${String(err.message).slice(0, 120)}`);
            }
        }
    }
    logger.warn(`Gemini: all models failed -> ${errors.join(' | ')}`);

    throw new ApiError(502, `AI service is temporarily busy. Please try again in a minute.`);
};

/**
 * FEATURE 1: Generates structured assessment questions for a job role
 */
const generateAssessmentQuestions = async ({ roleTitle, difficulty = 'Intermediate', count = 5 }) => {
    if (!roleTitle || !roleTitle.trim()) {
        throw new ApiError(400, 'roleTitle is required to generate questions');
    }

    const safeCount = Math.min(Math.max(1, parseInt(count, 10) || 5), 10);

    const prompt = `You are a world-class technical hiring manager and assessment designer.
Generate exactly ${safeCount} realistic, high-quality technical multiple-choice questions for the role/topic: "${roleTitle.trim()}".
Target difficulty level: "${difficulty}".

Output specifications:
1. Every question MUST be a multiple-choice question ("question_type": "mcq").
2. "options" MUST be an array of exactly 4 plausible, distinct strings.
3. "correct_answer" MUST be a string that exactly matches one of the 4 items in "options".
4. "points" must be a positive integer (typically 10 or 15).

Return ONLY a valid JSON array matching this structure:
[
  {
    "question_text": "What is the primary purpose of React.useMemo?",
    "question_type": "mcq",
    "options": [
      "To cache computed values across re-renders",
      "To trigger side-effects",
      "To manage local state",
      "To render raw HTML"
    ],
    "correct_answer": "To cache computed values across re-renders",
    "points": 10
  }
]`;

    const parsedQuestions = await generateWithFallback({ prompt, temperature: 0.2 });

    if (!Array.isArray(parsedQuestions)) {
        throw new ApiError(502, 'AI response format was not a valid question array');
    }

    // Normalize each question so it strictly fits the HireAI MCQ model
    return parsedQuestions.map(q => {
        let options = Array.isArray(q.options) ? q.options.map(opt => String(opt).trim()).filter(Boolean) : [];
        if (options.length < 4) {
            while (options.length < 4) {
                options.push(`Option ${String.fromCharCode(65 + options.length)}`);
            }
        } else if (options.length > 4) {
            options = options.slice(0, 4);
        }

        let correctAnswer = String(q.correct_answer || '').trim();
        if (!options.includes(correctAnswer)) {
            correctAnswer = options[0];
        }

        return {
            question_text: String(q.question_text || '').trim(),
            question_type: 'mcq',
            options,
            correct_answer: correctAnswer,
            points: Number(q.points) > 0 ? Number(q.points) : 10
        };
    });
};

/**
 * FEATURE 4: Generates a structured Job Description using Gemini AI
 */
const generateJobDescription = async ({ title, company, jobType, keySkills, experienceLevel }) => {
    if (!title || !title.trim()) {
        throw new ApiError(400, 'Job title is required to generate a job description');
    }

    const prompt = `You are an elite technical recruiter and talent acquisition leader.
Generate a professional, compelling, and structured job description for the role: "${title.trim()}".
Company: "${(company || 'Our Company').trim()}"
Job Type: "${jobType || 'full-time'}"
Key Skills / Tech Stack: "${(keySkills || 'Industry standard best practices').trim()}"
Experience Level: "${experienceLevel || 'Mid-Senior'}"

Requirements:
1. Provide a clear, modern overview in standard text/markdown.
2. Structure the description into:
   - About the Role
   - Key Responsibilities (4-6 actionable bullet points)
   - Qualifications & Required Skills (4-6 bullet points)
   - Nice-to-Have / Bonus Skills (2-4 bullet points)
   - What We Offer
3. Suggest a realistic annual salary range in INR (integers).

Return ONLY a valid JSON object matching this schema:
{
  "description": "string",
  "suggestedSalaryMin": 800000,
  "suggestedSalaryMax": 1500000
}`;

    const result = await generateWithFallback({ prompt, temperature: 0.3 });

    if (!result || typeof result.description !== 'string') {
        throw new ApiError(502, 'AI response format was invalid for job description');
    }

    return {
        description: result.description.trim(),
        suggestedSalaryMin: typeof result.suggestedSalaryMin === 'number' ? result.suggestedSalaryMin : null,
        suggestedSalaryMax: typeof result.suggestedSalaryMax === 'number' ? result.suggestedSalaryMax : null,
    };
};

/**
 * FEATURE 2: Screens candidate resume against job description using Gemini AI
 */
const screenResume = async ({ candidateName, candidateEmail, resumePath, jobTitle, jobDescription, jobRequirements }) => {
    let parts = [];

    // Check if resume file exists on disk (PDF, TXT, DOCX)
    if (resumePath) {
        const fullPath = path.isAbsolute(resumePath) ? resumePath : path.resolve(process.cwd(), resumePath);
        if (fs.existsSync(fullPath)) {
            const ext = path.extname(fullPath).toLowerCase();
            const mimeType = ext === '.pdf' ? 'application/pdf' : ext === '.txt' ? 'text/plain' : 'application/octet-stream';
            try {
                const buffer = fs.readFileSync(fullPath);
                parts.push({
                    inlineData: {
                        mimeType,
                        data: buffer.toString('base64'),
                    }
                });
            } catch (err) {
                console.warn('[AI] Could not read resume buffer:', err.message);
            }
        }
    }

    const promptText = `You are a talent acquisition director and senior technical hiring manager.
Screen this candidate's application against the target job posting.

Candidate: "${candidateName || 'Applicant'}" (${candidateEmail || 'Email not provided'})
Job Role: "${jobTitle}"
Job Description:
${jobDescription || 'Standard engineering requirements'}
${jobRequirements ? `Key Requirements:\n${jobRequirements}` : ''}

Evaluate how well the candidate matches the position based on skills, domain experience, and tech stack.
Return ONLY a valid JSON object matching this schema:
{
  "matchScore": 85,
  "topMatchedSkills": ["Node.js", "Express", "REST APIs"],
  "skillGaps": ["Kubernetes", "Docker"],
  "summary": "Candidate shows strong backend fundamentals and REST API experience matching key requirements.",
  "recommendation": "Shortlist"
}`;

    parts.push({ text: promptText });

    const result = await generateWithFallback({ contents: parts, temperature: 0.2 });

    return {
        matchScore: typeof result?.matchScore === 'number' ? Math.min(100, Math.max(0, result.matchScore)) : 75,
        topMatchedSkills: Array.isArray(result?.topMatchedSkills) ? result.topMatchedSkills : [],
        skillGaps: Array.isArray(result?.skillGaps) ? result.skillGaps : [],
        summary: result?.summary || 'Candidate profile evaluated successfully.',
        recommendation: result?.recommendation || 'Under Review',
    };
};

/**
 * FEATURE 3: Smart Semantic Evaluation for Subjective / Coding / Text Answers
 */
const evaluateSubjectiveAnswer = async ({ questionText, expectedAnswer, candidateAnswer, maxPoints = 10 }) => {
    if (!candidateAnswer || !candidateAnswer.trim()) {
        return { awardedPoints: 0, feedback: 'No answer provided.' };
    }

    const prompt = `You are an expert technical interviewer evaluating a candidate's answer.
Question: "${questionText}"
Reference / Expected Solution: "${expectedAnswer}"
Candidate's Submitted Answer: "${candidateAnswer}"
Maximum Points Available: ${maxPoints}

Evaluate the candidate's answer for correctness, conceptual understanding, and key technical accuracy.
If the candidate's explanation or code is conceptually correct even if phrased differently or formatted differently from the reference, award appropriate full or partial points.

Return ONLY a valid JSON object matching this schema:
{
  "awardedPoints": 10,
  "feedback": "Concise explanation of why points were awarded or deducted"
}`;

    try {
        const result = await generateWithFallback({ prompt, temperature: 0.1 });
        const awarded = Math.min(Math.max(0, Number(result?.awardedPoints) || 0), maxPoints);
        return {
            awardedPoints: awarded,
            feedback: result?.feedback || ''
        };
    } catch (err) {
        // Fallback to case-insensitive strict check if AI fails
        const isMatch = candidateAnswer.trim().toLowerCase() === expectedAnswer.trim().toLowerCase();
        return {
            awardedPoints: isMatch ? maxPoints : 0,
            feedback: isMatch ? 'Exact match' : 'Incorrect'
        };
    }
};

/**
 * FEATURE 5: Candidate Post-Assessment AI Feedback & Study Plan
 */
const generateCandidateFeedback = async ({ assessmentTitle, score, totalPossible, questionsWithAnswers }) => {
    const prompt = `You are an expert technical mentor and engineering coach.
A candidate has completed a technical assessment titled "${assessmentTitle}".
Score achieved: ${score} out of ${totalPossible} points.

Here is the breakdown of the assessment questions and how the candidate answered:
${JSON.stringify(questionsWithAnswers, null, 2)}

Provide encouraging, constructive, and actionable feedback for the candidate.
Identify what concepts they demonstrated mastery in, what specific knowledge gaps they showed, and a clear 3-point study plan.

Return ONLY a valid JSON object matching this schema:
{
  "summary": "You demonstrated strong mastery of core concepts...",
  "strengths": ["Clear understanding of middleware execution order", "Accurate knowledge of HTTP status codes"],
  "areasForImprovement": ["Async error handling in express next(err)", "Promise rejection patterns"],
  "studyPlan": [
    "Read Express official guide on Writing Error Handlers",
    "Practice writing custom error middleware with 4 arguments (err, req, res, next)",
    "Review JavaScript event loop and Promise microtask queue mechanics"
  ]
}`;

    const result = await generateWithFallback({ prompt, temperature: 0.3 });

    return {
        summary: result?.summary || 'Assessment evaluation completed.',
        strengths: Array.isArray(result?.strengths) ? result.strengths : [],
        areasForImprovement: Array.isArray(result?.areasForImprovement) ? result.areasForImprovement : [],
        studyPlan: Array.isArray(result?.studyPlan) ? result.studyPlan : [],
    };
};

module.exports = {
    generateAssessmentQuestions,
    generateJobDescription,
    screenResume,
    evaluateSubjectiveAnswer,
    generateCandidateFeedback,
    generateWithFallback,
};
