// src/components/Message.jsx

import React, { useState } from 'react';
import { Sparkles, Copy, Check, FileText, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

  // Check if content has incomplete code blocks for streaming
  const hasIncompleteCodeBlock = (content) => {
    const codeBlockMatches = content.match(/```/g);
    return codeBlockMatches && codeBlockMatches.length % 2 !== 0;
  };

  // Custom components for react-markdown
  const markdownComponents = {
    // Code block component with copy functionality
    code: ({ inline, className, children, ...props }) => {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : 'plaintext';
      const codeContent = String(children).replace(/\n$/, '');
      const codeIndex = `${index}-${language}-${codeContent.slice(0, 10)}`;
      
      if (!inline) {
        return (
          <div className="my-2 relative group">
            <div className="bg-gray-950 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-900 text-gray-400 text-sm">
                <span>{language}</span>
                <button
                  onClick={() => copyCode(codeContent, codeIndex)}
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
                <code className="text-gray-300 text-sm" {...props}>
                  {children}
                </code>
              </pre>
            </div>
          </div>
        );
      }
      
      // Inline code
      return (
        <code className="bg-gray-800 text-gray-300 px-1 py-0.5 rounded text-sm" {...props}>
          {children}
        </code>
      );
    },
    
    // Heading components
    h1: ({ children, ...props }) => (
      <h1 className="text-2xl font-bold text-gray-100 mb-4 mt-6 first:mt-0" {...props}>
        {children}
      </h1>
    ),
    h2: ({ children, ...props }) => (
      <h2 className="text-xl font-bold text-gray-100 mb-3 mt-5 first:mt-0" {...props}>
        {children}
      </h2>
    ),
    h3: ({ children, ...props }) => (
      <h3 className="text-lg font-bold text-gray-100 mb-3 mt-4 first:mt-0" {...props}>
        {children}
      </h3>
    ),
    h4: ({ children, ...props }) => (
      <h4 className="text-base font-bold text-gray-100 mb-2 mt-3 first:mt-0" {...props}>
        {children}
      </h4>
    ),
    
    // List components
    ul: ({ children, ...props }) => (
      <ul className="list-disc list-inside mb-4 text-gray-100 space-y-1" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className="list-decimal list-inside mb-4 text-gray-100 space-y-1" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li className="text-gray-100" {...props}>
        {children}
      </li>
    ),
    
    // Paragraph component
    p: ({ children, ...props }) => (
      <p className="text-gray-100 mb-4 leading-relaxed" {...props}>
        {children}
      </p>
    ),
    
    // Strong/bold text
    strong: ({ children, ...props }) => (
      <strong className="font-bold text-gray-100" {...props}>
        {children}
      </strong>
    ),
    
    // Emphasis/italic text
    em: ({ children, ...props }) => (
      <em className="italic text-gray-100" {...props}>
        {children}
      </em>
    ),
    
    // Blockquote
    blockquote: ({ children, ...props }) => (
      <blockquote className="border-l-4 border-gray-600 pl-4 my-4 italic text-gray-300" {...props}>
        {children}
      </blockquote>
    ),
    
    // Horizontal rule
    hr: ({ ...props }) => (
      <hr className="border-gray-600 my-6" {...props} />
    ),
    
    // Table components
    table: ({ children, ...props }) => (
      <div className="overflow-x-auto mb-4">
        <table className="min-w-full border-collapse border border-gray-600" {...props}>
          {children}
        </table>
      </div>
    ),
    th: ({ children, ...props }) => (
      <th className="border border-gray-600 px-3 py-2 bg-gray-800 text-left font-semibold text-gray-100" {...props}>
        {children}
      </th>
    ),
    td: ({ children, ...props }) => (
      <td className="border border-gray-600 px-3 py-2 text-gray-100" {...props}>
        {children}
      </td>
    ),
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

  // Bot message rendering with markdown
  let contentToRender = message.content;
  
  // Handle streaming: don't render incomplete code blocks
  if (message.isStreaming && hasIncompleteCodeBlock(contentToRender)) {
    // Find the last opening ``` and remove everything from there
    const lastCodeBlockStart = contentToRender.lastIndexOf('```');
    if (lastCodeBlockStart !== -1) {
      contentToRender = contentToRender.substring(0, lastCodeBlockStart).trim();
      // Add a note that more content is coming
      contentToRender += '\n\n*[Processing code block...]*';
    }
  }

  return (
    <div className="flex mb-2">
      <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center mr-3">
        <Sparkles className={`w-5 h-5 text-white ${message.isStreaming ? 'animate-pulse' : ''}`} />
      </div>
      <div className="max-w-2xl min-w-0 flex-1">
        <div className="prose prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {contentToRender}
          </ReactMarkdown>
        </div>
        
        {/* Show typing cursor if message is streaming */}
        {message.isStreaming && (
          <span className="inline-block w-2 h-5 bg-gray-300 animate-pulse ml-1"></span>
        )}
      </div>
    </div>
  );
};

export default Message;