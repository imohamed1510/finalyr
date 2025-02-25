// // SignUpPage.jsx
// import React, { useState } from 'react';


// const SignUpPage = () => {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [confirmPassword, setConfirmPassword] = useState('');

//   const handleSignUp = (event) => {
//     event.preventDefault();
//     if (password !== confirmPassword) {
//       alert("Passwords do not match!");
//     } else {
//       alert("Sign Up successful!");
//       // Here you can add further sign-up logic, e.g., calling an API to register
//     }
//   };

//   return (
//     <div className="container">
//       <h2>Sign Up</h2>
//       <form onSubmit={handleSignUp}>
//         <div className="input-group">
//           <label htmlFor="email">Email:</label>
//           <input 
//             type="email" 
//             id="email" 
//             placeholder="Enter your email" 
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             required 
//           />
//         </div>
//         <div className="input-group">
//           <label htmlFor="password">Password:</label>
//           <input 
//             type="password" 
//             id="password" 
//             placeholder="Enter your password" 
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             required 
//           />
//         </div>
//         <div className="input-group">
//           <label htmlFor="confirmPassword">Confirm Password:</label>
//           <input 
//             type="password" 
//             id="confirmPassword" 
//             placeholder="Confirm your password" 
//             value={confirmPassword}
//             onChange={(e) => setConfirmPassword(e.target.value)}
//             required 
//           />
//         </div>
//         <button type="submit">Sign Up</button>
//       </form>
//     </div>
//   );
// }

// export default SignUpPage;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../src/supabaseClient';
import './SignIn.css';

const SignUpPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleSignUp = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match!");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
    } else {
      alert("Sign Up successful! Please check your email to verify your account.");
      navigate('/'); // Redirect to Sign In Page
    }
  };

  return (
    <div className="container">
      <h2>Sign Up</h2>
      {errorMessage && <p className="error-message">{errorMessage}</p>}
      <form onSubmit={handleSignUp}>
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
        <div className="input-group">
          <label htmlFor="confirmPassword">Confirm Password:</label>
          <input 
            type="password" 
            id="confirmPassword" 
            placeholder="Confirm your password" 
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required 
          />
        </div>
        <button type="submit">Sign Up</button>
      </form>
    </div>
  );
};

export default SignUpPage;

