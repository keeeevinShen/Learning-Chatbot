// src/components/Message.jsx

import React, { useState } from 'react';
import { Sparkles, Copy, Check, FileText, Download } from 'lucide-react';

const Message = ({ message, index }) => {
  const [copiedCode, setCopiedCode] = useState(null);

  const copyCode = (code, codeIndex) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(codeIndex);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (message.type === 'user') {
    return (
      <div className="flex justify-end mb-2">
        <div className="max-w-2xl">
          {/* Message content */}
          {message.content && (
            <div className="px-4 py-2 bg-gray-700 text-gray-100 rounded-lg mb-1">
              {message.content}
            </div>
          )}
          
          {/* File attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="space-y-1">
              {message.attachments.map((attachment, attachmentIndex) => (
                <div 
                  key={attachmentIndex} 
                  className="flex items-center gap-2 bg-gray-800 rounded-lg p-2 border border-gray-600"
                >
                  <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate">{attachment.name}</p>
                    <p className="text-xs text-gray-400">{formatFileSize(attachment.size)}</p>
                  </div>
                  <Download className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Parse and render bot messages with code blocks
  const parts = message.content.split(/```(\w+)?\n([\s\S]*?)```/);
  
  return (
    <div className="flex mb-2">
      <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center mr-3">
        <Sparkles className={`w-5 h-5 text-white ${message.isStreaming ? 'animate-pulse' : ''}`} />
      </div>
      <div className="max-w-2xl">
        {parts.map((part, partIndex) => {
          if (partIndex % 3 === 2) {
            // This is code content
            const language = parts[partIndex - 1] || 'plaintext';
            const codeIndex = `${index}-${partIndex}`;
            return (
              <div key={partIndex} className="my-2 relative group">
                <div className="bg-gray-950 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-900 text-gray-400 text-sm">
                    <span>{language}</span>
                    <button
                      onClick={() => copyCode(part, codeIndex)}
                      className="flex items-center gap-1 hover:text-gray-200 transition-colors"
                    >
                      {copiedCode === codeIndex ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 overflow-x-auto">
                    <code className="text-gray-300 text-sm">{part}</code>
                  </pre>
                </div>
              </div>
            );
          } else if (partIndex % 3 === 0 && part.trim()) {
            // This is regular text
            return (
              <div key={partIndex} className="text-gray-100 whitespace-pre-wrap">
                {part}
              </div>
            );
          }
          return null;
        })}
        {/* Show typing cursor if message is streaming */}
        {message.isStreaming && (
          <span className="inline-block w-2 h-5 bg-gray-300 animate-pulse ml-1"></span>
        )}
      </div>
    </div>
  );
};

export default Message;