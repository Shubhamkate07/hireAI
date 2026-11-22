import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams, Link } from 'react-router-dom';
import BackButton from '../../Components/BackButton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRecruiterJobs } from '../../services/recruiterService';
import { createAssessment, updateAssessment, getAssessmentByJobId, getAssessment } from '../../services/assessmentService';
import { generateAssessmentQuestionsAI } from '../../services/aiService';

const CreateAssessmentPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id: routeAssessmentId } = useParams();
  const [searchParams] = useSearchParams();

  const queryJobId = searchParams.get('job_id') || '';
  const queryAssessmentId = searchParams.get('assessment_id') || routeAssessmentId || '';

  // Form state
  const [editingAssessmentId, setEditingAssessmentId] = useState(queryAssessmentId);
  const [jobId, setJobId] = useState(queryJobId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState(30);

  // Questions array state
  const [questions, setQuestions] = useState([
    {
      question_text: '',
      question_type: 'mcq',
      options: ['', '', '', ''],
      correct_answer: '',
      points: 10,
    },
  ]);

  const [formError, setFormError] = useState('');

  // AI Question Generator Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiRole, setAiRole] = useState('');
  const [aiDifficulty, setAiDifficulty] = useState('Intermediate');
  const [aiCount, setAiCount] = useState(5);
  const [aiMode, setAiMode] = useState('replace'); // 'replace' | 'append'
  const [aiModalError, setAiModalError] = useState('');
  const [aiSuccessMessage, setAiSuccessMessage] = useState('');

  const resetFormToDefaults = () => {
    setTitle('');
    setDescription('');
    setTimeLimit(30);
    setQuestions([
      {
        question_text: '',
        question_type: 'mcq',
        options: ['', '', '', ''],
        correct_answer: '',
        points: 10,
      },
    ]);
    setFormError('');
  };

  const handleJobChange = (newJobId) => {
    setJobId(newJobId);
    if (!editingAssessmentId) {
      resetFormToDefaults();
    }
  };

  // 1. Fetch recruiter's jobs for dropdown
  const { data: jobsResponse, isLoading: isJobsLoading } = useQuery({
    queryKey: ['recruiter-jobs'],
    queryFn: getRecruiterJobs,
  });

  const jobs = jobsResponse?.data || [];

  // 2. Check if selected job ALREADY has an assessment
  const { data: jobAssessmentData } = useQuery({
    queryKey: ['job-assessment-check', jobId],
    queryFn: () => getAssessmentByJobId(jobId),
    enabled: !!jobId && !editingAssessmentId,
  });

  // If selected job has an assessment and we are not explicitly editing another, set editing target
  useEffect(() => {
    if (jobAssessmentData?.id) {
      setEditingAssessmentId(String(jobAssessmentData.id));
    }
  }, [jobAssessmentData]);

  // 3. Fetch full assessment details (header + questions + correct_answers) if editing
  const { data: existingAssessment, isLoading: isExistingLoading } = useQuery({
    queryKey: ['assessment-edit', editingAssessmentId],
    queryFn: () => getAssessment(editingAssessmentId),
    enabled: !!editingAssessmentId,
  });

  // Populate form with existing assessment data when loaded
  useEffect(() => {
    if (existingAssessment) {
      setTitle(existingAssessment.title || '');
      setDescription(existingAssessment.description || '');
      setTimeLimit(existingAssessment.time_limit_minutes || 30);
      if (existingAssessment.job_id) {
        setJobId(String(existingAssessment.job_id));
      }

      if (existingAssessment.questions?.length > 0) {
        setQuestions(
          existingAssessment.questions.map((q) => ({
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
      }
    }
  }, [existingAssessment]);

  const isEditMode = !!editingAssessmentId;

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (payload) =>
      isEditMode
        ? updateAssessment(editingAssessmentId, payload)
        : createAssessment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recruiter-assessments'] });
      queryClient.invalidateQueries({ queryKey: ['job-assessment', jobId] });
      navigate('/recruiter/dashboard');
    },
    onError: (err) => {
      setFormError(err?.response?.data?.message || err?.message || 'Failed to save assessment.');
    },
  });

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
        setQuestions((prev) => {
          const isSingleEmpty =
            prev.length === 1 &&
            !prev[0].question_text.trim() &&
            !prev[0].correct_answer.trim();
          return isSingleEmpty ? formatted : [...prev, ...formatted];
        });
      }

      if (!title.trim() && aiRole.trim()) {
        setTitle(`${aiRole.trim()} Technical Assessment`);
      }

      setAiSuccessMessage(`✨ Generated ${formatted.length} questions successfully with Gemini AI!`);
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

  // Question manipulation handlers
  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        question_text: '',
        question_type: 'mcq',
        options: ['', '', '', ''],
        correct_answer: '',
        points: 10,
      },
    ]);
  };

  const handleRemoveQuestion = (index) => {
    if (questions.length === 1) {
      setFormError('An assessment must have at least one question.');
      return;
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
      // Only track rename if oldVal was non-empty and previously selected
      if (oldVal && correctAnswer === oldVal) {
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

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim()) {
      setFormError('Please enter an assessment title.');
      return;
    }

    if (questions.length === 0) {
      setFormError('Please add at least one question.');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim()) {
        setFormError(`Question #${i + 1} text is empty.`);
        return;
      }
      const isMcq = (q.question_type || 'mcq') === 'mcq';
      const filledOptions = (q.options || []).map((opt) => opt.trim()).filter(Boolean);
      if (isMcq && filledOptions.length < 2) {
        setFormError(`Question #${i + 1} must have at least 2 options.`);
        return;
      }
      if (isMcq && !q.correct_answer.trim()) {
        setFormError(`Please select the correct answer for Question #${i + 1}.`);
        return;
      }
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      job_id: jobId ? Number(jobId) : null,
      time_limit_minutes: Number(timeLimit) || 30,
      questions: questions.map((q) => {
        const trimmedOptions = (q.options || []).map((opt) => opt.trim()).filter(Boolean);
        return {
          question_text: q.question_text.trim(),
          question_type: q.question_type || 'mcq',
          options: trimmedOptions,
          correct_answer: q.correct_answer.trim(),
          points: q.points !== undefined && q.points !== null && !isNaN(Number(q.points)) ? Math.max(0, Number(q.points)) : 10,
        };
      }),
    };

    saveMutation.mutate(payload);
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.header}>
        <BackButton to="/recruiter/dashboard" label="Back to My Postings" />
        <h1 style={styles.heading}>
          {isEditMode ? '✏️ Edit Assessment' : '📝 Create New Assessment'}
        </h1>
        <p style={styles.subheading}>
          {isEditMode
            ? 'Update your assessment questions, options, time limit, or linked job.'
            : 'Design a technical screening quiz for candidates applying to your jobs.'}
        </p>
      </div>

      {isEditMode && isExistingLoading && (
        <div style={styles.card}>
          <p style={{ color: '#6366f1', fontWeight: 600 }}>Loading existing assessment data...</p>
        </div>
      )}

      {formError && (
        <div style={styles.errorBox}>
          <span>⚠️ {formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Basic Details Section */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>1. Basic Details</h2>

          <div style={styles.formGroup}>
            <label style={styles.label}>Link to Job Posting (Optional)</label>
            <select
              value={jobId}
              onChange={(e) => handleJobChange(e.target.value)}
              style={styles.input}
              disabled={isJobsLoading}
            >
              <option value="">-- Standalone Assessment (No specific job) --</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} ({job.company})
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Assessment Title *</label>
            <input
              type="text"
              placeholder="e.g. Node.js Backend Engineer — Technical Screen"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Description</label>
            <textarea
              placeholder="Brief overview of topics covered (e.g. Tests REST APIs, async/await, Express)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ ...styles.input, height: '80px', resize: 'vertical' }}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Time Limit (Minutes) *</label>
            <input
              type="number"
              min="5"
              max="180"
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
              style={{ ...styles.input, width: '150px' }}
              required
            />
          </div>
        </div>

        {/* Questions Section */}
        <div style={styles.card}>
          {aiSuccessMessage && (
            <div style={styles.successBanner}>
              <span>{aiSuccessMessage}</span>
              <button
                type="button"
                onClick={() => setAiSuccessMessage('')}
                style={styles.bannerCloseBtn}
              >
                ✕
              </button>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={styles.cardTitle}>2. Questions ({questions.length})</h2>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleOpenAiModal}
                style={styles.aiGenBtn}
              >
                ✨ Generate with AI
              </button>
              <button type="button" onClick={handleAddQuestion} style={styles.addBtn}>
                + Add Question
              </button>
            </div>
          </div>

          {questions.map((q, qIdx) => (
            <div key={qIdx} style={styles.questionBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={styles.questionBadge}>Question #{qIdx + 1}</span>
                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(qIdx)}
                    style={styles.deleteBtn}
                  >
                    🗑️ Remove
                  </button>
                )}
              </div>

              {/* Question Text */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Question Text *</label>
                <input
                  type="text"
                  placeholder="e.g. Which middleware parses JSON bodies in Express?"
                  value={q.question_text}
                  onChange={(e) => handleQuestionChange(qIdx, 'question_text', e.target.value)}
                  style={styles.input}
                />
              </div>

              {/* Points */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Points *</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={q.points}
                  onChange={(e) => handleQuestionChange(qIdx, 'points', e.target.value)}
                  style={{ ...styles.input, width: '120px' }}
                />
              </div>

              {/* MCQ Options */}
              <label style={styles.label}>Multiple Choice Options *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '1.25rem' }}>
                {q.options.map((optText, optIdx) => {
                  const letter = String.fromCharCode(65 + optIdx);
                  const isChecked = q.correct_answer === optText && optText.trim() !== '';

                  return (
                    <div
                      key={optIdx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: isChecked ? '#f0fdf4' : '#ffffff',
                        border: `1.5px solid ${isChecked ? '#22c55e' : '#cbd5e1'}`,
                        borderRadius: '10px',
                        padding: '6px 10px 6px 12px',
                        boxShadow: isChecked ? '0 0 0 2px rgba(34, 197, 94, 0.15)' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <span style={{ ...styles.optLetter, color: isChecked ? '#16a34a' : '#64748b' }}>{letter}.</span>
                      <input
                        type="text"
                        placeholder={`Option ${letter}`}
                        value={optText}
                        onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                        style={{
                          flex: 1,
                          border: 'none',
                          background: 'transparent',
                          padding: '6px 4px',
                          fontSize: '0.92rem',
                          outline: 'none',
                          minWidth: '60px',
                        }}
                      />
                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.8rem',
                          cursor: optText.trim() ? 'pointer' : 'default',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: isChecked ? '#16a34a' : '#f1f5f9',
                          color: isChecked ? '#ffffff' : '#64748b',
                          fontWeight: '600',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <input
                          type="radio"
                          name={`correct-${qIdx}`}
                          checked={isChecked}
                          onChange={() => handleQuestionChange(qIdx, 'correct_answer', optText)}
                          disabled={!optText.trim()}
                          style={{ margin: 0, cursor: 'pointer' }}
                        />
                        <span>{isChecked ? 'Correct' : 'Mark'}</span>
                      </label>
                    </div>
                  );
                })}
              </div>

              {/* Correct Answer Selection */}
              <div style={styles.formGroup}>
                <label style={{ ...styles.label, color: '#16a34a' }}>Selected Correct Answer *</label>
                <select
                  value={q.correct_answer}
                  onChange={(e) => handleQuestionChange(qIdx, 'correct_answer', e.target.value)}
                  style={{ ...styles.input, borderColor: '#86efac', background: '#f0fdf4' }}
                >
                  <option value="">-- Choose correct option --</option>
                  {q.options.map((opt, i) =>
                    opt.trim() ? (
                      <option key={i} value={opt}>
                        Option {String.fromCharCode(65 + i)}: {opt}
                      </option>
                    ) : null
                  )}
                </select>
              </div>
            </div>
          ))}
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginBottom: '3rem' }}>
          <Link to="/recruiter/dashboard" style={styles.cancelBtn}>
            Cancel
          </Link>
          <button type="submit" disabled={saveMutation.isPending} style={styles.submitBtn}>
            {saveMutation.isPending
              ? 'Saving Assessment...'
              : isEditMode
              ? '💾 Update Assessment'
              : '🚀 Publish Assessment'}
          </button>
        </div>
      </form>

      {/* AI Question Generator Modal */}
      {isAiModalOpen && (
        <div style={styles.modalOverlay} onClick={() => !generateQuestionsMutation.isPending && setIsAiModalOpen(false)}>
          <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.6rem' }}>✨</span>
                <div>
                  <h3 style={styles.modalHeading}>AI Assessment Question Generator</h3>
                  <span style={styles.modalSubheading}>Powered by Google Gemini</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAiModalOpen(false)}
                style={styles.modalCloseBtn}
                disabled={generateQuestionsMutation.isPending}
              >
                ✕
              </button>
            </div>

            {aiModalError && (
              <div style={styles.modalErrorBox}>
                <span>⚠️ {aiModalError}</span>
              </div>
            )}

            <form onSubmit={handleAiSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Job Role / Topic / Tech Stack *</label>
                <input
                  type="text"
                  placeholder="e.g. Senior React Developer, Node.js Backend, DevOps..."
                  value={aiRole}
                  onChange={(e) => setAiRole(e.target.value)}
                  style={styles.input}
                  disabled={generateQuestionsMutation.isPending}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1.25rem' }}>
                <div>
                  <label style={styles.label}>Difficulty Level</label>
                  <select
                    value={aiDifficulty}
                    onChange={(e) => setAiDifficulty(e.target.value)}
                    style={styles.input}
                    disabled={generateQuestionsMutation.isPending}
                  >
                    <option value="Beginner">Beginner (Junior)</option>
                    <option value="Intermediate">Intermediate (Mid-level)</option>
                    <option value="Advanced">Advanced (Senior / Lead)</option>
                  </select>
                </div>

                <div>
                  <label style={styles.label}>Question Count</label>
                  <select
                    value={aiCount}
                    onChange={(e) => setAiCount(Number(e.target.value))}
                    style={styles.input}
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
                <label style={styles.label}>Action Mode</label>
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem', color: '#334155' }}>
                    <input
                      type="radio"
                      name="aiMode"
                      value="replace"
                      checked={aiMode === 'replace'}
                      onChange={() => setAiMode('replace')}
                      disabled={generateQuestionsMutation.isPending}
                    />
                    Replace existing questions
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem', color: '#334155' }}>
                    <input
                      type="radio"
                      name="aiMode"
                      value="append"
                      checked={aiMode === 'append'}
                      onChange={() => setAiMode('append')}
                      disabled={generateQuestionsMutation.isPending}
                    />
                    Append to existing questions
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsAiModalOpen(false)}
                  style={styles.modalCancelBtn}
                  disabled={generateQuestionsMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={styles.modalSubmitBtn}
                  disabled={generateQuestionsMutation.isPending}
                >
                  {generateQuestionsMutation.isPending ? '✨ Generating with Gemini...' : '✨ Generate Questions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  pageContainer: {
    maxWidth: '850px',
    margin: '0 auto',
    padding: '2rem 1.5rem',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    marginBottom: '2rem',
  },
  heading: {
    fontSize: '1.85rem',
    fontWeight: '800',
    color: '#f1f5f9',   // light text — page sits on the dark app background
    margin: '8px 0 4px',
  },
  subheading: {
    color: '#94a3b8',
    margin: 0,
    fontSize: '1rem',
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    borderRadius: '12px',
    padding: '1rem 1.25rem',
    marginBottom: '1.5rem',
    fontWeight: '600',
  },
  card: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '2rem',
    marginBottom: '1.75rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
  },
  cardTitle: {
    margin: '0 0 1.25rem',
    fontSize: '1.2rem',
    fontWeight: '700',
    color: '#1e293b',
  },
  formGroup: {
    marginBottom: '1.25rem',
  },
  label: {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#475569',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
  },
  addBtn: {
    background: '#e0e7ff',
    color: '#4338ca',
    border: '1px solid #c7d2fe',
    height: '38px',
    padding: '0 16px',
    borderRadius: '8px',
    fontWeight: '700',
    cursor: 'pointer',
    fontSize: '0.85rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.15s ease',
  },
  questionBox: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  },
  questionBadge: {
    background: '#4f46e5',
    color: '#ffffff',
    padding: '4px 12px',
    borderRadius: '999px',
    fontWeight: '700',
    fontSize: '0.8rem',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.85rem',
  },
  optLetter: {
    fontWeight: '700',
    color: '#64748b',
    width: '20px',
  },
  cancelBtn: {
    padding: '0.75rem 1.5rem',
    background: '#f1f5f9',
    color: '#475569',
    borderRadius: '10px',
    textDecoration: 'none',
    fontWeight: '600',
  },
  submitBtn: {
    padding: '0.75rem 2rem',
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontWeight: '700',
    cursor: 'pointer',
    fontSize: '1rem',
    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
  },
  aiGenBtn: {
    background: 'linear-gradient(135deg, #4f46e5, #9333ea)',
    color: '#ffffff',
    border: 'none',
    height: '38px',
    padding: '0 16px',
    borderRadius: '8px',
    fontWeight: '700',
    cursor: 'pointer',
    fontSize: '0.85rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
    transition: 'all 0.2s ease',
  },
  successBanner: {
    background: '#ecfdf5',
    border: '1px solid #a7f3d0',
    color: '#065f46',
    borderRadius: '10px',
    padding: '0.85rem 1.25rem',
    marginBottom: '1.25rem',
    fontWeight: '600',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerCloseBtn: {
    background: 'none',
    border: 'none',
    color: '#065f46',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '1rem',
  },
  modalBox: {
    background: '#ffffff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '520px',
    padding: '2rem',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.5rem',
  },
  modalHeading: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSubheading: {
    fontSize: '0.8rem',
    color: '#6366f1',
    fontWeight: '600',
  },
  modalCloseBtn: {
    background: '#f1f5f9',
    border: 'none',
    borderRadius: '8px',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#64748b',
    fontWeight: '700',
  },
  modalErrorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    marginBottom: '1.25rem',
    fontSize: '0.85rem',
    fontWeight: '600',
  },
  modalCancelBtn: {
    padding: '0.65rem 1.25rem',
    background: '#f1f5f9',
    color: '#475569',
    borderRadius: '8px',
    border: 'none',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  modalSubmitBtn: {
    padding: '0.65rem 1.5rem',
    background: 'linear-gradient(135deg, #4f46e5, #9333ea)',
    color: '#ffffff',
    borderRadius: '8px',
    border: 'none',
    fontWeight: '700',
    cursor: 'pointer',
    fontSize: '0.9rem',
    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.35)',
  },
};

export default CreateAssessmentPage;
