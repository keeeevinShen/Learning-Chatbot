// In frontend/src/context/AuthContext.jsx

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
  const [userThreads, setUserThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    const userData = localStorage.getItem('userData');
    const threadsData = localStorage.getItem('userThreads');
    
    if (userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
      if (threadsData) {
        setUserThreads(JSON.parse(threadsData));
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    setLoading(true); // Set loading to true when login starts
    try {
      const response = await fetch(`/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email,
          password: password
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Login failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (parseError) {
          if (response.status === 401) {
            errorMessage = 'Incorrect email or password';
          } else if (response.status === 500) {
            errorMessage = 'Server error. Please try again later';
          }
        }
        return { success: false, error: errorMessage };
      }

      const data = await response.json();
      const userData = data.user;
      const threads = data.threads || [];

      // Store user data and threads in localStorage
      localStorage.setItem('userData', JSON.stringify(userData));
      localStorage.setItem('userThreads', JSON.stringify(threads));

      // Update the authentication state
      setIsAuthenticated(true);
      setUser(userData);
      setUserThreads(threads);

      return { success: true, threads };
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Network error. Please check your connection and try again.';
      
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        errorMessage = 'Unable to connect to server. Please try again later.';
      }
      
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false); // Set loading to false when login completes
    }
  };

  const loginWithGoogle = async (googleAuthData) => {
    setLoading(true); // Set loading to true
    try {
      const { user: googleUser, threads = [] } = googleAuthData;
      
      if (!googleUser) {
        throw new Error('Invalid response from Google authentication');
      }

      // Store user data and threads in localStorage
      localStorage.setItem('userData', JSON.stringify(googleUser));
      localStorage.setItem('userThreads', JSON.stringify(threads));

      setIsAuthenticated(true);
      setUser(googleUser);
      setUserThreads(threads);

      return { success: true, threads };
    } catch (error) {
      console.error('Google login error:', error);
      return { success: false, error: error.message || 'Google login failed' };
    } finally {
      setLoading(false); // Set loading to false
    }
  };

  const logout = async () => {
    try {
      const response = await fetch(`/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn('Backend logout failed, but continuing with local cleanup');
      }
    } catch (error) {
      console.error('Error calling logout endpoint:', error);
    }

    // Clear local storage
    localStorage.removeItem('userData');
    localStorage.removeItem('userThreads');
    setIsAuthenticated(false);
    setUser(null);
    setUserThreads([]);
  };

  const updateUser = (updatedUserData) => {
    try {
      const newUserData = { ...user, ...updatedUserData };
      
      localStorage.setItem('userData', JSON.stringify(newUserData));
      setUser(newUserData);
      
      return { success: true };
    } catch (error) {
      console.error('Update user error:', error);
      return { success: false, error: 'Failed to update user data' };
    }
  };

  const updateThreads = (threads) => {
    localStorage.setItem('userThreads', JSON.stringify(threads));
    setUserThreads(threads);
  };

  const value = {
    isAuthenticated,
    user,
    userThreads,
    login,
    loginWithGoogle,
    logout,
    updateUser,
    updateThreads,
    loading // Expose the loading state
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};