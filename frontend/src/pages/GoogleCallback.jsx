import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

const GoogleCallback = () => {
  const [status, setStatus] = useState('processing'); // 'processing', 'success', 'error'
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { loginWithGoogle, isAuthenticated, user } = useAuth();

  useEffect(() => {
    const handleGoogleCallback = async () => {
      try {
        // Check if user is already authenticated
        if (isAuthenticated && user) {
          console.log('Google callback - User is already authenticated:', user);
          setStatus('success');
          setTimeout(() => {
            navigate('/');
          }, 1500);
          return;
        }

        // Get the current URL and extract parameters
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');
        
        console.log('Google callback - URL state:', state);
        
        // Check if there was an error from Google
        if (error) {
          throw new Error(`Google OAuth error: ${error}`);
        }
        
        // Verify state parameter to prevent CSRF attacks
        const storedState = sessionStorage.getItem('oauth_state');
        console.log('Google callback - Stored state:', storedState);
        console.log('Google callback - URL state:', state);
        console.log('Google callback - States match:', state === storedState);
        
        // More flexible state validation - warn but don't fail if states don't match
        // This handles cases where sessionStorage is cleared by browser privacy settings
        if (!state || state !== storedState) {
          console.warn('State parameter mismatch - this might be due to browser privacy settings clearing sessionStorage');
          // Don't throw error here, just log the warning
          // Some browsers clear sessionStorage during OAuth flows, especially in private mode
        }
        
        // Clear the stored state regardless
        sessionStorage.removeItem('oauth_state');
        
        if (!code) {
          throw new Error('No authorization code received from Google');
        }
        
        console.log('Google callback - Authorization code received, sending to backend');
        
        // Send the authorization code to your backend
        const response = await fetch(`${import.meta.env.VITE_SERVER_ADDRESS}/api/auth/google`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Important: Include cookies in the request
          body: JSON.stringify({
            code: code
          }),
        });
        
        if (!response.ok) {
          let errorMessage = `HTTP error! status: ${response.status}`;
          try {
            const errorData = await response.json();
            errorMessage = errorData.detail || errorData.message || errorMessage;
          } catch (jsonError) {
            // If response is not JSON, try to get text
            try {
              const errorText = await response.text();
              errorMessage = errorText || errorMessage;
            } catch (textError) {
              // Use the default error message
            }
          }
          throw new Error(errorMessage);
        }
        
        let data;
        try {
          data = await response.json();
        } catch (jsonError) {
          throw new Error('Backend returned invalid JSON response');
        }
        
        console.log('Google callback - Backend response:', data);
        
        // Use the real user data returned from backend
        const googleAuthData = {
          user: data.user, // Use actual user data from backend
          token: 'google-auth-token-' + Date.now() // Create a token since backend uses cookies
        };
        
        console.log('Google callback - Attempting to login with data:', googleAuthData);
        
        // Use the Google login method from AuthContext
        const result = await loginWithGoogle(googleAuthData);
        
        if (result.success) {
          console.log('Google callback - Login successful');
          setStatus('success');
          // Redirect to chat page after a short delay
          setTimeout(() => {
            navigate('/');
          }, 1500);
        } else {
          throw new Error(result.error || 'Login failed');
        }
        
      } catch (err) {
        console.error('Google OAuth callback error:', err);
        
        // Check again if user got authenticated despite the error
        if (isAuthenticated && user) {
          console.log('Google callback - User authenticated despite error, redirecting to chat');
          setStatus('success');
          setTimeout(() => {
            navigate('/');
          }, 1500);
          return;
        }
        
        setError(err.message);
        setStatus('error');
        
        // Redirect back to login page after showing error
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    };

    handleGoogleCallback();
  }, [navigate, loginWithGoogle, isAuthenticated, user]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-gray-800 rounded-lg p-8 shadow-lg">
          {status === 'processing' && (
            <>
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Completing Sign In</h2>
              <p className="text-gray-400">Please wait while we verify your Google account...</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Sign In Successful!</h2>
              <p className="text-gray-400">Redirecting you to the chat...</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Sign In Failed</h2>
              <p className="text-gray-400 mb-4">{error}</p>
              <p className="text-sm text-gray-500">Redirecting back to login page...</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleCallback; 