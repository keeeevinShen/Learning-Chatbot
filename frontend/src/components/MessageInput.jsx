// src/components/MessageInput.jsx

import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Send, BookOpen, Plus, X, FileText, AlertCircle, ChevronDown, Check, Brain } from 'lucide-react';
import ImportLectureModal from './ImportLectureModal';
import { importLecture } from '../service/chatService';

const models = [
  "Fast Response",
  "Smart Response"
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
      onSendMessage(inputValue, selectedFiles, feynmanMode);
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

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    if (selectedFiles.length + files.length > MAX_FILES) {
      setFileError(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    const validFiles = files.map(file => ({
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      isLectureTranscript: false
    }));

    setSelectedFiles(prev => [...prev, ...validFiles]);
    e.target.value = '';
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleImportLecture = async (url) => {
    setIsImporting(true);
    try {
      const result = await importLecture(url);
      
      const lectureFile = {
        file: null,
        name: result.title || 'Imported Lecture',
        size: 0,
        type: 'lecture/transcript',
        isLectureTranscript: true,
        content: result.content,
        transcript_id: result.transcript_id
      };
      
      setSelectedFiles(prev => [...prev, lectureFile]);
      setModalOpen(false);
    } catch (error) {
      setFileError('Failed to import lecture. Please try again.');
      console.error('Import error:', error);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="bg-gray-900 p-4">
      {/* File error display */}
      {fileError && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg flex items-center gap-2 text-red-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{fileError}</span>
        </div>
      )}

      {/* Selected files display */}
      {selectedFiles.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-gray-400 mb-2">Attached files:</div>
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 text-sm max-w-xs"
              >
                {file.isLectureTranscript ? (
                  <BookOpen className="w-3 h-3 text-purple-400" />
                ) : (
                  <FileText className="w-3 h-3 text-blue-400" />
                )}
                <span className="text-xs text-gray-300 flex-1 truncate">
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
          className="w-full bg-transparent resize-none focus:outline-none min-h-[40px] max-h-40 text-white placeholder-gray-400"
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
                        selectedFiles.length >= MAX_FILES ? 
                        'opacity-50 cursor-not-allowed' : ''
                      }`}
                      onClick={() => {
                        if (selectedFiles.length < MAX_FILES) {
                          fileInputRef.current?.click();
                          setMenuOpen(false);
                        }
                      }}
                    >
                      <Paperclip className="w-5 h-5 text-gray-400" />
                      <span>Attach files ({selectedFiles.length}/{MAX_FILES})</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>
            
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