'use client';

import { useState} from 'react';
import styles from '../../register/register.module.css';
import { Hash, Eye, EyeOff } from 'react-feather';
import Image from 'next/image';
import { signIn } from 'next-auth/react';




import { useSearchParams, useRouter } from 'next/navigation';


export default function ForgotResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const router = useRouter();


  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Call your API to send reset email
    
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      setForgotMessage(data.message || 'If the email exists, a reset link has been sent.');
      setMessage('Password reset link has been sent to your email.');
    } catch (error) {
      setForgotMessage('Something went wrong. Please try again later!');
    }
  };
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage("Passwords don't match.");
      return;
    }

    // Call your API to reset password using token
    setMessage('Password has been reset successfully!');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      setResetMessage(data.message || 'Password has been reset successfully!');
    } catch (error) {
      setResetMessage('Reset failed.');
    }
  };
    const goToLogin = () => {
    router.push('/register');
  };

  return (
    <div className={styles.wrapper} style={{  }}>
       <div
        style={{
          position: 'absolute',
          top: '1rem',
          left: '1rem',
        }}
      >
        <Image src="/MG logo.png" alt="Company Logo" width={80} height={30} />
      </div>
     

      <div className={styles.formContainer}>
        {showAlert && (
          <div className={styles.alertBox}>
            {error}
          </div>
        )}
        {/* Forgot Password Form */}
        <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full  p-8 rounded " style={{padding: '65px'}}>
        <h2 className={styles.formTitle}>
          {token ? 'Reset Password' : 'Forgot Password'}
        </h2>
         <p className={styles.msg}>Enter your email address below and we'll send you a link to reset your password.</p>
        {message && (
          <div className="mb-4 text-center text-sm text-green-600">
            {message}
          </div>
        )}

        {!token ? (
          <>
          <form onSubmit={handleForgotPassword}>
            <label className="block mb-2 text-sm font-medium mt-4">Email</label>
            <input
              type="email"
              className="w-full px-8 py-2 border rounded mb-6"
              value={email}
              onChange={handleEmailChange}
              required
            />
            <button
              type="submit"
              className={styles.button}
            >
              Send Reset Link
            </button>
            <p onClick={goToLogin} className={styles.toggleText}>
              Go to Login?
            </p>
          </form>
        {forgotMessage && <p>{forgotMessage}</p>}
        </>
      ) : (
        <>
          <form onSubmit={handleResetPassword}>
            <label className="block mb-2 text-sm font-medium">New Password</label>
            <input
              type="password"
              className="w-full px-4 py-2 border rounded mb-4"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <label className="block mb-2 text-sm font-medium">Confirm Password</label>
            <input
              type="password"
              className="w-full px-4 py-2 border rounded mb-4"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button
              type="submit"
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
            >
              Reset Password
            </button>
          </form>
          {resetMessage && <p>{resetMessage}</p>}
        </>
        )}
      </div>
    </div>
      </div>
       
    </div>
  );
}
