/**
 * BackButton.jsx — Clearly visible "← Back" pill used on detail/sub pages.
 *
 *   <BackButton to="/jobs" label="Back to Jobs" />   → fixed destination
 *   <BackButton label="Back" />                      → browser history (falls
 *                                                      back to `fallback` when
 *                                                      the page was opened directly)
 */
import { Link, useNavigate } from 'react-router-dom';
import './BackButton.css';

const BackButton = ({ to, label = 'Back', fallback = '/dashboard', className = '', ...rest }) => {
    const navigate = useNavigate();
    const cls = `hireai-back-btn ${className}`.trim();

    if (to) {
        return (
            <Link to={to} className={cls} {...rest}>
                <span aria-hidden="true">←</span> {label}
            </Link>
        );
    }

    const goBack = () => {
        // history.state.idx is set by React Router; 0 means there's nothing to go back to
        if (window.history.state?.idx > 0) navigate(-1);
        else navigate(fallback);
    };

    return (
        <button type="button" onClick={goBack} className={cls} {...rest}>
            <span aria-hidden="true">←</span> {label}
        </button>
    );
};

export default BackButton;
