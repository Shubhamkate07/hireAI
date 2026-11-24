import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getAdminAssessmentFull,
    updateAdminAssessment,
    addAdminQuestion,
    updateAdminQuestion,
    deleteAdminQuestion,
    getAdminJobs,
} from '../../services/adminService';
import { generateAssessmentQuestionsAI } from '../../services/aiService';
import './AdminDashboard.css';
import BackButton from '../../Components/BackButton';

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

    // AI Question Generator Modal State
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiRole, setAiRole] = useState('');
    const [aiDifficulty, setAiDifficulty] = useState('Intermediate');
    const [aiCount, setAiCount] = useState(5);
    const [aiMode, setAiMode] = useState('append'); // 'append' | 'replace'
    const [aiModalError, setAiModalError] = useState('');
    const [aiSuccessMessage, setAiSuccessMessage] = useState('');

    // AI Question Generation Mutation
    const generateQuestionsMutation = useMutation({
        mutationFn: generateAssessmentQuestionsAI,
        onSuccess: (generatedQuestions) => {
            if (!Array.isArray(generatedQuestions) || generatedQuestions.length === 0) {
                setAiModalError('No questions were generated. Please try again with a different title or prompt.');
                return;
            }

            const formatted = generatedQuestions.map((q) => {
                let opts = ['', '', '', ''];
                if (Array.isArray(q.options) && q.options.length > 0) {
                    opts = [...q.options, '', '', '', ''].slice(0, 4);
                }
                return {
                    id: null, // new questions
                    question_text: q.question_text || '',
                    question_type: q.question_type || 'mcq',
                    options: opts,
                    correct_answer: q.correct_answer || (opts[0] || ''),
                    points: Number(q.points) > 0 ? Number(q.points) : 10,
                };
            });

            if (aiMode === 'replace') {
                setQuestions(formatted);
            } else {
                setQuestions((prev) => [...prev, ...formatted]);
            }

            setActionSuccess(`✨ Generated ${formatted.length} questions successfully with Gemini AI! Remember to click "Save All Changes" to persist them.`);
            setAiSuccessMessage(`✨ Generated ${formatted.length} questions successfully!`);
            setIsAiModalOpen(false);
            setAiModalError('');
        },
        onError: (err) => {
            setAiModalError(err?.response?.data?.message || err?.message || 'Failed to generate questions with AI.');
        },
    });

    const handleOpenAiModal = () => {
        if (!aiRole.trim()) {
            if (title.trim()) {
                setAiRole(title.trim().replace(/\s*(Technical Screen|Assessment|Quiz)$/i, ''));
            } else if (jobId) {
                const matchingJob = jobs.find((j) => String(j.id) === String(jobId));
                if (matchingJob) {
                    setAiRole(matchingJob.title);
                }
            }
        }
        setAiModalError('');
        setIsAiModalOpen(true);
    };

    const handleAiSubmit = (e) => {
        e.preventDefault();
        if (!aiRole.trim()) {
            setAiModalError('Please enter a role or topic.');
            return;
        }
        setAiModalError('');
        generateQuestionsMutation.mutate({
            roleTitle: aiRole.trim(),
            difficulty: aiDifficulty,
            count: aiCount,
        });
    };

    // Fetch assessment full details (with questions and correct_answers)
    const { data: assessmentData, isLoading: isAssessmentLoading, isError, error } = useQuery({
        queryKey: ['admin', 'assessment', assessmentId],
        queryFn: () => getAdminAssessmentFull(assessmentId),
        enabled: !!assessmentId,
    });

    // Fetch jobs for dropdown selection
    const { data: jobsData } = useQuery({
        queryKey: ['admin', 'jobs-dropdown'],
        queryFn: () => getAdminJobs({ pageParam: 1, limit: 100 }),
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
                        points: q.points !== undefined && q.points !== null && !isNaN(Number(q.points)) ? Math.max(0, Number(q.points)) : 10,
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
        if (!window.confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
            return;
        }
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
            const updatedList = [...questions];
            for (let i = 0; i < updatedList.length; i++) {
                const q = updatedList[i];
                const payload = {
                    question_text: q.question_text.trim(),
                    question_type: q.question_type || 'mcq',
                    options: (q.options || []).filter((opt) => opt.trim() !== ''),
                    correct_answer: (q.correct_answer || '').trim(),
                    points: q.points !== undefined && q.points !== null && !isNaN(Number(q.points)) ? Math.max(0, Number(q.points)) : 10,
                };

                if (q.id) {
                    await updateAdminQuestion(q.id, payload);
                } else {
                    const res = await addAdminQuestion(assessmentId, payload);
                    const newId = res?.id || res?.data?.id || res?.questionId;
                    if (newId) {
                        q.id = newId;
                    }
                }
            }
            setQuestions(updatedList);

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
            <div className="admin-shell">
                <div className="admin-page-container">
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#6366f1' }}>
                        Loading assessment details...
                    </div>
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="admin-shell">
                <div className="admin-page-container">
                    <BackButton to="/admin/assessments" label="Back to Assessments" />
                    <div className="admin-alert admin-alert-danger">
                        ⚠️ {error?.response?.data?.message || 'Failed to load assessment.'}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-shell">
            <div className="admin-page-container">
            <div className="admin-header-banner">
                <div className="admin-breadcrumb">
                    <BackButton to="/admin/assessments" label="Back to Assessments" />
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
                    {aiSuccessMessage && (
                        <div className="admin-alert admin-alert-success" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{aiSuccessMessage}</span>
                            <button
                                type="button"
                                onClick={() => setAiSuccessMessage('')}
                                style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                        <h2 style={{ fontSize: '1.15rem', color: '#f8fafc', margin: 0 }}>
                            ❓ Questions ({questions.length})
                        </h2>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <button
                                type="button"
                                onClick={handleOpenAiModal}
                                className="btn-action"
                                style={{
                                    background: 'linear-gradient(135deg, #4f46e5, #9333ea)',
                                    color: '#ffffff',
                                    border: 'none',
                                    height: '38px',
                                    padding: '0 16px',
                                    fontWeight: 700,
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
                                }}
                            >
                                ✨ Generate with AI
                            </button>
                            <button
                                type="button"
                                onClick={handleAddQuestionCard}
                                className="btn-action btn-activate"
                                style={{
                                    height: '38px',
                                    padding: '0 16px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                + Add Question
                            </button>
                        </div>
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
                                            min="0"
                                            value={q.points}
                                            onChange={(e) => handleQuestionChange(qIdx, 'points', e.target.value)}
                                            className="admin-input"
                                        />
                                    </div>
                                </div>

                                {/* Options & Correct Answer Selection */}
                                {q.question_type === 'mcq' && (
                                    <div style={{ marginTop: '12px', background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                        <label className="admin-label" style={{ marginBottom: '10px', display: 'block' }}>
                                            Options & Select Correct Answer:
                                        </label>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                                            {q.options.map((optText, optIdx) => {
                                                const letter = String.fromCharCode(65 + optIdx);
                                                const isCorrect = q.correct_answer !== '' && q.correct_answer === optText;

                                                return (
                                                    <div
                                                        key={optIdx}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            background: isCorrect ? 'rgba(34, 197, 94, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                                                            border: `1px solid ${isCorrect ? 'rgba(34, 197, 94, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                                                            borderRadius: '8px',
                                                            padding: '6px 10px',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                    >
                                                        <span style={{ color: isCorrect ? '#4ade80' : '#94a3b8', fontWeight: 700, width: '20px' }}>{letter}.</span>
                                                        <input
                                                            type="text"
                                                            value={optText}
                                                            onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                                                            placeholder={`Option ${letter}`}
                                                            style={{
                                                                flex: 1,
                                                                background: 'transparent',
                                                                border: 'none',
                                                                color: '#f8fafc',
                                                                fontSize: '0.9rem',
                                                                outline: 'none',
                                                                minWidth: '60px'
                                                            }}
                                                        />
                                                        <label
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '5px',
                                                                cursor: optText.trim() ? 'pointer' : 'default',
                                                                padding: '4px 8px',
                                                                borderRadius: '6px',
                                                                background: isCorrect ? '#16a34a' : 'rgba(255, 255, 255, 0.05)',
                                                                color: isCorrect ? '#ffffff' : '#94a3b8',
                                                                fontSize: '0.78rem',
                                                                fontWeight: 600,
                                                                whiteSpace: 'nowrap',
                                                                flexShrink: 0
                                                            }}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name={`correct_${qIdx}`}
                                                                checked={isCorrect}
                                                                onChange={() => handleQuestionChange(qIdx, 'correct_answer', optText)}
                                                                disabled={!optText.trim()}
                                                                style={{ margin: 0, cursor: 'pointer' }}
                                                            />
                                                            <span>{isCorrect ? 'Correct ✓' : 'Mark'}</span>
                                                        </label>
                                                    </div>
                                                );
                                            })}
                                        </div>
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

            {/* AI Question Generator Modal for Admin */}
            {isAiModalOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.75)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: '1rem',
                    }}
                    onClick={() => !generateQuestionsMutation.isPending && setIsAiModalOpen(false)}
                >
                    <div
                        style={{
                            background: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '16px',
                            width: '100%',
                            maxWidth: '520px',
                            padding: '2rem',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                            color: '#f8fafc',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '1.6rem' }}>✨</span>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                                        AI Question Generator (Admin)
                                    </h3>
                                    <span style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: 600 }}>
                                        Powered by Google Gemini
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAiModalOpen(false)}
                                style={{
                                    background: '#334155',
                                    border: 'none',
                                    borderRadius: '8px',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#94a3b8',
                                    fontWeight: 700,
                                }}
                                disabled={generateQuestionsMutation.isPending}
                            >
                                ✕
                            </button>
                        </div>

                        {aiModalError && (
                            <div className="admin-alert admin-alert-danger" style={{ marginBottom: '1.25rem' }}>
                                <span>⚠️ {aiModalError}</span>
                            </div>
                        )}

                        <form onSubmit={handleAiSubmit}>
                            <div className="admin-form-group">
                                <label className="admin-label">Job Role / Tech Stack *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Senior React Developer, Node.js Backend..."
                                    value={aiRole}
                                    onChange={(e) => setAiRole(e.target.value)}
                                    className="admin-input"
                                    disabled={generateQuestionsMutation.isPending}
                                    required
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1.25rem' }}>
                                <div>
                                    <label className="admin-label">Difficulty Level</label>
                                    <select
                                        value={aiDifficulty}
                                        onChange={(e) => setAiDifficulty(e.target.value)}
                                        className="admin-select"
                                        disabled={generateQuestionsMutation.isPending}
                                    >
                                        <option value="Beginner">Beginner (Junior)</option>
                                        <option value="Intermediate">Intermediate (Mid-level)</option>
                                        <option value="Advanced">Advanced (Senior / Lead)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="admin-label">Question Count</label>
                                    <select
                                        value={aiCount}
                                        onChange={(e) => setAiCount(Number(e.target.value))}
                                        className="admin-select"
                                        disabled={generateQuestionsMutation.isPending}
                                    >
                                        <option value={3}>3 Questions</option>
                                        <option value={5}>5 Questions</option>
                                        <option value={8}>8 Questions</option>
                                        <option value={10}>10 Questions</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label className="admin-label">Action Mode</label>
                                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '6px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem', color: '#cbd5e1' }}>
                                        <input
                                            type="radio"
                                            name="adminAiMode"
                                            value="append"
                                            checked={aiMode === 'append'}
                                            onChange={() => setAiMode('append')}
                                            disabled={generateQuestionsMutation.isPending}
                                        />
                                        Append to existing questions
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem', color: '#cbd5e1' }}>
                                        <input
                                            type="radio"
                                            name="adminAiMode"
                                            value="replace"
                                            checked={aiMode === 'replace'}
                                            onChange={() => setAiMode('replace')}
                                            disabled={generateQuestionsMutation.isPending}
                                        />
                                        Replace all questions
                                    </label>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsAiModalOpen(false)}
                                    className="btn-cancel"
                                    style={{ padding: '8px 16px' }}
                                    disabled={generateQuestionsMutation.isPending}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-action"
                                    style={{
                                        background: 'linear-gradient(135deg, #4f46e5, #9333ea)',
                                        color: '#ffffff',
                                        border: 'none',
                                        padding: '8px 20px',
                                        fontWeight: 700,
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                    }}
                                    disabled={generateQuestionsMutation.isPending}
                                >
                                    {generateQuestionsMutation.isPending ? '✨ Generating...' : '✨ Generate Questions'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
        </div>
    );
};

export default AdminEditAssessmentPage;
