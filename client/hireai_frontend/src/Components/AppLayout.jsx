/**
 * AppLayout.jsx — Shell for every authenticated page.
 *
 * Renders the shared <Navbar /> once, then the matched child route.
 * Pages must NOT render their own <Navbar /> — that's how the bar used to
 * go missing on Jobs, Job Detail, Leaderboard and Create Assessment.
 */
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const AppLayout = () => (
    <>
        <Navbar />
        <Outlet />
    </>
);

export default AppLayout;
