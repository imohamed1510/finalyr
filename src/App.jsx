import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SignInPage from './SignIn'
import SignUpPage from './SignUp';
import DashboardPage from './NewDashBoard';




function App() {
  return (
    <Router>
      <Routes>  {/* Use Routes instead of Switch */}
        <Route path="/" element={<Navigate to="/SignIn" />} />  {/* Redirect to /SignIn */}
        <Route path="/SignIn" element={<SignInPage />} />  {/* Use element instead of component */}
        <Route path="/SignUp" element={<SignUpPage />} />  {/* Use element instead of component */}
        <Route path="/NewDashBoard" element={<DashboardPage />} />
      </Routes>
    </Router>
  );
}

export default App;