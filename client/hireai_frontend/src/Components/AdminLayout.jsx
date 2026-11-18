/**
 * AdminLayout.jsx — Secondary tab bar shown on every /admin/* page,
 * so admins can jump between sections without going back to the overview.
 */
import { NavLink, Outlet } from 'react-router-dom';
import './AdminLayout.css';

const TABS = [
    { to: '/admin', label: 'Overview', end: true },
    { to: '/admin/users', label: '👥 Users' },
    { to: '/admin/jobs', label: '💼 Jobs' },
    { to: '/admin/assessments', label: '📝 Assessments' },
    { to: '/admin/activity', label: '📋 Activity' },
];

const AdminLayout = () => (
    <>
        <nav className="admin-subnav" aria-label="Admin sections">
            <div className="admin-subnav-inner">
                {TABS.map((t) => (
                    <NavLink
                        key={t.to}
                        to={t.to}
                        end={t.end}
                        className={({ isActive }) => `admin-subnav-tab${isActive ? ' is-active' : ''}`}
                    >
                        {t.label}
                    </NavLink>
                ))}
            </div>
        </nav>
        <Outlet />
    </>
);

export default AdminLayout;
