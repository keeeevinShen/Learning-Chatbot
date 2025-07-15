import React from 'react';
import { X } from 'lucide-react';

const ImportLectureModal = ({ isOpen, onClose, onImport }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-semibold mb-4 text-white">Import lecture</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Lecture URL"
            className="flex-1 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={onImport}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportLectureModal; 