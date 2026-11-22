import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector, useDispatch } from 'react-redux';
import { getJobApplicants, updateApplicantStatus } from '../../services/recruiterService';
import { screenResumeAI } from '../../services/aiService';
import { logoutUser } from '../../store/slices/authSlice';
import './ApplicantPipelinePage.css';
import BackButton from '../../Components/BackButton';

// State Machine Definition for Valid Transitions
const VALID_TRANSITIONS = {
    'applied': ['under_review', 'rejected'],
    'under_review': ['shortlisted', 'rejected'],
    'shortlisted': ['hired', 'rejected'],
    'rejected': [], // terminal
    'hired': []     // terminal
};

// All pipeline columns to display in Kanban layout
const PIPELINE_COLUMNS = [
    { id: 'applied', label: 'Applied', color: '#6366f1' },
    { id: 'under_review', label: 'Under Review', color: '#fbbf24' },
    { id: 'shortlisted', label: 'Shortlisted', color: '#a78bfa' },
    { id: 'hired', label: 'Hired 🎉', color: '#34d399' },
    { id: 'rejected', label: 'Rejected', color: '#f87171' },
];

const ApplicantPipelinePage = () => {
    const { jobId } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const queryClient = useQueryClient();
    const user = useSelector((state) => state.auth.user);

    // Modal state for terminal status transitions (rejected, hired)
    const [pendingTransition, setPendingTransition] = useState(null); // { app, nextStatus }
    const [modalNotes, setModalNotes] = useState('');

    // AI Resume Screening state
    const [aiScreenResults, setAiScreenResults] = useState({});
    const [screeningId, setScreeningId] = useState(null);

    const handleScreenResume = async (applicationId) => {
        try {
            setScreeningId(applicationId);
            const data = await screenResumeAI(applicationId);
            if (data) {
                setAiScreenResults(prev => ({ ...prev, [applicationId]: data }));
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to screen resume with AI');
        } finally {
            setScreeningId(null);
        }
    };

    // Fetch applications for this job
    const {
        data: response,
        isLoading,
        isError,
        error
    } = useQuery({
        queryKey: ['job-applicants', jobId],
        queryFn: () => getJobApplicants(jobId),
        enabled: !!jobId,
    });

    const applications = response?.data || [];

    // Client-side grouping 
    const grouped = applications.reduce((acc, app) => {
        if (!acc[app.status]) acc[app.status] = [];
        acc[app.status].push(app);
        return acc;
    }, {});

    // Status Update Mutation with Optimistic UI & Cache Invalidation
    const updateMutation = useMutation({
        mutationFn: ({ applicationId, status, notes }) =>
            updateApplicantStatus(applicationId, status, notes),
        onMutate: async ({ applicationId, status, notes }) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['job-applicants', jobId] });

            // Snapshot previous state for rollback
            const previousData = queryClient.getQueryData(['job-applicants', jobId]);

            // Optimistically update cache
            queryClient.setQueryData(['job-applicants', jobId], (old) => {
                if (!old?.data) return old;
                return {
                    ...old,
                    data: old.data.map((app) =>
                        app.application_id === applicationId
                            ? { ...app, status, notes: notes || app.notes }
                            : app
                    ),
                };
            });

            return { previousData };
        },
        onError: (err, variables, context) => {
            // Rollback cache if mutation fails
            if (context?.previousData) {
                queryClient.setQueryData(['job-applicants', jobId], context.previousData);
            }
            alert(`Failed to update status: ${err.response?.data?.message || err.message}`);
        },
        onSettled: () => {
            // Always refetch to ensure freshness
            queryClient.invalidateQueries({ queryKey: ['job-applicants', jobId] });
        },
    });

    // Handle clicking a status transition button
    const handleStatusClick = (app, nextStatus) => {
        const isTerminal = nextStatus === 'rejected' || nextStatus === 'hired';

        if (isTerminal) {
            // Open confirmation modal for terminal status changes
            setPendingTransition({ app, nextStatus });
            setModalNotes('');
        } else {
            // Intermediate status change (direct optimistic mutation)
            updateMutation.mutate({
                applicationId: app.application_id,
                status: nextStatus,
                notes: '',
            });
        }
    };

    // Confirm terminal transition inside modal
    const handleConfirmTerminalTransition = () => {
        if (!pendingTransition) return;
        const { app, nextStatus } = pendingTransition;

        updateMutation.mutate({
            applicationId: app.application_id,
            status: nextStatus,
            notes: modalNotes,
        });

        setPendingTransition(null);
        setModalNotes('');
    };

    const handleLogout = async () => {
        await dispatch(logoutUser());
        navigate('/login');
    };

    return (
        <div className="pipeline-page">

            <main className="pipeline-main">
                <div className="pipeline-header">
                    <div>
                        <BackButton to="/recruiter/dashboard" label="Back to My Postings" />
                        <h1>Candidate Pipeline</h1>
                        <p>Job ID #{jobId} • Drag or click transition buttons to move candidates</p>
                    </div>
                    <div className="header-stats">
                        <span className="total-badge">Total Applicants: {applications.length}</span>
                    </div>
                </div>

                {isLoading ? (
                    <div className="loader-container">
                        <div className="page-loader-spinner" />
                        <p>Loading candidate pipeline...</p>
                    </div>
                ) : isError ? (
                    <div className="error-box">
                        <p>Error loading pipeline: {error?.response?.data?.message || error.message}</p>
                    </div>
                ) : (
                    /* Kanban Board Layout (Exercise 2) */
                    <div className="kanban-board">
                        {PIPELINE_COLUMNS.map((col) => {
                            const colApps = grouped[col.id] || [];
                            return (
                                <div key={col.id} className="kanban-column">
                                    <div className="column-header" style={{ borderColor: col.color }}>
                                        <span className="column-title">{col.label}</span>
                                        <span className="column-count" style={{ background: col.color }}>
                                            {colApps.length}
                                        </span>
                                    </div>

                                    <div className="column-cards">
                                        {colApps.length === 0 ? (
                                            <div className="empty-column">No candidates</div>
                                        ) : (
                                            colApps.map((app) => {
                                                const validNextStatuses = VALID_TRANSITIONS[app.status] || [];

                                                return (
                                                    <div key={app.application_id} className="applicant-card">
                                                        <div className="card-top">
                                                            <h4>{app.candidate_name}</h4>
                                                            <span className="app-id">#{app.application_id}</span>
                                                        </div>
                                                        <p className="email">{app.candidate_email}</p>

                                                        {/* Action row: Resume + AI Match */}
                                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginTop: '6px' }}>
                                                            {app.resume_path && (
                                                                <a
                                                                    href={`/api/applications/${app.application_id}/resume`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    style={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '5px',
                                                                        padding: '5px 12px',
                                                                        background: 'rgba(52, 211, 153, 0.12)',
                                                                        border: '1px solid rgba(52, 211, 153, 0.35)',
                                                                        borderRadius: '6px',
                                                                        color: '#34d399',
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 600,
                                                                        textDecoration: 'none',
                                                                    }}
                                                                >
                                                                    📄 Resume ↗
                                                                </a>
                                                            )}

                                                            {!aiScreenResults[app.application_id] && (
                                                                <button
                                                                    type="button"
                                                                    disabled={screeningId === app.application_id}
                                                                    onClick={() => handleScreenResume(app.application_id)}
                                                                    style={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '6px',
                                                                        padding: '5px 12px',
                                                                        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                                                                        color: '#fff',
                                                                        border: 'none',
                                                                        borderRadius: '6px',
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 600,
                                                                        cursor: screeningId === app.application_id ? 'wait' : 'pointer',
                                                                        opacity: screeningId === app.application_id ? 0.7 : 1,
                                                                        boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)',
                                                                    }}
                                                                >
                                                                    {screeningId === app.application_id ? '⏳ Screening...' : '✨ AI Match Score'}
                                                                </button>
                                                            )}
                                                        </div>

                                                        {/* AI Resume Screening Card */}
                                                        {aiScreenResults[app.application_id] && (
                                                            <div style={{ marginTop: '10px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c7d2fe' }}>✨ AI Match Score</span>
                                                                    <span style={{
                                                                        fontSize: '0.8rem',
                                                                        fontWeight: 800,
                                                                        padding: '2px 8px',
                                                                        borderRadius: '999px',
                                                                        background: aiScreenResults[app.application_id].matchScore >= 80 ? 'rgba(52, 211, 153, 0.2)' : aiScreenResults[app.application_id].matchScore >= 60 ? 'rgba(251, 191, 36, 0.2)' : 'rgba(248, 113, 113, 0.2)',
                                                                        color: aiScreenResults[app.application_id].matchScore >= 80 ? '#34d399' : aiScreenResults[app.application_id].matchScore >= 60 ? '#fbbf24' : '#f87171',
                                                                        border: '1px solid currentColor',
                                                                    }}>
                                                                        {aiScreenResults[app.application_id].matchScore}% {aiScreenResults[app.application_id].matchScore >= 80 ? '🎯' : ''}
                                                                    </span>
                                                                </div>
                                                                <p style={{ margin: '0 0 6px', fontSize: '0.75rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                                                                    {aiScreenResults[app.application_id].summary}
                                                                </p>
                                                                {aiScreenResults[app.application_id].topMatchedSkills?.length > 0 && (
                                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' }}>
                                                                        {aiScreenResults[app.application_id].topMatchedSkills.slice(0, 3).map((skill, idx) => (
                                                                            <span key={idx} style={{ fontSize: '0.68rem', background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                                                                ✓ {skill}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                        {app.notes && (
                                                            <div className="notes-box">
                                                                <strong>Notes:</strong> {app.notes}
                                                            </div>
                                                        )}

                                                        <div className="applied-date">
                                                            Applied: {new Date(app.applied_at).toLocaleDateString()}
                                                        </div>

                                                        {/* Status Change Controls (Exercise 3) */}
                                                        {validNextStatuses.length > 0 ? (
                                                            <div className="transition-buttons">
                                                                <span className="move-label">Move to:</span>
                                                                <div className="btn-group">
                                                                    {validNextStatuses.map((nextStatus) => (
                                                                        <button
                                                                            key={nextStatus}
                                                                            className={`transition-btn btn-${nextStatus}`}
                                                                            onClick={() => handleStatusClick(app, nextStatus)}
                                                                            disabled={updateMutation.isPending}
                                                                        >
                                                                            {nextStatus === 'under_review' ? 'Review' : nextStatus}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="terminal-badge">
                                                                Final Status ({app.status})
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Confirmation Modal for Terminal Statuses (Exercise 3) */}
            {pendingTransition && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Confirm Status Change</h3>
                        <p>
                            Are you sure you want to transition candidate{' '}
                            <strong>{pendingTransition.app.candidate_name}</strong> to status{' '}
                            <span className={`modal-status-highlight status-${pendingTransition.nextStatus}`}>
                                '{pendingTransition.nextStatus}'
                            </span>?
                        </p>
                        <p className="modal-warning">
                            ⚠️ This is a terminal state transition. Once set, status cannot be reverted automatically.
                        </p>

                        <div className="form-group">
                            <label htmlFor="modal-notes">Recruiter Notes (Optional):</label>
                            <textarea
                                id="modal-notes"
                                rows="3"
                                placeholder="Add any notes about this decision..."
                                value={modalNotes}
                                onChange={(e) => setModalNotes(e.target.value)}
                            />
                        </div>

                        <div className="modal-actions">
                            <button
                                className="cancel-btn"
                                onClick={() => setPendingTransition(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className={`confirm-btn confirm-${pendingTransition.nextStatus}`}
                                onClick={handleConfirmTerminalTransition}
                                disabled={updateMutation.isPending}
                            >
                                {updateMutation.isPending ? 'Updating...' : `Confirm ${pendingTransition.nextStatus}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ApplicantPipelinePage;
