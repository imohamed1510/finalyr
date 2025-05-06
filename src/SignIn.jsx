import React, { useState } from 'react';
import './SignIn.css';
import { useNavigate } from 'react-router-dom';
import supabase from '../src/supabaseClient';
import { SupabaseClient } from '@supabase/supabase-js';

const SignInPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignIn = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage('Please enter both email and password');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage('Incorrect email or password. Please try again.');
        setIsLoading(false);
        return;
      }

      navigate('/FileManager');
    } catch (error) {
      setErrorMessage('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const handleSignUpRedirect = () => {
    navigate('/SignUp');
  };

  return (
    <div className="signin-background">
      <div className="signin-center-wrapper">
        <div className="signin-container">
          <h2>Sign In</h2>
          
          {errorMessage && (
            <div className="auth-error-message">
              ⚠️ {errorMessage}
            </div>
          )}

          <form onSubmit={handleSignIn} className="auth-form">
            <div className="auth-input-group">
              <label htmlFor="email">Email:</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="auth-input"
              />
            </div>

            <div className="auth-input-group">
              <label htmlFor="password">Password:</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="auth-input"
              />
            </div>

            <button type="submit" disabled={isLoading} className="auth-button">
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="auth-alt-option">
            Don't have an account?{' '}
            <span onClick={handleSignUpRedirect} className="auth-link">
              Sign Up
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;