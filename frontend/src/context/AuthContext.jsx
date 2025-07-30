import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    // Since we're using HTTP-only cookies, we'll check for stored user data
    // The actual authentication is handled by the cookie
    const userData = localStorage.getItem('userData');
    
    if (userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      // Call the new traditional login endpoint
      const response = await fetch(`${import.meta.env.VITE_SERVER_ADDRESS}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important: Include cookies in the request
        body: JSON.stringify({
          email: email,
          password: password
        }),
      });

      if (!response.ok) {
        // Handle different error responses
        let errorMessage = 'Login failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (parseError) {
          // If response is not JSON, use default message
          if (response.status === 401) {
            errorMessage = 'Incorrect email or password';
          } else if (response.status === 500) {
            errorMessage = 'Server error. Please try again later';
          }
        }
        return { success: false, error: errorMessage };
      }

      // Parse the successful response
      const data = await response.json();
      
      // The backend returns user data and sets an HTTP-only cookie
      const userData = data.user;

      // Store user data in localStorage (not the token, as it's in HTTP-only cookie)
      localStorage.setItem('userData', JSON.stringify(userData));

      // Update the authentication state
      setIsAuthenticated(true);
      setUser(userData);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Network error. Please check your connection and try again.';
      
      // Handle specific network errors
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        errorMessage = 'Unable to connect to server. Please try again later.';
      }
      
      return { success: false, error: errorMessage };
    }
  };

  const loginWithGoogle = async (googleAuthData) => {
    try {
      // googleAuthData should contain user information from the backend
      // after it has exchanged the authorization code for user info
      const { user: googleUser, token } = googleAuthData;
      
      if (!googleUser || !token) {
        throw new Error('Invalid response from Google authentication');
      }

      // Store user data in localStorage (Google auth also uses HTTP-only cookies)
      localStorage.setItem('userData', JSON.stringify(googleUser));

      setIsAuthenticated(true);
      setUser(googleUser);

      return { success: true };
    } catch (error) {
      console.error('Google login error:', error);
      return { success: false, error: error.message || 'Google login failed' };
    }
  };

  const logout = async () => {
    try {
      // Call the backend logout endpoint to clear the session cookie
      const response = await fetch(`${import.meta.env.VITE_SERVER_ADDRESS}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn('Backend logout failed, but continuing with local cleanup');
      }
    } catch (error) {
      console.error('Error calling logout endpoint:', error);
      // Continue with local cleanup even if backend call fails
    }

    // Clear local storage regardless of backend response
    localStorage.removeItem('userData');
    setIsAuthenticated(false);
    setUser(null);
  };

  const updateUser = (updatedUserData) => {
    try {
      const newUserData = { ...user, ...updatedUserData };
      
      // Update localStorage
      localStorage.setItem('userData', JSON.stringify(newUserData));
      
      // Update state
      setUser(newUserData);
      
      return { success: true };
    } catch (error) {
      console.error('Update user error:', error);
      return { success: false, error: 'Failed to update user data' };
    }
  };

  const value = {
    isAuthenticated,
    user,
    login,
    loginWithGoogle,
    logout,
    updateUser,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};