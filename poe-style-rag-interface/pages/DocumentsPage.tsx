import React, { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, Search, AlertCircle, Loader, FileType, CheckCircle2, XCircle, FileIcon } from 'lucide-react';
import { fetchDocuments, uploadFile, deleteDocument } from '../services/api';

interface Document {
  id: string;
  name: string;
  size: number;
  uploaded_at: string;
  status?: string;
}

const SUPPORTED_FORMATS = [
  "PDF", "TXT", "MD", "DOCX", "PPTX", "XLSX", "CSV", "Images"
];

const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Upload states
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState<'uploading' | 'processing' | 'done'>('done');

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const data = await fetchDocuments();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error("Failed to load documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setUploading(true);
    setUploadProgress(0);
    setCurrentFile(file.name);
    setUploadError(null);
    setProcessingStage('uploading');

    try {
      await uploadFile(file, (percent) => {
        setUploadProgress(percent);
        if (percent === 100) {
          setProcessingStage('processing');
        }
      });
      
      setProcessingStage('done');
      await loadDocuments();
      
      // Reset after success
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        setCurrentFile('');
      }, 1500);
      
    } catch (error: any) {
      console.error("Upload failed:", error);
      setUploadError(error.message || "Upload failed. Please try again.");
      setProcessingStage('done');
      // Keep error visible
    } finally {
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    const originalDocs = [...documents];
    setDocuments(docs => docs.filter(d => d.id !== id));
    try {
      await deleteDocument(id);
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete document.");
      setDocuments(originalDocs);
    }
  };

  const filteredDocs = documents.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'Unknown date';
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, { 
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch (e) { return 'Invalid Date'; }
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return 'Unknown size';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div 
      className="flex-1 bg-gray-950 text-gray-100 p-8 overflow-y-auto"
      style={{ paddingTop: 'max(3rem, env(safe-area-inset-top) + 3rem)' }}
    >
      <div className="max-w-5xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Knowledge Base</h1>
            <p className="text-gray-400">Manage documents used for RAG context.</p>
            
            <div className="flex flex-wrap gap-2 mt-3">
              {SUPPORTED_FORMATS.map(fmt => (
                <span key={fmt} className="text-[10px] font-semibold bg-gray-900 text-gray-500 border border-gray-800 px-2 py-0.5 rounded">
                  {fmt}
                </span>
              ))}
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <label className={`relative flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl cursor-pointer transition-all shadow-lg shadow-blue-900/20 overflow-hidden ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <Upload size={20} />
              <span className="font-medium">Upload Document</span>
              <input 
                type="file" 
                className="hidden" 
                accept=".pdf,.txt,.md,.csv,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.jpg,.jpeg,.png,.webp" 
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          </div>
        </div>

        {/* Upload Progress Card */}
        {(uploading || uploadError) && (
          <div className={`mb-6 rounded-xl border p-4 transition-all ${uploadError ? 'bg-red-900/10 border-red-800/50' : 'bg-gray-900 border-gray-800'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${uploadError ? 'bg-red-900/20 text-red-400' : 'bg-blue-900/20 text-blue-400'}`}>
                {uploadError ? <AlertCircle size={20} /> : <FileIcon size={20} />}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-medium text-sm truncate text-gray-200">{currentFile}</h4>
                  <span className={`text-xs font-medium ${uploadError ? 'text-red-400' : 'text-blue-400'}`}>
                    {uploadError ? 'Failed' : processingStage === 'processing' ? 'Processing...' : `${uploadProgress}%`}
                  </span>
                </div>
                
                {uploadError ? (
                  <p className="text-xs text-red-400">{uploadError}</p>
                ) : (
                  <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${processingStage === 'processing' ? 'bg-blue-400 animate-pulse' : 'bg-blue-500'}`}
                      style={{ width: processingStage === 'processing' ? '100%' : `${uploadProgress}%` }}
                    />
                  </div>
                )}
                
                {processingStage === 'processing' && !uploadError && (
                  <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1.5">
                    <Loader size={10} className="animate-spin" />
                    Parsing document structure and generating embeddings...
                  </p>
                )}
              </div>

              {uploadError && (
                <button onClick={() => { setUploadError(null); setUploading(false); }} className="p-1 hover:bg-red-900/20 rounded text-gray-500 hover:text-red-400">
                  <XCircle size={18} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6 flex items-center gap-3 px-4 focus-within:ring-2 focus-within:ring-blue-500/30 transition-all shadow-sm">
          <Search size={20} className="text-gray-500" />
          <input 
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none focus:outline-none text-white w-full py-2.5 placeholder-gray-600"
          />
        </div>

        {/* Document List */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-3">
              <Loader className="animate-spin text-blue-500" size={24} />
              <p>Loading library...</p>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-gray-800/50 rounded-2xl flex items-center justify-center mb-4 border border-gray-800 border-dashed">
                <FileType size={32} className="text-gray-600" />
              </div>
              <h3 className="text-lg font-medium text-white mb-1">No documents found</h3>
              <p className="text-gray-500 text-sm max-w-xs mx-auto">
                Upload documents to enhance your bot's knowledge.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800/50">
              {filteredDocs.map((doc) => (
                <div key={doc.id} className="p-4 hover:bg-gray-800 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0 border border-gray-700/50 group-hover:border-gray-600 transition-colors">
                      <FileText size={24} className="text-blue-500" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-gray-200 truncate pr-4 mb-0.5" title={doc.name}>
                        {doc.name}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">
                          {formatSize(doc.size)}
                        </span>
                        <span>{formatDate(doc.uploaded_at)}</span>
                        {doc.status === 'processing_failed' && (
                          <span className="text-red-400 flex items-center gap-1 bg-red-400/10 px-1.5 py-0.5 rounded">
                            <AlertCircle size={10} /> Failed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleDelete(doc.id)}
                    className="p-2.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0"
                    title="Delete document"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentsPage;