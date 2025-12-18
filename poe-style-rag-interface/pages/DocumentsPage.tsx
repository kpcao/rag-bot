import React, { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, Search, AlertCircle, Loader } from 'lucide-react';
import { fetchDocuments, uploadFile, deleteDocument } from '../services/api';

interface Document {
  id: string;
  name: string;
  size: number;
  uploaded_at: string;
  status?: string;
}

const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
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

    try {
      await uploadFile(file);
      await loadDocuments(); 
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
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
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return 'Unknown size';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex-1 bg-gray-900 text-gray-100 p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            {/* ★ 修改：去掉 HKU */}
            <h1 className="text-2xl font-bold text-white mb-2">Knowledge Base</h1>
            <p className="text-gray-400">Manage documents used for RAG context.</p>
          </div>
          
          <label className={`flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl cursor-pointer transition-all shadow-lg shadow-blue-900/20 ${uploading ? 'opacity-70 cursor-not-allowed' : ''}`}>
            {uploading ? <Loader className="animate-spin" size={20} /> : <Upload size={20} />}
            <span className="font-medium">{uploading ? 'Processing...' : 'Upload Document'}</span>
            <input 
              type="file" 
              className="hidden" 
              accept=".pdf,.txt,.md,.csv,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.jpg,.jpeg,.png,.webp" 
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>
        </div>

        {/* Search Bar */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-2 mb-6 flex items-center gap-3 px-4 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
          <Search size={20} className="text-gray-500" />
          <input 
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none focus:outline-none text-white w-full py-2 placeholder-gray-500"
          />
        </div>

        {/* Document List */}
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading documents...</div>
          ) : filteredDocs.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <FileText size={32} className="text-gray-600" />
              </div>
              <h3 className="text-lg font-medium text-white mb-1">No documents found</h3>
              <p className="text-gray-500 text-sm">Upload PDF, TXT, or MD files to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {filteredDocs.map((doc) => (
                <div key={doc.id} className="p-4 hover:bg-gray-800/50 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-700">
                      <FileText size={20} className="text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-medium text-gray-200 truncate pr-4" title={doc.name}>
                        {doc.name}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{formatSize(doc.size)}</span>
                        <span>•</span>
                        <span>{formatDate(doc.uploaded_at)}</span>
                        {doc.status === 'processing_failed' && (
                          <span className="text-red-400 flex items-center gap-1">
                            <AlertCircle size={10} /> Failed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleDelete(doc.id)}
                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
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