// src/components/ChatHeader.jsx

import React from 'react';
import { FileDown } from 'lucide-react';

const ChatHeader = () => {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-800">
      <h1 className="text-xl font-bold">Feynman Learning Agent</h1>
      <button className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors">
        <FileDown className="w-5 h-5" />
        <span>Embed a Document</span>
      </button>
    </div>
  );
};

export default ChatHeader;