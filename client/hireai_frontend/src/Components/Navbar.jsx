/**
 * Navbar.jsx — Unified top navigation bar
 *
 * Rendered ONCE by <AppLayout /> for every authenticated page, so the bar is
 * identical everywhere. Links are role-specific:
 *
 *   candidate → Home · Jobs · Profile
 *   recruiter → Home · Jobs · My Postings · Analytics · Profile
 *   admin     → Home · Jobs · Admin Center · Profile
 *
 * Admins do NOT see "Recruiter Portal" / "Analytics": those pages are scoped to
 * the logged-in user's own job postings, so for an admin they are empty and
 * misleading. Platform-wide management lives under /admin instead.
 */

import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../store/slices/authSlice';
import { queryClient } from '../main';
import NotificationBell from './NotificationBell';
import './Navbar.css';

const LINKS_BY_ROLE = {
    candidate: [
        { to: '/dashboard', label: 'Home', end: true },
        { to: '/jobs', label: 'Jobs' },
        { to: '/profile', label: 'Profile' },
    ],
    recruiter: [
        { to: '/dashboard', label: 'Home', end: true },
        { to: '/jobs', label: 'Jobs' },
        { to: '/recruiter/dashboard', label: '📊 My Postings', variant: 'accent' },
        { to: '/recruiter/analytics', label: '📈 Analytics', variant: 'accent' },
        { to: '/profile', label: 'Profile' },
    ],
    admin: [
        { to: '/dashboard', label: 'Home', end: true },
        { to: '/jobs', label: 'Jobs' },
        { to: '/admin', label: '⚙️ Admin Center', variant: 'danger', id: 'admin-nav-link' },
        { to: '/profile', label: 'Profile' },
    ],
};

const ROLE_LABEL = { admin: 'Admin', recruiter: 'Recruiter', candidate: 'Candidate' };

const Navbar = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const user = useSelector((state) => state.auth.user);
    const [menuOpen, setMenuOpen] = useState(false);

    // Mobile menu closes as soon as any link inside it is clicked
    const closeMenu = () => setMenuOpen(false);

    const role = user?.role || 'candidate';
    const links = LINKS_BY_ROLE[role] || LINKS_BY_ROLE.candidate;

    const handleLogout = async () => {
        await dispatch(logoutUser());
        queryClient.clear();
        navigate('/login');
    };

    const linkClass = (variant) => ({ isActive }) =>
        [
            'hireai-nav-link',
            variant ? `hireai-nav-link--${variant}` : '',
            isActive ? 'is-active' : '',
        ].join(' ').trim();

    return (
        <nav className="hireai-nav" aria-label="Main navigation">
            <div className="hireai-nav-left">
                <Link to="/dashboard" className="hireai-logo" aria-label="HireAI home">HireAI</Link>
                {role !== 'candidate' && (
                    <span className={`hireai-role-badge hireai-role-${role}`}>{ROLE_LABEL[role]}</span>
                )}
            </div>

            <button
                type="button"
                className="hireai-nav-toggle"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((o) => !o)}
            >
                {menuOpen ? '✕' : '☰'}
            </button>

            <div className={`hireai-nav-right ${menuOpen ? 'is-open' : ''}`}>
                <div className="hireai-nav-links">
                    {links.map((l) => (
                        <NavLink key={l.to} id={l.id} to={l.to} end={l.end} className={linkClass(l.variant)} onClick={closeMenu}>
                            {l.label}
                        </NavLink>
                    ))}
                </div>

                <NotificationBell />

                <div className="hireai-nav-user">
                    <Link to="/profile" className="hireai-nav-profile" title="My profile" onClick={closeMenu}>
                        <div className="hireai-nav-avatar">
                            {user?.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <span className="hireai-nav-user-name">{user?.name}</span>
                    </Link>
                    <button id="logout-btn" className="hireai-nav-logout" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
