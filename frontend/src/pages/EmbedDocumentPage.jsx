import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, FileText, X, Upload, CheckCircle } from 'lucide-react';

const EmbedDocumentPage = () => {
  const [chunkSize, setChunkSize] = useState(1000);
  const [chunkOverlap, setChunkOverlap] = useState(200);
  const [textContent, setTextContent] = useState('');
  const [topic, setTopic] = useState('');
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [embeddingSuccess, setEmbeddingSuccess] = useState(false);

  const handleEmbed = async () => {
    if (!textContent.trim()) {
      alert('Please paste some text content before embedding.');
      return;
    }

    console.log('Embedding text content');
    console.log('Topic:', topic);
    console.log('Chunk size:', chunkSize);
    console.log('Chunk overlap:', chunkOverlap);
    
    setIsEmbedding(true);
    setEmbeddingSuccess(false);

    try {
      // Prepare multipart/form-data
      const formData = new FormData();
      
      // Add configuration parameters
      formData.append('chunk_size', chunkSize.toString());
      formData.append('chunk_overlap', chunkOverlap.toString());
      
      // Create a text file from the content
      const textBlob = new Blob([textContent], { type: 'text/plain' });
      const fileName = topic.trim() || 'pasted_content.txt';
      const textFile = new File([textBlob], fileName, { type: 'text/plain' });
      
      // Add the text file and metadata
      formData.append('files', textFile);
      
      const metadata = {
        title: topic || fileName,
        description: '',
        tags: ''
      };
      formData.append('metadata_0', JSON.stringify(metadata));

      // Send to backend (replace with your actual endpoint)
      const response = await fetch(`/api/embed-documents`, {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        body: formData, // Browser will set Content-Type with boundary automatically
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Embedding result:', result);
      
      setEmbeddingSuccess(true);
      
    } catch (error) {
      console.error('Error embedding content:', error);
      alert('Failed to embed content. Please try again.');
    } finally {
      setIsEmbedding(false);
    }
  };

  return (
    <div className="h-screen bg-gray-900 text-gray-100 overflow-y-auto">
      <div className="w-full max-w-6xl mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold">Embed knowledge</h1>
          <p className="text-gray-400">Paste your text content to embed it into the knowledge base.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Left side: Text Input */}
          <div className="flex flex-col">
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-lg font-medium mb-4">Paste the knowledge LLM should assume you know</h3>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Paste your text content here..."
                className="w-full h-64 p-4 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-gray-100"
              />
              <div className="mt-2 text-sm text-gray-400">
                {textContent.length} characters
              </div>
            </div>
          </div>

          {/* Right side: Settings - Fixed Height */}
          <div className="bg-gray-800 p-6 rounded-lg h-fit md:sticky md:top-4">
            <div className="space-y-6">
              <div>
                <div className="flex items-center mb-2">
                  <label htmlFor="chunkSize" className="text-lg font-medium">Chunk Size</label>
                  <div className="relative ml-2 group">
                    <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-300 cursor-help" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-3 py-2 bg-gray-700 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-64 z-10 pointer-events-none">
                      <div className="space-y-1">
                        <div><strong>Large Chunks:</strong> Better for context and summarization.</div>
                        <div><strong>Small Chunks:</strong> Better for precision and fact retrieval.</div>
                      </div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-700"></div>
                    </div>
                  </div>
                </div>
                <input
                  type="number"
                  id="chunkSize"
                  value={chunkSize}
                  onChange={(e) => setChunkSize(Number(e.target.value))}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md"
                  min="100"
                  max="8000"
                  step="100"
                />
              </div>
              <div>
                <div className="flex items-center mb-2">
                  <label htmlFor="chunkOverlap" className="text-lg font-medium">Chunk Overlap</label>
                  <div className="relative ml-2 group">
                    <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-300 cursor-help" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-3 py-2 bg-gray-700 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-64 z-10 pointer-events-none">
                      <div className="space-y-1">
                        <div><strong>Overlap:</strong> Number of characters shared between adjacent chunks.</div>
                        <div><strong>Higher Overlap:</strong> Better context preservation across chunks.</div>
                        <div><strong>Lower Overlap:</strong> More distinct chunks, less redundancy.</div>
                      </div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-700"></div>
                    </div>
                  </div>
                </div>
                <input
                  type="number"
                  id="chunkOverlap"
                  value={chunkOverlap}
                  onChange={(e) => setChunkOverlap(Number(e.target.value))}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md"
                  min="0"
                  max={Math.floor(chunkSize * 0.8)}
                  step="50"
                />
              </div>
              <div>
                <div className="flex items-center mb-2">
                  <label htmlFor="topic" className="text-lg font-medium">Topic</label>
                  <div className="relative ml-2 group">
                    <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-300 cursor-help" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-3 py-2 bg-gray-700 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-64 z-10 pointer-events-none">
                      <div className="space-y-1">
                        <div><strong>Topic:</strong> A brief description of what this content is about.</div>
                        <div><strong>Purpose:</strong> Helps organize and identify content in the knowledge base.</div>
                      </div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-700"></div>
                    </div>
                  </div>
                </div>
                <input
                  type="text"
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Machine Learning Basics"
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col items-center gap-4">
          {embeddingSuccess && (
            <div className="flex items-center gap-2 text-green-400 font-medium">
              <CheckCircle className="w-5 h-5" />
              Content embedded successfully!
            </div>
          )}
          {isEmbedding && (
            <div className="text-blue-400 font-medium animate-pulse">
              Embedding in progress... Feel free to leave the page now
            </div>
          )}
          <div className="flex justify-center gap-4">
            <Link to="/" className="py-2 px-4 text-indigo-400 hover:text-indigo-300">
              &larr; Back to Chat
            </Link>
            <button
              onClick={handleEmbed}
              disabled={isEmbedding || !textContent.trim()}
              className={`py-2 px-6 rounded-md text-white font-semibold transition-colors ${
                isEmbedding || !textContent.trim()
                  ? 'bg-gray-600 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
            >
              {isEmbedding ? 'Embedding...' : 'Embed Content'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmbedDocumentPage; 