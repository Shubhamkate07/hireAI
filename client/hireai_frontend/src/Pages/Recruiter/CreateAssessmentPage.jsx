import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRecruiterJobs } from '../../services/recruiterService';
import { createAssessment, updateAssessment, getAssessmentByJobId, getAssessment } from '../../services/assessmentService';

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
    setEditingAssessmentId('');
    resetFormToDefaults();
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
            points: q.points || 10,
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
      const filledOptions = q.options.filter((opt) => opt.trim() !== '');
      if (filledOptions.length < 2) {
        setFormError(`Question #${i + 1} must have at least 2 options.`);
        return;
      }
      if (!q.correct_answer.trim()) {
        setFormError(`Please select the correct answer for Question #${i + 1}.`);
        return;
      }
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      job_id: jobId ? Number(jobId) : null,
      time_limit_minutes: Number(timeLimit) || 30,
      questions: questions.map((q) => ({
        question_text: q.question_text.trim(),
        question_type: q.question_type || 'mcq',
        options: q.options.filter((opt) => opt.trim() !== ''),
        correct_answer: q.correct_answer.trim(),
        points: Number(q.points) || 10,
      })),
    };

    saveMutation.mutate(payload);
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.header}>
        <Link to="/recruiter/dashboard" style={styles.backLink}>
          ← Back to Recruiter Dashboard
        </Link>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={styles.cardTitle}>2. Questions ({questions.length})</h2>
            <button type="button" onClick={handleAddQuestion} style={styles.addBtn}>
              + Add Question
            </button>
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
                  min="1"
                  max="100"
                  value={q.points}
                  onChange={(e) => handleQuestionChange(qIdx, 'points', e.target.value)}
                  style={{ ...styles.input, width: '120px' }}
                />
              </div>

              {/* MCQ Options */}
              <label style={styles.label}>Multiple Choice Options *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1rem' }}>
                {q.options.map((optText, optIdx) => {
                  const letter = String.fromCharCode(65 + optIdx);
                  const isChecked = q.correct_answer === optText && optText.trim() !== '';

                  return (
                    <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={styles.optLetter}>{letter}.</span>
                      <input
                        type="text"
                        placeholder={`Option ${letter}`}
                        value={optText}
                        onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                        style={styles.input}
                      />
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name={`correct-${qIdx}`}
                          checked={isChecked}
                          onChange={() => handleQuestionChange(qIdx, 'correct_answer', optText)}
                        />
                        <span style={{ color: isChecked ? '#16a34a' : '#64748b', fontWeight: isChecked ? '700' : '500' }}>
                          Correct
                        </span>
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
  backLink: {
    color: '#6366f1',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '0.9rem',
  },
  heading: {
    fontSize: '1.85rem',
    fontWeight: '800',
    color: '#0f172a',
    margin: '8px 0 4px',
  },
  subheading: {
    color: '#64748b',
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
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    fontWeight: '700',
    cursor: 'pointer',
    fontSize: '0.85rem',
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
};

export default CreateAssessmentPage;
