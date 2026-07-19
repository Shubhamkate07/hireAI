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

import { useState, useEffect } from 'react';
import { useParams }           from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getAssessment, submitAssessment } from '../../services/assessmentService';
import './AssessmentPage.css';


// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// Formats seconds into "MM:SS" string for the timer display
const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};


// ─────────────────────────────────────────────────────────────────────────────
// AssessmentPage Component
// ─────────────────────────────────────────────────────────────────────────────
const AssessmentPage = () => {

    // ── Route Params ──────────────────────────────────────────────────────────
    // URL: /assessments/:assessmentId
    // This matches the backend resource key: GET /api/assessments/:id
    const { assessmentId } = useParams();


    // ─────────────────────────────────────────────────────────────────────────
    // INTERVIEW Q1 ANSWER — State model for answers
    //
    // We use a SINGLE OBJECT keyed by question ID:
    //   { 1: "useEffect", 2: "When the effect re-runs" }
    //
    // Not an array, because:
    //   • O(1) read/write: answers[1] = "useEffect"
    //   • The value stored is the full option TEXT string — exactly what the
    //     backend compares against correct_answer. No transformation needed.
    //   • Easy to check if a question is answered: answers[question.id] !== undefined
    // ─────────────────────────────────────────────────────────────────────────
    const [answers, setAnswers] = useState({});          // { questionId: optionText }

    const [currentIndex, setCurrentIndex] = useState(0); // which question we're viewing
    const [timeLeft, setTimeLeft]         = useState(null); // seconds remaining
    const [submitted, setSubmitted]       = useState(false); // did the user submit?


    // ── Fetch Assessment ──────────────────────────────────────────────────────────
    // useQuery manages: loading, error, caching, and background refetch.
    // queryKey: ['assessment', assessmentId] — cache is keyed by the assessment ID.
    //   If the user navigates to a different assessment, React Query fetches fresh data.
    // queryFn:  calls assessmentService.getAssessment(assessmentId)
    //   → GET /api/assessments/:id
    //   → backend strips correct_answer for candidate role before responding
    const {
        data: assessment,
        isLoading,
        isError,
        error
    } = useQuery({
        queryKey: ['assessment', assessmentId],
        queryFn:  () => getAssessment(assessmentId),
    });


    // ── Initialise Timer When Data Arrives ────────────────────────────────────
    // assessment.time_limit_minutes → convert to seconds for the countdown.
    useEffect(() => {
        if (assessment && timeLeft === null) {
            setTimeLeft(assessment.time_limit_minutes * 60);
        }
    }, [assessment, timeLeft]);


    // ─────────────────────────────────────────────────────────────────────────
    // INTERVIEW Q2 ANSWER — Timer with cleanup function
    //
    // setInterval returns an ID (a number). Without clearInterval(id), the
    // interval keeps firing even after the component unmounts (e.g., user
    // navigates away). This causes:
    //   1. A memory leak — the interval stays alive forever.
    //   2. A React warning — state update on unmounted component.
    //
    // The cleanup function (the function returned from useEffect) is called
    // by React when:
    //   • The component unmounts
    //   • The dependencies change (which re-runs the effect)
    //
    // clearInterval(id) is the cleanup — it tells the browser: "stop that interval."
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {

        // Don't start a timer if there's nothing to count down, or already submitted
        if (timeLeft === null || submitted) return;

        // Timer ran out — auto-submit
        if (timeLeft === 0) {
            // We only auto-submit if user hasn't already clicked "Submit"
            if (!submitted) {
                handleSubmit();
            }
            return;
        }

        // Start the interval — fires every 1000ms (1 second)
        const intervalId = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        // CLEANUP FUNCTION — React calls this when the component unmounts
        // or before the effect runs again. This prevents the memory leak.
        return () => clearInterval(intervalId);

    }, [timeLeft, submitted]); // re-runs whenever timeLeft or submitted changes


    // ── Submit Mutation ───────────────────────────────────────────────────────
    // useMutation is for operations that change data (POST/PATCH/DELETE).
    // Unlike useQuery, it doesn't run automatically — we call mutate() manually.
    const {
        mutate: submitMutation,
        isPending: isSubmitting,
        isSuccess,
        data: result,
        isError: isSubmitError,
        error: submitError,
    } = useMutation({
        // Build submittedAnswers array: [ { questionId, answer }, ... ]
        // This is what the backend expects — NOT a score, NOT an object keyed by id.
        mutationFn: () => {
            const submittedAnswers = Object.entries(answers).map(([questionId, answer]) => ({
                questionId: Number(questionId),
                answer,
            }));
            return submitAssessment(assessmentId, submittedAnswers);
        },
        onSuccess: () => {
            setSubmitted(true);
        }
    });

    // Wrapper so we can call it both from the button AND from the timer
    const handleSubmit = () => {
        if (!isSubmitting && !submitted) {
            submitMutation();
        }
    };


    // ── Answer Selection Handler ──────────────────────────────────────────────
    // When user clicks an option, we update the answers object.
    // We spread the old answers and set the new key-value pair.
    const handleSelectAnswer = (questionId, optionKey) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: optionKey  // e.g. { "10": "b" }
        }));
    };


    // ─────────────────────────────────────────────────────────────────────────
    // INTERVIEW Q5 ANSWER — Derived value: canSubmit
    //
    // canSubmit is NOT stored in useState — it is derived (calculated) from
    // the `answers` state on every render.
    //
    // If we stored it in state: we'd have to remember to update it every time
    // `answers` changes — two pieces of state to keep in sync = bug waiting to happen.
    //
    // Instead: we compute it here. React re-renders whenever state changes,
    // so canSubmit is always fresh and always correct.
    // ─────────────────────────────────────────────────────────────────────────
    const totalQuestions = assessment?.questions?.length ?? 0;
    const answeredCount  = Object.keys(answers).length;
    const canSubmit      = answeredCount === totalQuestions && totalQuestions > 0;
    //          ↑ derived value — computed from `answers` state, never stored separately


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
        return (
            <div className="ap-page">
                <div className="ap-card ap-error">
                    <span className="ap-error-icon">⚠️</span>
                    <h2>Could not load assessment</h2>
                    <p>{error?.message ?? 'An unexpected error occurred'}</p>
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

                {/* Timer — turns red when ≤ 30 s left */}
                <div className={`ap-timer ${isTimeLow ? 'ap-timer--low' : ''}`}>
                    ⏱ {formatTime(timeLeft ?? 0)}
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

                {/* Options — each option is a plain string from the DB */}
                <div className="ap-options">
                    {currentQuestion.options.map((optionText, idx) => {
                        // Use array index as a stable letter key: 0='A', 1='B', etc.
                        const letter = String.fromCharCode(65 + idx); // 'A','B','C','D'

                        // An option is selected if the candidate's stored answer
                        // for this question matches the option text.
                        const isSelected = answers[currentQuestion.id] === optionText;

                        return (
                            <button
                                key={optionText}
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
                        disabled={!canSubmit || isSubmitting}
                    >
                        {isSubmitting ? 'Submitting…' : 'Submit Assessment'}
                    </button>
                )}
            </div>


            {/* ── Submit Error ─────────────────────────────────────────── */}
            {isSubmitError && (
                <p className="ap-submit-error">
                    ⚠️ {submitError?.response?.data?.message ?? 'Submission failed. Please try again.'}
                </p>
            )}

        </div>
    );
};

export default AssessmentPage;
