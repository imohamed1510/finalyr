import React, { useState } from 'react';
import './SignIn.css'
import { useNavigate } from 'react-router-dom';
import supabase from '../src/supabaseClient'
import { SupabaseClient } from '@supabase/supabase-js';

const SignInPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();  // <-- Update to useNavigate()


  const handleSignIn = async (event) => {
    event.preventDefault();
    if (email && password) {
      alert("Signed in successfully!");
    } else {
      alert("Please fill in both email and password!");
    }

    //Authenticate user with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
    } else {
      alert("Signed in successfully!");
      navigate('/FileManager');  // Redirect to dashboard (change this as needed)
    }
  };

  const handleSignUpRedirect = () => {
    alert("Redirecting to the Sign Up page...");
    // redirect to SignUp page
    navigate('/SignUp');
  };

  return (
    <div className="container">
      <h2>Sign In</h2>
      <form onSubmit={handleSignIn}>
        <div className="input-group">
          <label htmlFor="email">Email:</label>
          <input 
            type="email" 
            id="email" 
            placeholder="Enter your email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
        </div>
        <div className="input-group">
          <label htmlFor="password">Password:</label>
          <input 
            type="password" 
            id="password" 
            placeholder="Enter your password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
          />
        </div>
        <button type="submit">Sign In</button>
      </form>
      <button onClick={handleSignUpRedirect}>Sign Up</button>
    </div>
  );
}

export default SignInPage;
