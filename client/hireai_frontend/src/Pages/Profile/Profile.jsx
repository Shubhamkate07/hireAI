import React from 'react'
import { Link } from 'react-router-dom'
const Profile = () => {
  return (
    <>
    <div>Profile</div>
     <Link to={'/dashboard'}>Dashboard</Link>
    </>
  )
}

export default Profile
