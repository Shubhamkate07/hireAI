import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import BackButton from '../../Components/BackButton'
import './NotFound.css'

const NotFound = () => {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)

  return (
    <main className="notfound-page">
      <div className="notfound-card">
        <div className="notfound-code">404</div>
        <h1>Page not found</h1>
        <p>The page you’re looking for doesn’t exist or may have been moved.</p>
        <div className="notfound-actions">
          <BackButton label="Go Back" fallback={isAuthenticated ? '/dashboard' : '/login'} className="notfound-back" />
          <Link to={isAuthenticated ? '/dashboard' : '/login'} className="notfound-home">
            {isAuthenticated ? '🏠 Go to Home' : 'Go to Login'}
          </Link>
        </div>
      </div>
    </main>
  )
}

export default NotFound
