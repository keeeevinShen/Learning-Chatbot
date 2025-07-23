import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, FileText, X, Upload, CheckCircle, Edit3 } from 'lucide-react';
import FileUpload from '../components/FileUpload';

const embeddingModels = [
  { id: 'openai', name: 'OpenAI', model: 'text-embedding-3-large' },
  { id: 'huggingface', name: 'Hugging Face', model: 'sentence-transformers/all-MiniLM-L6-v2' },
];

const EmbedDocumentPage = () => {
  const [chunkSize, setChunkSize] = useState(1000);
  const [selectedModel, setSelectedModel] = useState(embeddingModels[0].id);
  const [filesToUpload, setFilesToUpload] = useState([]);
  const [fileMetadata, setFileMetadata] = useState({});
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [embeddingSuccess, setEmbeddingSuccess] = useState(false);

  const handleFileUpload = (files) => {
    // Add new files to existing ones, avoiding duplicates
    const newFiles = files.filter(newFile => 
      !filesToUpload.some(existingFile => 
        existingFile.name === newFile.name && existingFile.size === newFile.size
      )
    );
    
    // Initialize metadata for new files
    const newMetadata = { ...fileMetadata };
    newFiles.forEach((file, index) => {
      const fileId = `${file.name}-${file.size}`;
      if (!newMetadata[fileId]) {
        newMetadata[fileId] = {
          title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
          description: '',
          tags: ''
        };
      }
    });
    
    setFileMetadata(newMetadata);
    setFilesToUpload(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index) => {
    const fileToRemove = filesToUpload[index];
    const fileId = `${fileToRemove.name}-${fileToRemove.size}`;
    
    // Remove file metadata
    const newMetadata = { ...fileMetadata };
    delete newMetadata[fileId];
    setFileMetadata(newMetadata);
    
    setFilesToUpload(prev => prev.filter((_, i) => i !== index));
  };

  const updateFileMetadata = (fileId, field, value) => {
    setFileMetadata(prev => ({
      ...prev,
      [fileId]: {
        ...prev[fileId],
        [field]: value
      }
    }));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleEmbed = async () => {
    if (filesToUpload.length === 0) {
      alert('Please upload at least one file before embedding.');
      return;
    }

    console.log('Embedding files:', filesToUpload);
    console.log('File metadata:', fileMetadata);
    console.log('Chunk size:', chunkSize);
    console.log('Embedding model:', selectedModel);
    
    setIsEmbedding(true);
    setEmbeddingSuccess(false);

    try {
      // Prepare multipart/form-data
      const formData = new FormData();
      
      // Add configuration parameters
      formData.append('chunk_size', chunkSize.toString());
      formData.append('embedding_model', selectedModel);
      
      // Add each file and its metadata to the form data
      filesToUpload.forEach((file, index) => {
        const fileId = `${file.name}-${file.size}`;
        formData.append('files', file);
        formData.append(`metadata_${index}`, JSON.stringify(fileMetadata[fileId] || {}));
      });

      // Send to backend (replace with your actual endpoint)
      const response = await fetch(`${import.meta.env.VITE_SERVER_ADDRESS}/embed-documents`, {
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
      // Optionally clear files after successful embedding
      // setFilesToUpload([]);
      // setFileMetadata({});
      
    } catch (error) {
      console.error('Error embedding files:', error);
      alert('Failed to embed documents. Please try again.');
    } finally {
      setIsEmbedding(false);
    }
  };

  return (
    <div className="h-screen bg-gray-900 text-gray-100 overflow-y-auto">
      <div className="w-full max-w-6xl mx-auto py-8 px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold">Embed a Document</h1>
          <p className="text-gray-400">Upload documents to embed them into the knowledge base.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Left side: File Upload */}
          <div className="flex flex-col">
            <FileUpload 
              onFileUpload={handleFileUpload} 
              uploadedFilesCount={filesToUpload.length}
            />
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
                  <label htmlFor="embeddingModel" className="text-lg font-medium">Embedding Model</label>
                  <div className="relative ml-2 group">
                    <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-300 cursor-help" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-3 py-2 bg-gray-700 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-64 z-10 pointer-events-none">
                      <div className="space-y-1">
                        <div><strong>OpenAI:</strong> High-performance but slower</div>
                        <div><strong>Hugging Face:</strong> Faster but lower-performance</div>
                      </div>
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-700"></div>
                    </div>
                  </div>
                </div>
                <select
                  id="embeddingModel"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md"
                >
                  {embeddingModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} ({model.model})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Uploaded Files Display - Full Width */}
        {filesToUpload.length > 0 && (
          <div className="mt-8 bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-400" />
                Uploaded Files ({filesToUpload.length})
              </h3>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
              {filesToUpload.map((file, index) => {
                const fileId = `${file.name}-${file.size}`;
                const metadata = fileMetadata[fileId] || {};
                
                return (
                  <div key={index} className="bg-gray-700 rounded-lg p-4 flex-shrink-0 w-80">
                    {/* File Info Row */}
                    <div className="flex items-center gap-3 mb-3">
                      <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-200 truncate" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatFileSize(file.size)} • {file.type || 'Unknown type'}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="p-1.5 hover:bg-gray-600 rounded-full transition-colors"
                        title="Remove file"
                      >
                        <X className="w-4 h-4 text-gray-400 hover:text-red-400" />
                      </button>
                    </div>
                    
                    {/* Metadata Inputs */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
                        <textarea
                          value={metadata.description || ''}
                          onChange={(e) => updateFileMetadata(fileId, 'description', e.target.value)}
                          placeholder="Brief description (optional)"
                          className="w-full px-2 py-1 text-xs bg-gray-600 border border-gray-500 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                          rows="2"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Tags</label>
                        <input
                          type="text"
                          value={metadata.tags || ''}
                          onChange={(e) => updateFileMetadata(fileId, 'tags', e.target.value)}
                          placeholder="Tag1, Tag2, Tag3"
                          className="w-full px-2 py-1 text-xs bg-gray-600 border border-gray-500 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col items-center gap-4">
          {embeddingSuccess && (
            <div className="flex items-center gap-2 text-green-400 font-medium">
              <CheckCircle className="w-5 h-5" />
              Documents embedded successfully!
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
              disabled={isEmbedding || filesToUpload.length === 0}
              className={`py-2 px-6 rounded-md text-white font-semibold transition-colors ${
                isEmbedding || filesToUpload.length === 0
                  ? 'bg-gray-600 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
            >
              {isEmbedding ? 'Embedding...' : `Embed ${filesToUpload.length} File${filesToUpload.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmbedDocumentPage; 