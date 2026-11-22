/**
 * ============================================================
 * AssessmentPage.jsx  — Quiz Runner for Job Assessments
 * ============================================================
 *
 * INTERVIEW QUESTION ANSWERS (embedded as comments throughout):
 *
 * Q1: "A single object keyed by question ID, or an array?"
 *     → OBJECT keyed by question ID.  { "10": "b", "11": "a" }
 *     Justification: Random access is O(1). To read/write the answer for
 *     question 10 you just do answers["10"] — no .find() over an array.
 *     Also, the submit API expects exactly this shape, so no transformation needed.
 *
 * Q2: "Why does the timer need a cleanup function?"
 *     → setInterval keeps running even after the component unmounts.
 *     Without clearInterval in the cleanup, the interval fires and calls
 *     setTimeLeft on a component that no longer exists → React memory leak
 *     warning + potential state update on an unmounted component.
 *     With cleanup: when the component unmounts, React calls the cleanup
 *     function, which calls clearInterval(id), stopping the timer safely.
 *
 * Q3: "User refreshes mid-assessment — what is lost?"
 *     → `answers` (local state) and `timeLeft` are both in memory.
 *     They vanish on refresh. Mitigation options (discuss only):
 *       a) sessionStorage — persist answers on every keystroke, read on mount.
 *       b) Server draft — POST answers to a /draft endpoint on each selection.
 *       c) URL state — encode answers in the query string (impractical here).
 *     The timer is harder — you'd need to store the "deadline timestamp"
 *     (Date.now() + timeLeft) in sessionStorage and recompute on remount.
 *
 * Q4: "Why build against a mock first?"
 *     → Because the component only cares about the DATA SHAPE, not the source.
 *     The mock had the exact same shape as the real response, so AssessmentPage.jsx
 *     required zero changes when swapping to the real API — only assessmentService.js
 *     changed. This proves the pattern: isolate data-fetching in a service file so
 *     the component stays decoupled from whether data is real or mocked.
 *
 * Q5: "What is a derived value? Where does one appear here?"
 *     → A derived value is calculated from existing state — it is NOT stored
 *     in useState. Example here: `canSubmit`.
 *     canSubmit = Object.keys(answers).length === assessment.questions.length
 *     This is true when every question has been answered. We never store
 *     canSubmit in state; we compute it fresh on every render from `answers`.
 *     Storing it in state would mean manually keeping two pieces of state
 *     in sync — a classic source of bugs.
 * ============================================================
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import BackButton from '../../Components/BackButton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAssessment, submitAssessment } from '../../services/assessmentService';
import { getAssessmentFeedbackAI } from '../../services/aiService';
import './AssessmentPage.css';


// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// Formats seconds into "MM:SS" string for the timer display
const formatTime = (seconds) => {
    const safeSeconds = Math.max(0, Math.floor(seconds || 0));
    const m = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
    const s = (safeSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};


// ─────────────────────────────────────────────────────────────────────────────
// AssessmentPage Component
// ─────────────────────────────────────────────────────────────────────────────
const AssessmentPage = () => {

    // ── Route Params & Navigation ─────────────────────────────────────────────
    const { assessmentId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const user = useSelector((state) => state.auth?.user);

    // ─────────────────────────────────────────────────────────────────────────
    // State model for answers & quiz navigation
    // ─────────────────────────────────────────────────────────────────────────
    const [answers, setAnswers] = useState(() => {
        try {
            const saved = localStorage.getItem(`hireai_assessment_answers_${assessmentId}`);
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    const [currentIndex, setCurrentIndex] = useState(() => {
        try {
            const saved = sessionStorage.getItem(`hireai_assessment_index_${assessmentId}`);
            return saved !== null ? Number(saved) : 0;
        } catch {
            return 0;
        }
    });

    const [timeLeft, setTimeLeft]   = useState(null); // seconds remaining
    const [submitted, setSubmitted] = useState(false); // did the user submit?
    const autoSubmittedRef          = useRef(false); // prevents infinite auto-submit loops

    // AI Feedback state for completed tests
    const [aiFeedback, setAiFeedback] = useState(null);
    const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);

    const handleFetchAiFeedback = async () => {
        try {
            setIsFeedbackLoading(true);
            const feedback = await getAssessmentFeedbackAI(assessmentId);
            if (feedback) setAiFeedback(feedback);
        } catch (err) {
            alert(err.response?.data?.message || 'Could not generate AI feedback at this time.');
        } finally {
            setIsFeedbackLoading(false);
        }
    };

    const renderAiFeedbackSection = () => {
        if (aiFeedback) {
            return (
                <div style={{
                    marginTop: '28px',
                    textAlign: 'left',
                    padding: '24px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.09)',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '680px',
                    margin: '28px auto 0',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
                    backdropFilter: 'blur(8px)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                        <span style={{ fontSize: '1.4rem' }}>✨</span>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                            Gemini AI Performance Analysis & Study Plan
                        </h3>
                    </div>

                    <p style={{ fontSize: '0.92rem', color: '#cbd5e1', lineHeight: 1.6, margin: '0 0 16px' }}>
                        {aiFeedback.summary}
                    </p>

                    {aiFeedback.strengths?.length > 0 && (
                        <div style={{ marginBottom: '14px', background: 'rgba(34, 197, 94, 0.06)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '10px', padding: '12px 16px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Demonstrated Strengths
                            </span>
                            <ul style={{ margin: '8px 0 0', paddingLeft: '20px', fontSize: '0.88rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                                {aiFeedback.strengths.map((str, idx) => (
                                    <li key={idx} style={{ marginBottom: '4px' }}>{str}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {aiFeedback.areasForImprovement?.length > 0 && (
                        <div style={{ marginBottom: '14px', background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '10px', padding: '12px 16px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Key Areas for Improvement
                            </span>
                            <ul style={{ margin: '8px 0 0', paddingLeft: '20px', fontSize: '0.88rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                                {aiFeedback.areasForImprovement.map((area, idx) => (
                                    <li key={idx} style={{ marginBottom: '4px' }}>{area}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {aiFeedback.studyPlan?.length > 0 && (
                        <div style={{ marginTop: '14px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '10px', padding: '12px 16px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Actionable 3-Point Study Plan
                            </span>
                            <ol style={{ margin: '8px 0 0', paddingLeft: '20px', fontSize: '0.88rem', color: '#e2e8f0', lineHeight: 1.6 }}>
                                {aiFeedback.studyPlan.map((step, idx) => (
                                    <li key={idx} style={{ marginBottom: '4px' }}>{step}</li>
                                ))}
                            </ol>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <button
                type="button"
                disabled={isFeedbackLoading}
                onClick={handleFetchAiFeedback}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    marginTop: '20px',
                    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: isFeedbackLoading ? 'wait' : 'pointer',
                    opacity: isFeedbackLoading ? 0.7 : 1,
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
                }}
            >
                {isFeedbackLoading ? '⏳ Analyzing Assessment Results...' : '✨ Get AI Feedback & Study Plan'}
            </button>
        );
    };


    // ── Fetch Assessment ──────────────────────────────────────────────────────
    const {
        data: assessment,
        isLoading,
        isError,
        error
    } = useQuery({
        queryKey: ['assessment', assessmentId],
        queryFn:  () => getAssessment(assessmentId),
    });


    // ── Submit Mutation ───────────────────────────────────────────────────────
    const {
        mutate: submitMutation,
        isPending: isSubmitting,
        isSuccess,
        data: result,
        isError: isSubmitError,
        error: submitError,
    } = useMutation({
        mutationFn: () => {
            const submittedAnswers = Object.entries(answers).map(([questionId, answer]) => ({
                questionId: Number(questionId),
                answer,
            }));
            return submitAssessment(assessmentId, submittedAnswers);
        },
        onSuccess: () => {
            setSubmitted(true);
            autoSubmittedRef.current = true;
            try {
                localStorage.removeItem(`hireai_assessment_answers_${assessmentId}`);
                sessionStorage.removeItem(`hireai_assessment_index_${assessmentId}`);
            } catch {}
            queryClient.invalidateQueries({ queryKey: ['assessment', assessmentId] });
        },
        onError: (err) => {
            // Guard: Halt re-submission attempts on failure so client never loops infinitely
            autoSubmittedRef.current = true;
            setSubmitted(true);
            if (err?.response?.status === 409) {
                queryClient.invalidateQueries({ queryKey: ['assessment', assessmentId] });
            }
        }
    });

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleSubmit = () => {
        if (!isSubmitting && !submitted && !autoSubmittedRef.current) {
            submitMutation();
        }
    };

    const handleSelectAnswer = (questionId, optionKey) => {
        setAnswers(prev => {
            const nextAnswers = {
                ...prev,
                [questionId]: optionKey
            };
            try {
                localStorage.setItem(`hireai_assessment_answers_${assessmentId}`, JSON.stringify(nextAnswers));
            } catch {}
            return nextAnswers;
        });
    };

    const handleExit = () => {
        // Assessment is still running on server: persist answers so candidate can resume seamlessly!
        if (!submitted && !isSuccess && !assessment?.already_submitted) {
            try {
                localStorage.setItem(`hireai_assessment_answers_${assessmentId}`, JSON.stringify(answers));
            } catch {}
        }
        queryClient.invalidateQueries({ queryKey: ['job-assessment'] });
        queryClient.invalidateQueries({ queryKey: ['assessment', assessmentId] });
        if (window.history.state?.idx > 0) navigate(-1);
        else navigate('/jobs');
    };


    // ── Initialise Timer When Assessment Arrives ──────────────────────────────
    useEffect(() => {
        if (assessment && timeLeft === null) {
            if (assessment.already_submitted) {
                setSubmitted(true);
                autoSubmittedRef.current = true;
                setTimeLeft(0);
                return;
            }
            const serverSeconds = typeof assessment.remaining_seconds === 'number'
                ? assessment.remaining_seconds
                : ((assessment.time_limit_minutes && Number(assessment.time_limit_minutes) > 0 ? Number(assessment.time_limit_minutes) : 30) * 60);
            setTimeLeft(Math.max(0, serverSeconds));
        }
    }, [assessment, timeLeft]);

    // ── Persist Answers & Current Index ───────────────────────────────────────
    useEffect(() => {
        if (assessmentId && !submitted && !isSuccess) {
            try {
                localStorage.setItem(`hireai_assessment_answers_${assessmentId}`, JSON.stringify(answers));
            } catch {}
        }
    }, [answers, assessmentId, submitted, isSuccess]);

    useEffect(() => {
        if (assessmentId) {
            try {
                sessionStorage.setItem(`hireai_assessment_index_${assessmentId}`, String(currentIndex));
            } catch {}
        }
    }, [currentIndex, assessmentId]);

    useEffect(() => {
        if (submitted || isSuccess || assessment?.already_submitted) {
            try {
                localStorage.removeItem(`hireai_assessment_answers_${assessmentId}`);
                sessionStorage.removeItem(`hireai_assessment_index_${assessmentId}`);
            } catch {}
        }
    }, [submitted, isSuccess, assessment?.already_submitted, assessmentId]);

    // ── Timer Countdown Effect ────────────────────────────────────────────────
    useEffect(() => {
        if (timeLeft === null || submitted || isSuccess || autoSubmittedRef.current) return;

        if (timeLeft <= 0) {
            if (!autoSubmittedRef.current && !submitted && !isSubmitting) {
                autoSubmittedRef.current = true;
                setSubmitted(true);
                submitMutation();
            }
            return;
        }

        const intervalId = setInterval(() => {
            setTimeLeft(prev => {
                if (prev === null) return null;
                if (prev <= 1) {
                    clearInterval(intervalId);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(intervalId);
    }, [timeLeft, submitted, isSuccess, isSubmitting]);

    // ── Warn before leaving or refreshing ─────────────────────────────────────
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (Object.keys(answers).length > 0 && !submitted && !isSuccess) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [answers, submitted, isSuccess]);

    // ── Derived values ────────────────────────────────────────────────────────
    const totalQuestions = assessment?.questions?.length ?? 0;
    const answeredCount  = Object.keys(answers).length;
    const canSubmit      = totalQuestions > 0;


    // ── Render: Loading ───────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="ap-page">
                <div className="ap-card ap-loading">
                    <div className="ap-spinner" />
                    <p>Loading assessment…</p>
                </div>
            </div>
        );
    }

    // ── Render: Error ─────────────────────────────────────────────────────────
    if (isError) {
        const errorMsg = error?.response?.data?.message || error?.message || 'An unexpected error occurred';
        return (
            <div className="ap-page">
                <div className="ap-card ap-error">
                    <span className="ap-error-icon">⚠️</span>
                    <h2>Could not load assessment</h2>
                    <p>{errorMsg}</p>
                    <div style={{ marginTop: '1.25rem' }}>
                        <BackButton label="Go Back" fallback="/jobs" />
                    </div>
                </div>
            </div>
        );
    }

    // ── Render: Recruiter / Admin Preview Mode ────────────────────────────────
    if (user?.role === 'recruiter' || user?.role === 'admin') {
        const totalMaxScore = assessment?.questions?.reduce((acc, q) => acc + (q.points || 10), 0) || 0;
        return (
            <div className="ap-page">
                <div className="ap-card" style={{ maxWidth: '650px', textAlign: 'center', padding: '2.5rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
                    <h2 style={{ fontSize: '1.6rem', color: '#1e293b', marginBottom: '0.5rem' }}>
                        Assessment Overview ({user.role === 'admin' ? 'Admin' : 'Recruiter'})
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                        You are viewing <strong>{assessment?.title}</strong> as an authenticated {user.role}.
                        Interactive screening attempts and submissions are reserved strictly for job applicants.
                    </p>

                    <div style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '1.25rem',
                        textAlign: 'left',
                        marginBottom: '2rem'
                    }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem' }}>
                            <div>
                                <span style={{ color: '#64748b' }}>Time Limit:</span>{' '}
                                <strong style={{ color: '#0f172a' }}>{assessment?.time_limit_minutes} minutes</strong>
                            </div>
                            <div>
                                <span style={{ color: '#64748b' }}>Total Questions:</span>{' '}
                                <strong style={{ color: '#0f172a' }}>{totalQuestions} questions</strong>
                            </div>
                            <div>
                                <span style={{ color: '#64748b' }}>Max Score:</span>{' '}
                                <strong style={{ color: '#0f172a' }}>{totalMaxScore} pts</strong>
                            </div>
                            <div>
                                <span style={{ color: '#64748b' }}>Linked Job ID:</span>{' '}
                                <strong style={{ color: '#0f172a' }}>{assessment?.job_id ? `#${assessment.job_id}` : 'Standalone'}</strong>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link
                            to={user.role === 'admin' ? `/admin/assessments/${assessmentId}` : `/recruiter/assessments/${assessmentId}/edit`}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px 24px',
                                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                color: '#ffffff',
                                borderRadius: '10px',
                                fontWeight: 700,
                                textDecoration: 'none',
                                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
                            }}
                        >
                            ✏️ Edit Questions
                        </Link>

                        <Link
                            to={`/assessments/${assessmentId}/leaderboard`}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px 24px',
                                background: 'linear-gradient(135deg, #0f172a, #334155)',
                                color: '#fbbf24',
                                borderRadius: '10px',
                                fontWeight: 700,
                                textDecoration: 'none',
                                border: '1px solid rgba(251, 191, 36, 0.3)',
                            }}
                        >
                            🏆 View Leaderboard
                        </Link>

                        <BackButton label="Exit Preview" fallback={user.role === 'admin' ? '/admin/assessments' : '/recruiter/dashboard'} />
                    </div>
                </div>
            </div>
        );
    }

    // ── Render: Already Submitted (candidate already took this test) ────────
    if (assessment?.already_submitted) {
        const score = assessment.previous_score ?? 0;
        const total = assessment.max_score ?? 0;
        const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

        return (
            <div className="ap-page">
                <div className="ap-card ap-result">
                    <div className="ap-result-icon">✅</div>
                    <h2>Assessment Already Completed</h2>
                    <p className="ap-result-message">
                        You have already submitted this assessment.
                    </p>

                    <div className="ap-score-box">
                        <span className="ap-score-value">{percentage}%</span>
                        <span className="ap-score-label">
                            {score} / {total} pts
                        </span>
                    </div>

                    {renderAiFeedbackSection()}

                    <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link
                            to={`/assessments/${assessmentId}/leaderboard`}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px 24px',
                                background: 'linear-gradient(135deg, #0f172a, #334155)',
                                color: '#fbbf24',
                                borderRadius: '10px',
                                textDecoration: 'none',
                                fontWeight: '700',
                                border: '1px solid rgba(251, 191, 36, 0.4)',
                                boxShadow: '0 4px 14px rgba(15,23,42,0.2)'
                            }}
                        >
                            🏆 View Assessment Leaderboard
                        </Link>
                        <Link
                            to="/jobs"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px 24px',
                                background: '#f1f5f9',
                                color: '#334155',
                                borderRadius: '10px',
                                textDecoration: 'none',
                                fontWeight: '600',
                            }}
                        >
                            ← Back to Jobs
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // ── Render: Results (after submission) ───────────────────────────────────
    if (isSuccess && result) {
        // result shape from backend: { score, totalPossible }
        const percentage = result.totalPossible > 0
            ? Math.round((result.score / result.totalPossible) * 100)
            : 0;

        return (
            <div className="ap-page">
                <div className="ap-card ap-result">
                    <div className="ap-result-icon">🎉</div>
                    <h2>Assessment Complete!</h2>
                    <p className="ap-result-message">
                        You scored {result.score} out of {result.totalPossible} points
                    </p>

                    <div className="ap-score-box">
                        <span className="ap-score-value">{percentage}%</span>
                        <span className="ap-score-label">
                            {result.score} / {result.totalPossible} pts
                        </span>
                    </div>

                    {renderAiFeedbackSection()}

                    <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link
                            to={`/assessments/${assessmentId}/leaderboard`}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px 24px',
                                background: 'linear-gradient(135deg, #0f172a, #334155)',
                                color: '#fbbf24',
                                borderRadius: '10px',
                                textDecoration: 'none',
                                fontWeight: '700',
                                border: '1px solid rgba(251, 191, 36, 0.4)',
                                boxShadow: '0 4px 14px rgba(15,23,42,0.2)'
                            }}
                        >
                            🏆 View Assessment Leaderboard
                        </Link>
                        <Link
                            to="/jobs"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px 24px',
                                background: '#f1f5f9',
                                color: '#334155',
                                borderRadius: '10px',
                                textDecoration: 'none',
                                fontWeight: '600',
                            }}
                        >
                            ← Back to Jobs
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // ── Render: Quiz ─────────────────────────────────────────────────────────
    // Guard: if assessment is somehow still undefined here (e.g. edge case
    // between status transitions), return null rather than crashing.
    if (!assessment || !assessment.questions?.length) return null;

    const currentQuestion = assessment.questions[currentIndex];
    const isTimeLow       = timeLeft !== null && timeLeft <= 30;

    return (
        <div className="ap-page">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <header className="ap-header">
                <div className="ap-header-left">
                    <h1 className="ap-title">{assessment.title}</h1>
                    <p className="ap-progress-text">
                        {answeredCount} of {totalQuestions} answered
                    </p>
                </div>

                <div className="ap-header-right">
                    {/* Timer — turns red when ≤ 30 s left */}
                    <div className={`ap-timer ${isTimeLow ? 'ap-timer--low' : ''}`}>
                        ⏱ {timeLeft === null ? '...' : formatTime(timeLeft)}
                    </div>
                    {/* Exam mode has no navbar — give candidates an explicit way out */}
                    <button type="button" className="ap-exit-btn" onClick={handleExit}>
                        ✕ Exit
                    </button>
                </div>
            </header>


            {/* ── Progress Bar ─────────────────────────────────────────── */}
            <div className="ap-progress-bar-track">
                <div
                    className="ap-progress-bar-fill"
                    style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
                />
            </div>


            {/* ── Question Navigation Pills ─────────────────────────────── */}
            <div className="ap-question-nav">
                {assessment.questions.map((q, idx) => (
                    <button
                        key={q.id}
                        id={`ap-nav-q${idx + 1}`}
                        onClick={() => setCurrentIndex(idx)}
                        className={[
                            'ap-nav-pill',
                            idx === currentIndex ? 'ap-nav-pill--active' : '',
                            answers[q.id]        ? 'ap-nav-pill--answered' : ''
                        ].join(' ')}
                    >
                        {idx + 1}
                    </button>
                ))}
            </div>


            {/* ── Question Card ────────────────────────────────────────── */}
            <div className="ap-card ap-question-card">
                <p className="ap-question-number">
                    Question {currentIndex + 1} of {totalQuestions}
                </p>
                <h2 className="ap-question-text">{currentQuestion.question_text}</h2>

                {/* Question Type: text / coding or MCQ */}
                {currentQuestion.question_type === 'text' || currentQuestion.question_type === 'coding' ? (
                    <div className="ap-text-answer-wrap" style={{ marginTop: '1.25rem' }}>
                        <textarea
                            id={`ap-text-${currentQuestion.id}`}
                            rows={currentQuestion.question_type === 'coding' ? 8 : 4}
                            placeholder={currentQuestion.question_type === 'coding' ? 'Type or paste your code solution here...' : 'Type your answer here...'}
                            value={answers[currentQuestion.id] || ''}
                            onChange={(e) => handleSelectAnswer(currentQuestion.id, e.target.value)}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                borderRadius: '10px',
                                border: '1px solid #cbd5e1',
                                fontFamily: currentQuestion.question_type === 'coding' ? 'monospace' : 'inherit',
                                fontSize: '0.95rem',
                                resize: 'vertical',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>
                ) : (
                    <div className="ap-options">
                        {(currentQuestion.options || []).map((optionText, idx) => {
                            const letter = String.fromCharCode(65 + idx);
                            const isSelected = answers[currentQuestion.id] === optionText;

                            return (
                                <button
                                    key={optionText || idx}
                                    id={`ap-option-${currentQuestion.id}-${idx}`}
                                    onClick={() => handleSelectAnswer(currentQuestion.id, optionText)}
                                    className={`ap-option ${isSelected ? 'ap-option--selected' : ''}`}
                                >
                                    <span className="ap-option-key">{letter}</span>
                                    <span className="ap-option-label">{optionText}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>


            {/* ── Navigation Buttons ───────────────────────────────────── */}
            <div className="ap-nav-buttons">
                <button
                    id="ap-btn-prev"
                    className="ap-btn ap-btn--secondary"
                    onClick={() => setCurrentIndex(prev => prev - 1)}
                    disabled={currentIndex === 0}
                >
                    ← Previous
                </button>

                {currentIndex < totalQuestions - 1 ? (
                    <button
                        id="ap-btn-next"
                        className="ap-btn ap-btn--primary"
                        onClick={() => setCurrentIndex(prev => prev + 1)}
                    >
                        Next →
                    </button>
                ) : (
                    /*
                     * Submit button.
                     *
                     * `canSubmit` is the DERIVED VALUE from Q5 — computed from state,
                     * never stored in state. The button is disabled until every
                     * question has an answer (canSubmit === false).
                     */
                    <button
                        id="ap-btn-submit"
                        className="ap-btn ap-btn--submit"
                        onClick={handleSubmit}
                        disabled={!canSubmit || isSubmitting || submitted}
                    >
                        {isSubmitting ? 'Submitting…' : 'Submit Assessment'}
                    </button>
                )}
            </div>


            {/* ── Submit Error ─────────────────────────────────────────── */}
            {isSubmitError && (
                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <p className="ap-submit-error">
                        ⚠️ {submitError?.response?.data?.message ?? 'Submission failed. Please try again.'}
                    </p>
                    <button
                        type="button"
                        className="ap-btn ap-btn--submit"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        style={{ marginTop: '8px', display: 'inline-block' }}
                    >
                        {isSubmitting ? 'Retrying…' : '🔄 Retry Submit'}
                    </button>
                </div>
            )}

        </div>
    );
};

export default AssessmentPage;
