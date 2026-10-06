import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getAdminAssessmentFull,
    updateAdminAssessment,
    addAdminQuestion,
    updateAdminQuestion,
    deleteAdminQuestion,
    getAdminJobs,
} from '../../services/adminService';
import './AdminDashboard.css';

const AdminEditAssessmentPage = () => {
    const { id: assessmentId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [timeLimit, setTimeLimit] = useState(30);
    const [jobId, setJobId] = useState('');
    const [questions, setQuestions] = useState([]);
    const [actionError, setActionError] = useState('');
    const [actionSuccess, setActionSuccess] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Fetch assessment full details (with questions and correct_answers)
    const { data: assessmentData, isLoading: isAssessmentLoading, isError, error } = useQuery({
        queryKey: ['admin', 'assessment', assessmentId],
        queryFn: () => getAdminAssessmentFull(assessmentId),
        enabled: !!assessmentId,
    });

    // Fetch jobs for dropdown selection
    const { data: jobsData } = useQuery({
        queryKey: ['admin', 'jobs-dropdown'],
        queryFn: () => getAdminJobs({ pageParam: 1 }),
    });

    const jobs = jobsData?.jobs || [];

    // Populate form state when assessment details arrive
    useEffect(() => {
        if (assessmentData) {
            setTitle(assessmentData.title || '');
            setDescription(assessmentData.description || '');
            setTimeLimit(assessmentData.time_limit_minutes || 30);
            setJobId(assessmentData.job_id ? String(assessmentData.job_id) : '');
            if (assessmentData.questions?.length > 0) {
                setQuestions(
                    assessmentData.questions.map((q) => ({
                        id: q.id, // existing question ID (null for newly added local ones)
                        question_text: q.question_text || '',
                        question_type: q.question_type || 'mcq',
                        options: Array.isArray(q.options) && q.options.length >= 4
                            ? q.options
                            : Array.isArray(q.options)
                                ? [...q.options, '', '', '', ''].slice(0, 4)
                                : ['', '', '', ''],
                        correct_answer: q.correct_answer || '',
                        points: q.points || 10,
                    }))
                );
            } else {
                setQuestions([]);
            }
        }
    }, [assessmentData]);

    const handleAddQuestionCard = () => {
        setQuestions((prev) => [
            ...prev,
            {
                id: null,
                question_text: '',
                question_type: 'mcq',
                options: ['', '', '', ''],
                correct_answer: '',
                points: 10,
            },
        ]);
    };

    const handleRemoveQuestionCard = async (index, qId) => {
        if (qId) {
            try {
                await deleteAdminQuestion(qId);
            } catch (err) {
                setActionError(`Failed to delete question ID #${qId}`);
                return;
            }
        }
        setQuestions((prev) => prev.filter((_, i) => i !== index));
    };

    const handleQuestionChange = (index, field, value) => {
        setQuestions((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const handleOptionChange = (qIndex, optIndex, value) => {
        setQuestions((prev) => {
            const updated = [...prev];
            const options = [...updated[qIndex].options];
            const oldVal = options[optIndex];
            options[optIndex] = value;

            let correctAnswer = updated[qIndex].correct_answer;
            if (correctAnswer === oldVal) {
                correctAnswer = value;
            }

            updated[qIndex] = {
                ...updated[qIndex],
                options,
                correct_answer: correctAnswer,
            };
            return updated;
        });
    };

    const handleSaveAll = async (e) => {
        e.preventDefault();
        setActionError('');
        setActionSuccess('');

        if (!title.trim()) {
            setActionError('Assessment title cannot be empty.');
            return;
        }

        setIsSaving(true);
        try {
            // 1. Update assessment header details
            await updateAdminAssessment(assessmentId, {
                title: title.trim(),
                description: description.trim(),
                time_limit_minutes: Number(timeLimit) || 30,
                job_id: jobId ? Number(jobId) : null,
            });

            // 2. Sync questions (update existing ones, create new ones)
            for (const q of questions) {
                const payload = {
                    question_text: q.question_text.trim(),
                    question_type: q.question_type || 'mcq',
                    options: q.options.filter((opt) => opt.trim() !== ''),
                    correct_answer: q.correct_answer.trim(),
                    points: Number(q.points) || 10,
                };

                if (q.id) {
                    await updateAdminQuestion(q.id, payload);
                } else {
                    await addAdminQuestion(assessmentId, payload);
                }
            }

            setActionSuccess('Assessment and questions updated successfully!');
            queryClient.invalidateQueries({ queryKey: ['admin', 'assessment', assessmentId] });
            queryClient.invalidateQueries({ queryKey: ['admin', 'assessments'] });
            setTimeout(() => setActionSuccess(''), 3000);
        } catch (err) {
            setActionError(err?.response?.data?.message || err?.message || 'Failed to save changes.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isAssessmentLoading) {
        return (
            <div className="admin-page-container">
                <div style={{ padding: '3rem', textAlign: 'center', color: '#6366f1' }}>
                    Loading assessment details...
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="admin-page-container">
                <div className="admin-alert admin-alert-danger">
                    ⚠️ {error?.response?.data?.message || 'Failed to load assessment.'}
                </div>
            </div>
        );
    }

    return (
        <div className="admin-page-container">
            <div className="admin-header-banner">
                <div className="admin-breadcrumb">
                    <Link to="/admin/assessments" className="admin-back-link">← Back to Assessments List</Link>
                </div>
                <h1 className="admin-page-title">✏️ Edit Assessment #{assessmentId}</h1>
                <p className="admin-page-subtitle">Full administrative editor for test settings, question options, and correct answers.</p>
            </div>

            {actionSuccess && (
                <div className="admin-alert admin-alert-success">
                    ✅ {actionSuccess}
                </div>
            )}

            {actionError && (
                <div className="admin-alert admin-alert-danger">
                    ⚠️ {actionError}
                </div>
            )}

            <form onSubmit={handleSaveAll}>
                {/* 1. Header Details Card */}
                <div className="admin-card" style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '1.15rem', color: '#f8fafc', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        ⚙️ Assessment Details
                    </h2>

                    <div className="admin-form-group">
                        <label className="admin-label">Assessment Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="admin-input"
                            required
                        />
                    </div>

                    <div className="admin-form-group">
                        <label className="admin-label">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="admin-input"
                            style={{ height: '75px', resize: 'vertical' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="admin-form-group">
                            <label className="admin-label">Time Limit (Minutes) *</label>
                            <input
                                type="number"
                                min="5"
                                max="180"
                                value={timeLimit}
                                onChange={(e) => setTimeLimit(e.target.value)}
                                className="admin-input"
                                required
                            />
                        </div>

                        <div className="admin-form-group">
                            <label className="admin-label">Linked Job Posting</label>
                            <select
                                value={jobId}
                                onChange={(e) => setJobId(e.target.value)}
                                className="admin-select"
                            >
                                <option value="">-- Standalone (No Job Linked) --</option>
                                {jobs.map((j) => (
                                    <option key={j.id} value={j.id}>
                                        {j.title} ({j.company})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* 2. Questions Editor Card */}
                <div className="admin-card" style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h2 style={{ fontSize: '1.15rem', color: '#f8fafc', margin: 0 }}>
                            ❓ Questions ({questions.length})
                        </h2>
                        <button
                            type="button"
                            onClick={handleAddQuestionCard}
                            className="btn-action btn-activate"
                            style={{ padding: '8px 16px' }}
                        >
                            + Add Question
                        </button>
                    </div>

                    {questions.length === 0 ? (
                        <div className="admin-empty-state">
                            <span style={{ fontSize: '2rem' }}>❓</span>
                            <p style={{ margin: 0, color: '#94a3b8' }}>No questions added yet. Click "+ Add Question" to create one.</p>
                        </div>
                    ) : (
                        questions.map((q, qIdx) => (
                            <div key={qIdx} className="admin-question-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <span style={{ fontWeight: 700, color: '#818cf8', fontSize: '0.95rem' }}>
                                        Question #{qIdx + 1} {q.id ? `(ID #${q.id})` : '(New)'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveQuestionCard(qIdx, q.id)}
                                        className="btn-action btn-delete"
                                    >
                                        Delete Question
                                    </button>
                                </div>

                                <div className="admin-form-group">
                                    <label className="admin-label">Question Text *</label>
                                    <input
                                        type="text"
                                        value={q.question_text}
                                        onChange={(e) => handleQuestionChange(qIdx, 'question_text', e.target.value)}
                                        placeholder="e.g. What is the output of typeof NaN?"
                                        className="admin-input"
                                        required
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
                                    <div>
                                        <label className="admin-label">Question Type</label>
                                        <select
                                            value={q.question_type}
                                            onChange={(e) => handleQuestionChange(qIdx, 'question_type', e.target.value)}
                                            className="admin-select"
                                        >
                                            <option value="mcq">Multiple Choice (MCQ)</option>
                                            <option value="text">Text Response</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="admin-label">Points</label>
                                        <input
                                            type="number"
                                            value={q.points}
                                            onChange={(e) => handleQuestionChange(qIdx, 'points', e.target.value)}
                                            className="admin-input"
                                        />
                                    </div>
                                </div>

                                {/* Options & Correct Answer Selection */}
                                {q.question_type === 'mcq' && (
                                    <div style={{ marginTop: '12px', background: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
                                        <label className="admin-label" style={{ marginBottom: '8px', display: 'block' }}>
                                            Options & Select Correct Answer (●):
                                        </label>
                                        {q.options.map((optText, optIdx) => {
                                            const letter = String.fromCharCode(65 + optIdx);
                                            const isCorrect = q.correct_answer !== '' && q.correct_answer === optText;

                                            return (
                                                <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                                    <input
                                                        type="radio"
                                                        name={`correct_${qIdx}`}
                                                        checked={isCorrect}
                                                        onChange={() => handleQuestionChange(qIdx, 'correct_answer', optText)}
                                                        disabled={!optText.trim()}
                                                        title="Mark as correct answer"
                                                    />
                                                    <span style={{ color: '#94a3b8', fontWeight: 700, width: '20px' }}>{letter}.</span>
                                                    <input
                                                        type="text"
                                                        value={optText}
                                                        onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                                                        placeholder={`Option ${letter}`}
                                                        className="admin-input"
                                                    />
                                                    {isCorrect && <span style={{ color: '#34d399', fontSize: '0.85rem', fontWeight: 600 }}>✓ Correct</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Save Bar */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button
                        type="button"
                        onClick={() => navigate('/admin/assessments')}
                        className="btn-cancel"
                        style={{ padding: '12px 24px' }}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="btn-action btn-activate"
                        style={{ padding: '12px 32px', fontSize: '1rem', fontWeight: 700 }}
                    >
                        {isSaving ? 'Saving Changes...' : '💾 Save All Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AdminEditAssessmentPage;
