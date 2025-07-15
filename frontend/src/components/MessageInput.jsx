// src/components/MessageInput.jsx

import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Send, BookOpen, Plus, X, FileText, AlertCircle } from 'lucide-react';
import ImportLectureModal from './ImportLectureModal';

const MessageInput = ({ onSendMessage, isLoading }) => {
  const [inputValue, setInputValue] = useState('');
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileError, setFileError] = useState('');
  const textareaRef = useRef(null);
  const menuRef = useRef(null);
  const fileInputRef = useRef(null);

  const MAX_FILES = 5;

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [inputValue]);

  // Handle outside click to close menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Clear file error after 5 seconds
  useEffect(() => {
    if (fileError) {
      const timer = setTimeout(() => {
        setFileError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [fileError]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if ((inputValue.trim() || selectedFiles.length > 0) && !isLoading) {
      onSendMessage(inputValue, selectedFiles);
      setInputValue('');
      setSelectedFiles([]);
      setFileError('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleImportLecture = () => {
    // Logic to handle lecture import
    console.log('Importing lecture...');
    setModalOpen(false);
  };

  const handleFileUploadClick = () => {
    setMenuOpen(false);
    if (selectedFiles.length >= MAX_FILES) {
      setFileError(`You can only upload up to ${MAX_FILES} files at once.`);
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const currentCount = selectedFiles.length;
    const newCount = currentCount + files.length;
    
    if (newCount > MAX_FILES) {
      const allowedCount = MAX_FILES - currentCount;
      if (allowedCount > 0) {
        const allowedFiles = files.slice(0, allowedCount);
        setSelectedFiles(prev => [...prev, ...allowedFiles]);
        setFileError(`You can only upload up to ${MAX_FILES} files. ${files.length - allowedCount} file(s) were not added.`);
      } else {
        setFileError(`You can only upload up to ${MAX_FILES} files at once.`);
      }
    } else {
      setSelectedFiles(prev => [...prev, ...files]);
      setFileError('');
    }
    
    // Reset the input so the same file can be selected again if needed
    e.target.value = '';
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setFileError('');
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="border-t border-gray-800 p-4">
      <div className="max-w-4xl mx-auto">
        {/* File error message */}
        {fileError && (
          <div className="mb-3 flex items-center gap-2 bg-red-900/50 border border-red-700 rounded-lg p-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-sm text-red-200">{fileError}</span>
          </div>
        )}

        {/* Selected files display */}
        {selectedFiles.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">
                Selected files ({selectedFiles.length}/{MAX_FILES})
              </span>
            </div>
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 bg-gray-800 rounded-lg p-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-gray-300 flex-1">
                    {file.name} ({formatFileSize(file.size)})
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="p-1 hover:bg-gray-700 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-end gap-2 bg-gray-800 rounded-lg p-2">
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(prev => !prev)}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
            {isMenuOpen && (
              <div
                className="absolute bottom-full left-0 mb-2 w-48 bg-gray-900 rounded-lg shadow-lg text-white"
              >
                <ul className="py-1">
                  <li
                    className="flex items-center gap-3 px-4 py-2 hover:bg-gray-800 cursor-pointer"
                    onClick={() => {
                      setModalOpen(true);
                      setMenuOpen(false);
                    }}
                  >
                    <BookOpen className="w-5 h-5 text-gray-400" />
                    <span>Import lecture</span>
                  </li>
                  <li 
                    className={`flex items-center gap-3 px-4 py-2 hover:bg-gray-800 cursor-pointer ${
                      selectedFiles.length >= MAX_FILES ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={handleFileUploadClick}
                  >
                    <Paperclip className="w-5 h-5 text-gray-400" />
                    <span>Upload files {selectedFiles.length >= MAX_FILES ? '(Max reached)' : `(${selectedFiles.length}/${MAX_FILES})`}</span>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
            accept="*/*"
          />

          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            className="flex-1 bg-transparent resize-none focus:outline-none min-h-[24px] max-h-32"
            rows="1"
          />
          
          <button
            type="submit"
            disabled={(!inputValue.trim() && selectedFiles.length === 0) || isLoading}
            className="p-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
      <ImportLectureModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onImport={handleImportLecture}
      />
    </div>
  );
};

export default MessageInput;