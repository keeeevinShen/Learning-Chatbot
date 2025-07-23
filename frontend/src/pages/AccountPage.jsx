import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Settings, LogOut, ArrowLeft, Save, Edit } from 'lucide-react';

const AccountPage = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || '');
  const [editedEmail, setEditedEmail] = useState(user?.email || '');

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleSave = () => {
    // Update the user data in the context
    const result = updateUser({
      name: editedName,
      email: editedEmail
    });
    
    if (result.success) {
      console.log('User data updated successfully');
      setIsEditing(false);
    } else {
      console.error('Failed to update user data:', result.error);
      // You could show an error message to the user here
    }
  };

  const handleCancel = () => {
    setEditedName(user?.name || '');
    setEditedEmail(user?.email || '');
    setIsEditing(false);
  };

  return (
    <div className="h-screen bg-gray-900 text-gray-100 overflow-y-auto">
      <div className="max-w-2xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Account Settings</h1>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Chat
          </Link>
        </div>

        {/* Profile Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Information
            </h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
            )}
          </div>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Display Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              ) : (
                <div className="px-4 py-2 bg-gray-700 rounded-lg text-gray-200">
                  {user?.name || 'Not set'}
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={editedEmail}
                  onChange={(e) => setEditedEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              ) : (
                <div className="px-4 py-2 bg-gray-700 rounded-lg text-gray-200">
                  {user?.email || 'Not set'}
                </div>
              )}
            </div>

            {/* Edit Actions */}
            {isEditing && (
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Preferences Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5" />
            Preferences
          </h2>
          
          <div className="space-y-4">
            {/* Theme Setting */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-300">
                  Theme
                </label>
                <p className="text-xs text-gray-400">Choose your interface theme</p>
              </div>
              <select className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="auto">Auto</option>
              </select>
            </div>

            {/* Chat Settings */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-300">
                  Auto-save Chats
                </label>
                <p className="text-xs text-gray-400">Automatically save conversation history</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {/* Notification Settings */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-300">
                  Email Notifications
                </label>
                <p className="text-xs text-gray-400">Receive updates and announcements</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Account Actions</h2>
          
          <div className="space-y-3">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Log Out
            </button>
            
            <button className="w-full flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors">
              Delete Account
            </button>
          </div>
        </div>

        {/* User Info Display */}
        <div className="mt-6 p-4 bg-gray-800 rounded-lg">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Account Information</h3>
          <div className="text-xs text-gray-500 space-y-1">
            <p>User ID: {user?.id}</p>
            <p>Account Created: {new Date().toLocaleDateString()}</p>
            <p>Last Login: {new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountPage; 