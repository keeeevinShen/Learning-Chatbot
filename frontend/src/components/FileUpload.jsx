import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Plus } from 'lucide-react';

const FileUpload = ({ onFileUpload, uploadedFilesCount = 0 }) => {
  const onDrop = useCallback((acceptedFiles) => {
    onFileUpload(acceptedFiles);
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div
      {...getRootProps()}
      className={`p-10 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-indigo-400 bg-gray-800' : 'border-gray-600 hover:border-gray-500'}`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center space-y-4">
        {uploadedFilesCount > 0 ? (
          <Plus className="w-12 h-12 text-indigo-400" />
        ) : (
          <svg
            className="w-12 h-12 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-4-4V7a4 4 0 014-4h5l2 2h2a2 2 0 012 2v2m-4.5 4.5l-3 3-3-3"
            />
          </svg>
        )}
        <p className="text-lg font-semibold text-gray-300">
          {uploadedFilesCount > 0 
            ? `Add more files (${uploadedFilesCount} already uploaded)`
            : 'Click to upload or drag and drop'
          }
        </p>
        <p className="text-sm text-gray-500">
          supports text files, csv's, spreadsheets, audio files, and more!
        </p>
      </div>
    </div>
  );
};

export default FileUpload; 