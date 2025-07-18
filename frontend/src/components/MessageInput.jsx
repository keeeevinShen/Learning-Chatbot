// src/components/MessageInput.jsx

import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Send, BookOpen, Plus, X, FileText, AlertCircle, ChevronDown, Check, Brain } from 'lucide-react';
import ImportLectureModal from './ImportLectureModal';
import { importLecture } from '../service/chatService';

const models = [
  "Gemini 2.5 pro",
  "Claude Sonnet 4",
  "Grok 3"
];

const MessageInput = ({ onSendMessage, isLoading }) => {
  const [inputValue, setInputValue] = useState('');
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isModelMenuOpen, setModelMenuOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(models[0]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileError, setFileError] = useState('');
  const [feynmanMode, setFeynmanMode] = useState(false);
  
  // New states for lecture import process
  const [isImporting, setIsImporting] = useState(false);
  
  const textareaRef = useRef(null);
  const menuRef = useRef(null);
  const modelMenuRef = useRef(null);
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
      if (modelMenuRef.current && !modelMenuRef.current.contains(event.target)) {
        setModelMenuOpen(false);
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

  const handleImportLecture = async (lectureUrl) => {
    try {
      console.log('Importing lecture from URL:', lectureUrl);
      
      // Start the importing process
      setIsImporting(true);
      setModalOpen(false); // Close the input modal
      
      // Call the import lecture API
      const result = await importLecture(lectureUrl);
      
      console.log('Lecture import successful:', result);
      
      // Stop importing
      setIsImporting(false);
      
      // Create a mock file object for the lecture transcript
      const lectureFile = {
        name: result.filename || 'lecture transcript.txt',
        size: 0, // Placeholder size since it's a transcript
        type: 'text/plain',
        isLectureTranscript: true, // Flag to identify this as a lecture transcript
        url: lectureUrl // Store the original URL for reference
      };
      
      // Add the lecture transcript as a selected file
      setSelectedFiles(prev => {
        const newCount = prev.length + 1;
        if (newCount > MAX_FILES) {
          setFileError(`You can only upload up to ${MAX_FILES} files. Lecture transcript was not added.`);
          return prev;
        }
        setFileError(''); // Clear any existing errors
        return [...prev, lectureFile];
      });
      
    } catch (error) {
      console.error('Failed to import lecture:', error);
      
      // Stop importing on error
      setIsImporting(false);
      
      // Show error notification
      alert('Failed to import lecture. Please check the URL and try again.');
    }
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
    <div className="p-2">
      <div className="max-w-3xl mx-auto">
        {/* File error message */}
        {fileError && (
          <div className="mb-2 flex items-center gap-2 bg-red-900/50 border border-red-700 rounded-lg p-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-xs text-red-200">{fileError}</span>
          </div>
        )}

        {/* Selected files display */}
        {selectedFiles.length > 0 && (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">
                Selected files ({selectedFiles.length}/{MAX_FILES})
              </span>
            </div>
            <div className="space-y-1">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 bg-gray-800 rounded-lg p-1.5">
                  {file.isLectureTranscript ? (
                    <BookOpen className="w-3 h-3 text-purple-400" />
                  ) : (
                    <FileText className="w-3 h-3 text-blue-400" />
                  )}
                  <span className="text-xs text-gray-300 flex-1">
                    {file.name} {!file.isLectureTranscript && `(${formatFileSize(file.size)})`}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="p-0.5 hover:bg-gray-700 rounded-full transition-colors"
                  >
                    <X className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-2xl p-2">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            className="w-full bg-transparent resize-none focus:outline-none min-h-[40px] max-h-40"
            rows="1"
          />
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
            accept="*/*"
          />

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen(prev => !prev)}
                  className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
                >
                  <Plus className="w-4 h-4" />
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
              
              {/* Feynman Mode Toggle Button */}
              <button
                type="button"
                onClick={() => setFeynmanMode(prev => !prev)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                  feynmanMode 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
                title={feynmanMode ? 'Feynman Mode: ON' : 'Feynman Mode: OFF'}
              >
                <Brain className="w-4 h-4" />
                <span className="text-sm font-medium">Feynman Mode</span>
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="relative" ref={modelMenuRef}>
                <button
                  type="button"
                  onClick={() => setModelMenuOpen(prev => !prev)}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300 transition-colors"
                >
                  <span>{selectedModel}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {isModelMenuOpen && (
                  <div className="absolute bottom-full right-0 mb-2 w-48 bg-gray-900 rounded-lg shadow-lg text-white">
                    <ul className="py-1">
                      {models.map(model => (
                        <li
                          key={model}
                          className="flex items-center justify-between px-4 py-2 hover:bg-gray-800 cursor-pointer"
                          onClick={() => {
                            setSelectedModel(model);
                            setModelMenuOpen(false);
                          }}
                        >
                          <span>{model}</span>
                          {selectedModel === model && <Check className="w-4 h-4 text-purple-400" />}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={(!inputValue.trim() && selectedFiles.length === 0) || isLoading}
                className="p-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      </div>
      <ImportLectureModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onImport={handleImportLecture}
      />
      
      {/* Waiting Window */}
      {isImporting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md relative">
            <div className="flex flex-col items-center text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4"></div>
              <h3 className="text-lg font-semibold text-white mb-2">Processing Lecture Import</h3>
              <p className="text-gray-300">Please wait, be ready to check your DUO mobile app for authentication</p>
            </div>
          </div>
        </div>
      )}
      

    </div>
  );
};

export default MessageInput;