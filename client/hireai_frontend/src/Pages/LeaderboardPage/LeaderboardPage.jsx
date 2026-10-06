import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { getAssessmentLeaderboard } from '../../services/analyticsService';

const LeaderboardPage = () => {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [isSseLive, setIsSseLive] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['leaderboard', assessmentId],
    queryFn: () => getAssessmentLeaderboard(assessmentId),
    enabled: !!assessmentId,
    staleTime: 1000 * 60, // 1 minute
  });

  const leaderboard = data?.leaderboard ?? data?.data?.leaderboard ?? [];
  const assessmentTitle = data?.assessment_title ?? data?.data?.assessment_title ?? `Assessment #${assessmentId}`;

  const currentUserId = user?.id || user?._id || user?.candidate_id;
  const currentUserEmail = user?.email;

  // Real-time SSE connection for watching live leaderboard updates
  useEffect(() => {
    if (!assessmentId) return;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const sseUrl = `${apiUrl}/sse/connect?assessmentId=${assessmentId}`;

    const eventSource = new EventSource(sseUrl, { withCredentials: true });

    eventSource.onopen = () => {
      setIsSseLive(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'leaderboard_updated' && Number(payload.assessmentId) === Number(assessmentId)) {
          console.log('⚡ Live SSE Leaderboard Update received!', payload);
          refetch();
        }
      } catch (err) {
        console.error('[SSE Leaderboard] Error parsing event:', err);
      }
    };

    eventSource.onerror = () => {
      setIsSseLive(false);
    };

    return () => {
      eventSource.close();
      setIsSseLive(false);
    };
  }, [assessmentId, refetch]);

  // Helper for rank badge rendering
  const getRankBadge = (rank) => {
    switch (rank) {
      case 1:
        return { label: '1st', emoji: '🥇', bg: 'linear-gradient(135deg, #fef08a, #fde047)', text: '#854d0e', border: '#eab308' };
      case 2:
        return { label: '2nd', emoji: '🥈', bg: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)', text: '#334155', border: '#94a3b8' };
      case 3:
        return { label: '3rd', emoji: '🥉', bg: 'linear-gradient(135deg, #ffedd5, #fed7aa)', text: '#9a3412', border: '#f97316' };
      default:
        return { label: `#${rank}`, emoji: '', bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' };
    }
  };

  return (
    <div style={styles.pageContainer}>
      {/* Header Banner */}
      <div style={styles.headerBanner}>
        <div>
          <div style={styles.breadcrumb}>
            <button onClick={() => navigate(-1)} style={styles.backLinkBtn}>← Back</button>
            <span style={{ margin: '0 8px', color: '#94a3b8' }}>/</span>
            <Link to="/dashboard" style={styles.backLink}>Dashboard</Link>
            <span style={{ margin: '0 8px', color: '#94a3b8' }}>/</span>
            <span style={{ color: '#cbd5e1' }}>Leaderboard</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={styles.title}>🏆 Assessment Leaderboard</h1>
            {isSseLive && (
              <span
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span className="live-pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                Live SSE Watching
              </span>
            )}
          </div>
          <p style={styles.subtitle}>{assessmentTitle}</p>
        </div>
        <button onClick={() => refetch()} style={styles.refreshBtn} aria-label="Refresh leaderboard">
          🔄 Refresh
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={styles.card} data-testid="leaderboard-loading">
          <div style={styles.skeletonHeader} />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={styles.skeletonRow} />
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div style={styles.errorCard} role="alert">
          <span style={{ fontSize: '2rem' }}>⚠️</span>
          <div>
            <h3 style={{ margin: '0 0 4px', color: '#dc2626' }}>Failed to load leaderboard</h3>
            <p style={{ margin: 0, color: '#ef4444', fontSize: '0.9rem' }}>
              {error?.response?.data?.message || error?.message || 'Unable to connect to the server.'}
            </p>
          </div>
        </div>
      )}

      {/* Content State */}
      {!isLoading && !isError && (
        <>
          {leaderboard.length === 0 ? (
            /* Empty State */
            <div style={styles.emptyCard} data-testid="leaderboard-empty">
              <span style={{ fontSize: '3rem', marginBottom: '12px' }}>🎯</span>
              <h3 style={{ margin: '0 0 8px', color: '#1e293b' }}>No submissions yet</h3>
              <p style={{ margin: 0, color: '#64748b', maxWidth: '400px' }}>
                Be the first to take this assessment and claim the #1 spot on the leaderboard!
              </p>
            </div>
          ) : (
            /* Leaderboard Table */
            <div style={styles.card} data-testid="leaderboard-table">
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={{ ...styles.th, width: '100px', textAlign: 'center' }}>Rank</th>
                      <th style={styles.th}>Candidate</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Score</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Percentage</th>
                      <th style={{ ...styles.th, textAlign: 'right' }}>Submitted At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((item) => {
                      const rankBadge = getRankBadge(item.rank);
                      const isCurrentUser =
                        (currentUserId && (item.candidate_id === currentUserId || item.id === currentUserId)) ||
                        (currentUserEmail && item.email === currentUserEmail);

                      return (
                        <tr
                          key={item.candidate_id || item.rank}
                          style={{
                            ...styles.tr,
                            ...(item.rank === 1 ? styles.goldRow : {}),
                            ...(item.rank === 2 ? styles.silverRow : {}),
                            ...(item.rank === 3 ? styles.bronzeRow : {}),
                            ...(isCurrentUser ? styles.currentUserRow : {}),
                          }}
                          data-testid={isCurrentUser ? 'current-user-row' : `leaderboard-row-${item.rank}`}
                        >
                          {/* Rank Column */}
                          <td style={{ ...styles.td, textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                borderRadius: '999px',
                                background: rankBadge.bg,
                                color: rankBadge.text,
                                border: `1px solid ${rankBadge.border}`,
                                fontWeight: '700',
                                fontSize: '0.85rem',
                              }}
                            >
                              {rankBadge.emoji && <span>{rankBadge.emoji}</span>}
                              <span>{rankBadge.label}</span>
                            </span>
                          </td>

                          {/* Candidate Name Column */}
                          <td style={styles.td}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={styles.avatar}>
                                {item.candidate_name?.charAt(0)?.toUpperCase() || 'C'}
                              </div>
                              <div>
                                <span style={{ fontWeight: isCurrentUser ? '700' : '600', color: '#1e293b' }}>
                                  {item.candidate_name || 'Anonymous Candidate'}
                                </span>
                                {isCurrentUser && (
                                  <span style={styles.youBadge} data-testid="you-badge">
                                    You
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Score Column */}
                          <td style={{ ...styles.td, textAlign: 'right', fontWeight: '600', color: '#334155' }}>
                            {item.score} {item.max_score ? `/ ${item.max_score}` : 'pts'}
                          </td>

                          {/* Percentage Column */}
                          <td style={{ ...styles.td, textAlign: 'right' }}>
                            <span
                              style={{
                                fontWeight: '700',
                                color: item.percentage >= 80 ? '#16a34a' : item.percentage >= 60 ? '#d97706' : '#dc2626',
                              }}
                            >
                              {item.percentage}%
                            </span>
                          </td>

                          {/* Submitted At Column */}
                          <td style={{ ...styles.td, textAlign: 'right', color: '#64748b', fontSize: '0.85rem' }}>
                            {item.submitted_at ? new Date(item.submitted_at).toLocaleDateString() : 'N/A'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const styles = {
  pageContainer: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '2rem 1.5rem',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  headerBanner: {
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
    borderRadius: '16px',
    padding: '2rem',
    color: '#ffffff',
    display: 'flex',
    justifyConstraint: 'space-between',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
  },
  breadcrumb: {
    fontSize: '0.85rem',
    marginBottom: '6px',
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '2px',
  },
  backLinkBtn: {
    background: 'none',
    border: 'none',
    color: '#818cf8',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.85rem',
    padding: '0',
  },
  backLink: {
    color: '#818cf8',
    textDecoration: 'none',
    fontWeight: '500',
  },
  title: {
    margin: '0 0 4px',
    fontSize: '1.75rem',
    fontWeight: '800',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    margin: 0,
    color: '#94a3b8',
    fontSize: '1rem',
  },
  refreshBtn: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: '600',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.2s',
  },
  card: {
    background: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
  },
  emptyCard: {
    background: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    padding: '3rem',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  errorCard: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '16px',
    padding: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeaderRow: {
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
  },
  th: {
    padding: '1rem 1.25rem',
    fontSize: '0.8rem',
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background-color 0.15s ease',
  },
  goldRow: {
    background: 'linear-gradient(90deg, rgba(254, 240, 138, 0.25) 0%, rgba(255, 255, 255, 0) 100%)',
  },
  silverRow: {
    background: 'linear-gradient(90deg, rgba(241, 245, 249, 0.5) 0%, rgba(255, 255, 255, 0) 100%)',
  },
  bronzeRow: {
    background: 'linear-gradient(90deg, rgba(255, 237, 213, 0.3) 0%, rgba(255, 255, 255, 0) 100%)',
  },
  currentUserRow: {
    background: '#e0e7ff',
    borderLeft: '4px solid #4f46e5',
  },
  td: {
    padding: '1rem 1.25rem',
    verticalAlign: 'middle',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '0.9rem',
  },
  youBadge: {
    marginLeft: '8px',
    background: '#4f46e5',
    color: '#ffffff',
    fontSize: '0.75rem',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '999px',
  },
  skeletonHeader: {
    height: '48px',
    background: '#f1f5f9',
  },
  skeletonRow: {
    height: '60px',
    borderBottom: '1px solid #f1f5f9',
    background: 'linear-gradient(90deg, #f8fafc 25%, #f1f5f9 50%, #f8fafc 75%)',
  },
};

export default LeaderboardPage;
