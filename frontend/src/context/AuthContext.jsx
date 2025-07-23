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
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      // Simulate API call for demo purposes
      // In a real app, you would make an actual API call here
      const mockUser = {
        id: 1,
        email: email,
        name: email.split('@')[0], // Use part before @ as name
      };
      const mockToken = 'mock-jwt-token-' + Date.now();

      // Store in localStorage
      localStorage.setItem('authToken', mockToken);
      localStorage.setItem('userData', JSON.stringify(mockUser));

      setIsAuthenticated(true);
      setUser(mockUser);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
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

      // Store in localStorage
      localStorage.setItem('authToken', token);
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
    localStorage.removeItem('authToken');
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