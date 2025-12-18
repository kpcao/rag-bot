import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  UploadCloud, MessageCircle, Settings, FileText, Home, Loader2, 
  Plus, Trash2, Send, AlertCircle, RefreshCw, Check, X, ChevronRight,
  Menu, ArrowLeft
} from "lucide-react";

const API_BASE_URL = '/api';

// ★★★ NEW: Lightweight Markdown Renderer Component ★★★
const MarkdownRenderer = ({ content }) => {
  if (!content) return null;

  // Helper to parse inline formatting (Bold, Code)
  const parseInline = (text) => {
    // Split by **bold** or `code` regex
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-blue-300">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={index} className="bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-yellow-300">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  const lines = content.split('\n');
  const elements = [];
  let currentList = [];
  
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    // List Item detection (* or -)
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      currentList.push(trimmed.substring(2));
    } else {
      // If we were in a list, close it and render
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${index}`} className="list-disc pl-5 mb-3 space-y-1 text-gray-300">
            {currentList.map((item, i) => (
              <li key={i}>{parseInline(item)}</li>
            ))}
          </ul>
        );
        currentList = [];
      }
      
      // Headers
      if (trimmed.startsWith('### ')) {
        elements.push(<h3 key={`h3-${index}`} className="text-lg font-bold mt-4 mb-2 text-blue-200">{parseInline(trimmed.substring(4))}</h3>);
      } else if (trimmed.startsWith('## ')) {
        elements.push(<h2 key={`h2-${index}`} className="text-xl font-bold mt-5 mb-3 text-blue-300 border-b border-gray-700 pb-1">{parseInline(trimmed.substring(3))}</h2>);
      } else if (trimmed.startsWith('# ')) {
        elements.push(<h1 key={`h1-${index}`} className="text-2xl font-bold mt-6 mb-4 text-blue-400">{parseInline(trimmed.substring(2))}</h1>);
      } 
      // Empty lines (paragraph breaks)
      else if (trimmed === '') {
        elements.push(<div key={`br-${index}`} className="h-2" />);
      } 
      // Regular paragraphs
      else {
        elements.push(<p key={`p-${index}`} className="mb-2 leading-relaxed text-gray-200">{parseInline(line)}</p>);
      }
    }
  });

  // Flush remaining list if any
  if (currentList.length > 0) {
    elements.push(
      <ul key="list-end" className="list-disc pl-5 mb-3 space-y-1 text-gray-300">
        {currentList.map((item, i) => (
          <li key={i}>{parseInline(item)}</li>
        ))}
      </ul>
    );
  }

  return <div className="markdown-body text-sm md:text-base">{elements}</div>;
};

export default function RagBotUI() {
  const [screen, setScreen] = useState("dashboard");
  const [docs, setDocs] = useState([]);
  const [bots, setBots] = useState([]);
  const [chats, setChats] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [question, setQuestion] = useState("");
  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);
  
  // Responsive state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  
  const [error, setError] = useState("");
  const [backendStatus, setBackendStatus] = useState("checking");
  
  const [showBotForm, setShowBotForm] = useState(false);
  const [newBot, setNewBot] = useState({
    name: "",
    instructions: "",
    model: "llama3",
    temperature: 0.7
  });

  const [showChatConfig, setShowChatConfig] = useState(false);
  const [newChatConfig, setNewChatConfig] = useState({
    title: "",
    selected_documents: [],
    bot_id: null
  });

  const [settings, setSettings] = useState({
    model: "llama3",
    temperature: 0.7,
    maxTokens: 2000,
    topP: 0.9
  });

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChat?.messages]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        // On desktop, default to open if it was closed by mobile logic
        setIsSidebarOpen(true);
      } else {
        // On mobile, default to closed
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const checkBackendHealth = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (response.ok) {
        const data = await response.json();
        setBackendStatus("connected");
        if (!data.ollama_available) {
          setError("⚠️ Ollama is not running. Start it with: ollama serve");
        }
        return true;
      } else {
        setBackendStatus("disconnected");
        return false;
      }
    } catch (err) {
      setBackendStatus("disconnected");
      return false;
    }
  };

  useEffect(() => {
    const init = async () => {
      const healthy = await checkBackendHealth();
      if (healthy) {
        await fetchDocuments();
        await fetchBots();
        await fetchChats();
      }
    };
    init();
    const interval = setInterval(checkBackendHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/documents`);
      if (response.ok) {
        const data = await response.json();
        setDocs(data.documents || []);
        setError("");
      }
    } catch (err) {
      console.error("Failed to fetch documents:", err);
    }
  };

  const fetchBots = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/bots`);
      if (response.ok) {
        const data = await response.json();
        setBots(data.bots || []);
      }
    } catch (err) {
      console.error("Failed to fetch bots:", err);
    }
  };

  const fetchChats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/chats`);
      if (response.ok) {
        const data = await response.json();
        setChats(data.chats || []);
      }
    } catch (err) {
      console.error("Failed to fetch chats:", err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    setError("");
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }
      
      await fetchDocuments();
      e.target.value = "";
      
      const message = result.type === "image" 
        ? `✅ ${result.message}\n\n⚠️ ${result.note || ''}`
        : `✅ ${result.message}\n📊 Chunks processed: ${result.chunks}`;
      
      alert(message);
    } catch (err) {
      setError(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/documents/${docId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await fetchDocuments();
        alert("✅ Document deleted successfully");
      } else {
        throw new Error('Failed to delete document');
      }
    } catch (err) {
      alert(`Failed to delete document: ${err.message}`);
    }
  };

  const handleCreateChat = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/chats/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newChatConfig.title || "New Chat",
          selected_documents: newChatConfig.selected_documents,
          bot_id: newChatConfig.bot_id
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create chat');
      }
      
      await fetchChats();
      setCurrentChat(data.chat);
      setShowChatConfig(false);
      setNewChatConfig({ title: "", selected_documents: [], bot_id: null });
      setScreen("chat");
    } catch (err) {
      alert(`Failed to create chat: ${err.message}`);
    }
  };

  const handleDeleteChat = async (chatId) => {
    if (!window.confirm("Delete this chat?")) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/chats/${chatId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await fetchChats();
        if (currentChat?.id === chatId) {
          setCurrentChat(null);
        }
      }
    } catch (err) {
      alert(`Failed to delete chat: ${err.message}`);
    }
  };

  const handleSelectChat = async (chatId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/chats/${chatId}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentChat(data.chat);
        setScreen("chat");
      }
    } catch (err) {
      console.error("Failed to load chat:", err);
    }
  };

  const handleAskStreaming = async () => {
    if (!question.trim() || !currentChat) return;
    
    setAsking(true);
    setError("");
    
    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content: question,
      timestamp: new Date().toISOString()
    };
    
    const assistantMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      status: "Initializing...", 
      sources: [],
      timestamp: new Date().toISOString(),
      streaming: true
    };
    
    setCurrentChat(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage, assistantMessage]
    }));
    
    const currentQuestion = question;
    setQuestion("");
    
    try {
      const response = await fetch(`${API_BASE_URL}/chats/${currentChat.id}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: currentQuestion }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;
          
          try {
            const data = JSON.parse(line.slice(6));
            
            // Handle Status Updates
            if (data.status) {
              setCurrentChat(prev => {
                const messages = [...prev.messages];
                const lastMsgIndex = messages.length - 1;
                const lastMsg = { ...messages[lastMsgIndex] };
                
                if (lastMsg.role === 'assistant') {
                  lastMsg.status = data.status;
                  messages[lastMsgIndex] = lastMsg;
                }
                return { ...prev, messages };
              });
            }

            if (data.token) {
              setCurrentChat(prev => {
                const messages = [...prev.messages];
                const lastMsgIndex = messages.length - 1;
                const lastMsg = { ...messages[lastMsgIndex] };
                
                if (lastMsg.role === 'assistant') {
                  // Clear status once we start getting tokens
                  if (lastMsg.status) delete lastMsg.status;
                  lastMsg.content += data.token;
                  messages[lastMsgIndex] = lastMsg;
                }
                return { ...prev, messages };
              });
            }
            
            if (data.sources) {
              setCurrentChat(prev => {
                const messages = [...prev.messages];
                const lastMsgIndex = messages.length - 1;
                const lastMsg = { ...messages[lastMsgIndex] };
                
                if (lastMsg.role === 'assistant') {
                  lastMsg.sources = data.sources;
                  messages[lastMsgIndex] = lastMsg;
                }
                return { ...prev, messages };
              });
            }
            
            if (data.done) {
              setCurrentChat(prev => {
                const messages = [...prev.messages];
                const lastMsgIndex = messages.length - 1;
                const lastMsg = { ...messages[lastMsgIndex] };
                
                if (lastMsg.role === 'assistant') {
                  delete lastMsg.streaming;
                  delete lastMsg.status;
                  messages[lastMsgIndex] = lastMsg;
                }
                return { ...prev, messages };
              });
            }
            
            if (data.error) {
              throw new Error(data.error);
            }
          } catch (parseError) {
            // Ignore parse errors silently
          }
        }
      }
      
      await fetchChats();
      
    } catch (err) {
      setError(`Failed to get answer: ${err.message}`);
      setCurrentChat(prev => {
        const messages = prev.messages.slice(0, -1);
        return { ...prev, messages };
      });
    } finally {
      setAsking(false);
    }
  };

  const handleCreateBot = async () => {
    if (!newBot.name || !newBot.instructions) {
      alert("Please fill in all required fields");
      return;
    }
    
    try {
      // FIX: Changed URL from /bots/create to /bots
      const response = await fetch(`${API_BASE_URL}/bots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBot),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create bot');
      }
      
      await fetchBots();
      setShowBotForm(false);
      setNewBot({ name: "", instructions: "", model: "llama3", temperature: 0.7 });
      alert(`✅ Bot "${data.bot.name}" created successfully!`);
    } catch (err) {
      alert(`Failed to create bot: ${err.message}`);
    }
  };

  const handleDeleteBot = async (botId) => {
    if (!window.confirm("Are you sure you want to delete this bot?")) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/bots/${botId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await fetchBots();
        alert("✅ Bot deleted successfully");
      } else {
        throw new Error('Failed to delete bot');
      }
    } catch (err) {
      alert(`Failed to delete bot: ${err.message}`);
    }
  };

  const toggleDocumentSelection = (docId) => {
    setNewChatConfig(prev => {
      const selected = prev.selected_documents.includes(docId)
        ? prev.selected_documents.filter(id => id !== docId)
        : [...prev.selected_documents, docId];
      return { ...prev, selected_documents: selected };
    });
  };

  const handleCleanupDuplicates = async () => {
    if (!window.confirm("Remove duplicate chunks from vector database?")) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/documents/cleanup`, {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (response.ok) {
        alert(`✅ ${result.message}`);
        await fetchDocuments();
      } else {
        alert(`❌ Cleanup failed: ${result.error}`);
      }
    } catch (err) {
      alert(`Failed to cleanup: ${err.message}`);
    }
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "uploads", label: "Uploads", icon: UploadCloud },
    { id: "chat", label: "Chat", icon: MessageCircle },
    { id: "bots", label: "Bots", icon: FileText },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white flex relative overflow-hidden">
      {/* Mobile Menu Button */}
      {!isSidebarOpen && (
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="md:hidden fixed top-4 left-4 z-50 p-2 bg-gray-800 rounded-lg shadow-lg border border-gray-700 text-white"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Main Navigation Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          width: isMobile ? (isSidebarOpen ? 240 : 0) : (isSidebarOpen ? 240 : 70),
          x: isMobile ? (isSidebarOpen ? 0 : -240) : 0
        }}
        transition={{ duration: 0.3 }}
        className={`
          bg-gray-800 flex flex-col border-r border-gray-700 h-screen z-40
          ${isMobile ? 'fixed inset-y-0 left-0' : 'relative'}
          ${!isSidebarOpen && isMobile ? 'hidden' : 'flex'}
        `}
      >
        <div className="flex flex-col h-full overflow-hidden">
          <div className="p-4 flex justify-between items-center mb-2">
            {isSidebarOpen && <h2 className="text-xl font-bold truncate">HKU RAG</h2>}
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400">
              <X className="w-6 h-6" />
            </button>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hidden md:block text-white hover:text-blue-400 mx-auto">
              {isSidebarOpen ? <ChevronRight className="w-5 h-5 rotate-180" /> : <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
          
          {/* Backend Status Indicator */}
          <div className={`mx-2 mb-4 p-2 rounded text-xs flex items-center justify-center gap-2 ${
              backendStatus === "connected" ? "bg-green-900/30 text-green-400" :
              backendStatus === "disconnected" ? "bg-red-900/30 text-red-400" :
              "bg-yellow-900/30 text-yellow-400"
            }`}>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                backendStatus === "connected" ? "bg-green-400" :
                backendStatus === "disconnected" ? "bg-red-400" :
                "bg-yellow-400 animate-pulse"
              }`} />
              {isSidebarOpen && (
                <span>
                  {backendStatus === "connected" && "Connected"}
                  {backendStatus === "disconnected" && "Offline"}
                  {backendStatus === "checking" && "Connecting..."}
                </span>
              )}
          </div>
          
          <nav className="flex flex-col gap-2 flex-grow px-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setScreen(item.id);
                  if (isMobile) setIsSidebarOpen(false);
                }}
                className={`flex items-center gap-3 p-2 rounded-lg transition ${
                  screen === item.id ? "bg-gray-700 text-blue-400" : "hover:bg-gray-700 text-gray-300"
                } ${!isSidebarOpen ? 'justify-center' : ''}`}
                title={!isSidebarOpen ? item.label : ''}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {isSidebarOpen && <span className="truncate">{item.label}</span>}
              </button>
            ))}
          </nav>
          
          {/* Footer */}
           <div className="mt-auto p-2 border-t border-gray-700">
              <div className={`bg-gray-700 rounded-lg ${isSidebarOpen ? 'p-3' : 'p-2 flex justify-center'}`}>
                {isSidebarOpen ? (
                  <>
                    <p className="text-xs text-gray-400 mb-1">HKU Account</p>
                    <p className="text-sm truncate">Login (Soon)</p>
                  </>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-600" />
                )}
              </div>
            </div>
        </div>
      </motion.aside>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Chat List Sidebar (Secondary Menu) */}
      {screen === "chat" && (
        <motion.aside
          initial={{ width: 250 }}
          className={`
            bg-gray-800 border-r border-gray-700 flex flex-col
            ${currentChat ? 'hidden md:flex md:w-64' : 'w-full md:w-64'}
          `}
        >
          <div className="p-4 border-b border-gray-700">
            <button
              onClick={() => setShowChatConfig(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {chats.length === 0 ? (
                <div className="text-center text-gray-400 py-8 text-sm">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No chats yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {chats.map((chat) => (
                    <div
                      key={chat.id}
                      className={`group p-3 rounded-lg cursor-pointer hover:bg-gray-700 transition ${
                        currentChat?.id === chat.id ? "bg-gray-700" : ""
                      }`}
                      onClick={() => handleSelectChat(chat.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-gray-200">
                            {chat.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {chat.messages.length} messages
                          </p>
                          {chat.selected_documents.length > 0 && (
                            <p className="text-xs text-blue-400 mt-1">
                              📄 {chat.selected_documents.length} docs
                            </p>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteChat(chat.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </motion.aside>
      )}

      {/* Main Content Area */}
      <main className={`
        flex-1 p-4 md:p-6 overflow-auto bg-gray-900 w-full
        ${screen === 'chat' && !currentChat ? 'hidden md:block' : 'block'}
      `}>
        {/* Backend Status Alerts */}
        {backendStatus === "disconnected" && (
            <div className="mb-4 p-4 bg-red-900/50 border border-red-700 rounded-lg flex items-start gap-3 mt-12 md:mt-0">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-200 font-semibold">Backend Connection Failed</p>
                <p className="text-red-300 text-sm mt-1">
                  Start backend: cd backend/bot && source bin/activate && python app.py
                </p>
              </div>
              <button 
                onClick={checkBackendHealth}
                className="px-3 py-1 bg-red-700 hover:bg-red-600 text-white text-sm rounded transition flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            </div>
          )}
          
          {error && backendStatus === "connected" && (
            <div className="mb-4 p-4 bg-yellow-900/50 border border-yellow-700 rounded-lg flex justify-between items-center mt-12 md:mt-0">
              <p className="text-yellow-200">{error}</p>
              <button onClick={() => setError("")} className="text-yellow-200 hover:text-white">✕</button>
            </div>
          )}

        <AnimatePresence mode="wait">
          {screen === "dashboard" && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6 mt-12 md:mt-0"
              >
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <p className="text-gray-400">Document-based AI with local, open-source models</p>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gray-800 p-6 rounded-lg shadow border border-gray-700">
                    <h3 className="font-semibold text-gray-400 mb-2">Documents</h3>
                    <p className="text-3xl font-bold text-blue-400">{docs.length}</p>
                  </div>
                  <div className="bg-gray-800 p-6 rounded-lg shadow border border-gray-700">
                    <h3 className="font-semibold text-gray-400 mb-2">Custom Bots</h3>
                    <p className="text-3xl font-bold text-green-400">{bots.length}</p>
                  </div>
                  <div className="bg-gray-800 p-6 rounded-lg shadow border border-gray-700">
                    <h3 className="font-semibold text-gray-400 mb-2">Chat Sessions</h3>
                    <p className="text-3xl font-bold text-purple-400">{chats.length}</p>
                  </div>
                  <div className="bg-gray-800 p-6 rounded-lg shadow border border-gray-700">
                    <h3 className="font-semibold text-gray-400 mb-2">LLM Model</h3>
                    <p className="text-2xl font-bold text-orange-400">{settings.model}</p>
                  </div>
                </div>
                
                <div className="bg-blue-900/20 border border-blue-700 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">🚀 Features</h3>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>✅ Streaming responses with real-time token generation</li>
                    <li>✅ Multiple chat sessions with message history</li>
                    <li>✅ Document selection per chat (query specific files)</li>
                    <li>✅ Custom bots with personalized instructions</li>
                    <li>✅ All models run locally - 100% private!</li>
                  </ul>
                </div>
                
                <div className="bg-gray-800 border border-gray-700 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3">📋 Supported Formats</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-green-400">
                      <span>✓</span> PDF (.pdf)
                    </div>
                    <div className="flex items-center gap-2 text-green-400">
                      <span>✓</span> Word (.docx, .doc)
                    </div>
                    <div className="flex items-center gap-2 text-green-400">
                      <span>✓</span> Excel (.xlsx, .xls)
                    </div>
                    <div className="flex items-center gap-2 text-yellow-400">
                      <span>⏳</span> PowerPoint (.pptx, .ppt) (Pending)
                    </div>
                    <div className="flex items-center gap-2 text-green-400">
                      <span>✓</span> Text (.txt)
                    </div>
                    <div className="flex items-center gap-2 text-green-400">
                      <span>✓</span> Images (.jpg, .png, .gif)
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {screen === "uploads" && (
              <motion.div
                key="uploads"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6 mt-12 md:mt-0"
              >
                <div className="flex justify-between items-center">
                  <h1 className="text-3xl font-bold">Document Uploads</h1>
                  <div className="flex gap-2">
                    <button
                      onClick={fetchDocuments}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span className="hidden md:inline">Refresh</span>
                    </button>
                    <button
                      onClick={handleCleanupDuplicates}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden md:inline">Cleanup</span>
                    </button>
                  </div>
                </div>
                
                <div className="border-2 border-dashed border-gray-600 p-8 rounded-lg text-center bg-gray-800/50 hover:border-blue-500 transition">
                  <UploadCloud className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-300 mb-2">Upload documents to build your knowledge base</p>
                  <p className="text-sm text-gray-500 mb-4">Supports: PDF, Word, Excel, PowerPoint, Text, Images</p>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                    disabled={uploading}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif"
                  />
                  <label
                    htmlFor="file-upload"
                    className={`inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition ${
                      uploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    }`}
                  >
                    {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {uploading ? "Uploading..." : "Choose File"}
                  </label>
                </div>
                
                {docs.length === 0 ? (
                  <div className="text-center text-gray-400 py-12 bg-gray-800/30 rounded-lg">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No documents uploaded yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {docs.map((doc) => (
                      <div key={doc.id} className="bg-gray-800 border border-gray-700 p-4 rounded-lg hover:border-blue-500 transition group">
                        <div className="flex justify-between items-start mb-2">
                          <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <h3 className="font-semibold truncate mb-1 text-gray-200">{doc.name}</h3>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">{doc.size}</span>
                          {doc.type === "image" && (
                            <span className="bg-yellow-900/30 text-yellow-400 px-2 py-1 rounded">Image</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">{new Date(doc.uploaded_at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {screen === "bots" && (
              <motion.div
                key="bots"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6 mt-12 md:mt-0"
              >
                <div className="flex justify-between items-center">
                  <h1 className="text-3xl font-bold">Custom Bots</h1>
                  <button
                    onClick={() => setShowBotForm(!showBotForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden md:inline">Create New Bot</span>
                    <span className="md:hidden">New</span>
                  </button>
                </div>
                
                {showBotForm && (
                  <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg shadow space-y-4">
                    <h2 className="text-xl font-semibold">New Bot Configuration</h2>
                    <input
                      type="text"
                      placeholder="Bot Name (e.g., 'Code Assistant', 'Research Helper')"
                      value={newBot.name}
                      onChange={(e) => setNewBot({...newBot, name: e.target.value})}
                      className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500"
                    />
                    <textarea
                      placeholder="Bot Instructions (e.g., 'You are a helpful assistant that summarizes documents concisely...')"
                      value={newBot.instructions}
                      onChange={(e) => setNewBot({...newBot, instructions: e.target.value})}
                      className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg h-32 text-gray-200 placeholder-gray-500"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm mb-2 text-gray-400">Model</label>
                        <select
                          value={newBot.model}
                          onChange={(e) => setNewBot({...newBot, model: e.target.value})}
                          className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-200"
                        >
                          <option value="llama3">Llama 3</option>
                          <option value="mistral">Mistral</option>
                          <option value="phi">Phi</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm mb-2 text-gray-400">Temperature: {newBot.temperature}</label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={newBot.temperature}
                          onChange={(e) => setNewBot({...newBot, temperature: parseFloat(e.target.value)})}
                          className="w-full accent-blue-600"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreateBot}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                      >
                        Create Bot
                      </button>
                      <button
                        onClick={() => setShowBotForm(false)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                
                {bots.length === 0 ? (
                  <div className="text-center text-gray-400 py-12 bg-gray-800/30 rounded-lg">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No custom bots created yet</p>
                    <p className="text-sm mt-2">Create a bot with custom instructions above</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bots.map((bot) => (
                      <div key={bot.id} className="bg-gray-800 border border-gray-700 p-5 rounded-lg hover:border-blue-500 transition group">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-semibold text-lg text-gray-200">{bot.name}</h3>
                          <button
                            onClick={() => handleDeleteBot(bot.id)}
                            className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-sm text-gray-400 mb-3 line-clamp-2">{bot.instructions}</p>
                        <div className="flex gap-2 text-xs">
                          <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded">{bot.model}</span>
                          <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded">temp: {bot.temperature}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {screen === "settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6 max-w-2xl mt-12 md:mt-0"
              >
                <h1 className="text-3xl font-bold">Settings</h1>

                <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg shadow space-y-4">
                  <h2 className="text-xl font-semibold">Model Configuration</h2>
                  
                  <div>
                    <label className="block text-sm mb-2 text-gray-400">Default Model</label>
                    <select
                      value={settings.model}
                      onChange={(e) => setSettings({...settings, model: e.target.value})}
                      className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-200"
                    >
                      <option value="llama3">Llama 3 (Recommended)</option>
                      <option value="mistral">Mistral</option>
                      <option value="phi">Phi</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm mb-2 text-gray-400">
                      Temperature: {settings.temperature}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={settings.temperature}
                      onChange={(e) => setSettings({...settings, temperature: parseFloat(e.target.value)})}
                      className="w-full accent-blue-600"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Lower = more focused, Higher = more creative
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm mb-2 text-gray-400">
                      Max Tokens: {settings.maxTokens}
                    </label>
                    <input
                      type="range"
                      min="500"
                      max="4000"
                      step="100"
                      value={settings.maxTokens}
                      onChange={(e) => setSettings({...settings, maxTokens: parseInt(e.target.value)})}
                      className="w-full accent-blue-600"
                    />
                  </div>
                </div>
                
                <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg shadow space-y-3">
                  <h2 className="text-xl font-semibold mb-4">System Information</h2>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b border-gray-700">
                      <span className="text-gray-400">Backend Status:</span>
                      <span className={backendStatus === "connected" ? "text-green-400" : "text-red-400"}>
                        {backendStatus === "connected" ? "● Connected" : "● Disconnected"}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-700">
                      <span className="text-gray-400">Total Chats:</span>
                      <span className="text-gray-200">{chats.length}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-700">
                      <span className="text-gray-400">Vector Database:</span>
                      <span className="text-gray-200">ChromaDB</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-700">
                      <span className="text-gray-400">Embedding Model:</span>
                      <span className="text-gray-200">all-MiniLM-L6-v2</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-400">Framework:</span>
                      <span className="text-gray-200">LangChain + Ollama</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {screen === "chat" && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-[calc(100vh-2rem)] md:h-[calc(100vh-4rem)] flex flex-col mt-12 md:mt-0"
              >
                {!currentChat ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                    <MessageCircle className="w-20 h-20 mb-4 opacity-20" />
                    <p className="text-xl mb-2">No chat selected</p>
                    <p className="text-sm mb-6">Create a new chat or select an existing one</p>
                    <button
                      onClick={() => setShowChatConfig(true)}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      <Plus className="w-5 h-5" />
                      Create New Chat
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 p-3 md:p-4 bg-gray-800 border border-gray-700 rounded-lg flex items-center gap-3">
                      {/* Mobile Back Button */}
                      <button 
                        onClick={() => setCurrentChat(null)}
                        className="md:hidden p-1 hover:bg-gray-700 rounded-full"
                      >
                        <ArrowLeft className="w-5 h-5 text-gray-300" />
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg md:text-xl font-bold truncate">{currentChat.title}</h2>
                        <div className="flex items-center gap-4 text-xs md:text-sm text-gray-400 overflow-x-auto">
                          {currentChat.selected_documents.length > 0 ? (
                            <span className="flex items-center gap-1 whitespace-nowrap">
                              <FileText className="w-3 h-3 md:w-4 md:h-4" />
                              {currentChat.selected_documents.length} docs
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 whitespace-nowrap">
                              <FileText className="w-3 h-3 md:w-4 md:h-4" />
                              All docs
                            </span>
                          )}
                          {currentChat.bot_id && bots.find(b => b.id === currentChat.bot_id) && (
                            <span className="flex items-center gap-1 whitespace-nowrap">
                              <MessageCircle className="w-3 h-3 md:w-4 md:h-4" />
                              {bots.find(b => b.id === currentChat.bot_id).name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto bg-gray-800 border border-gray-700 rounded-lg p-3 md:p-4 mb-4">
                      {currentChat.messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                          <MessageCircle className="w-16 h-16 mb-4 opacity-20" />
                          <p className="text-lg">Start a conversation</p>
                          <p className="text-sm mt-2">Ask a question about your documents</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {currentChat.messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[90%] md:max-w-[80%] rounded-lg p-3 md:p-4 ${
                                  msg.role === 'user'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-700 text-gray-200'
                                }`}
                              >
                                {/* Show Status Indicator if content is empty but status exists */}
                                {msg.streaming && !msg.content && msg.status && (
                                  <div className="flex items-center gap-2 text-gray-400 italic mb-1 animate-pulse">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>{msg.status}</span>
                                  </div>
                                )}
                                
                                {/* ★★★ CHANGED: Use MarkdownRenderer instead of <p> ★★★ */}
                                <MarkdownRenderer content={msg.content} />
                                
                                {msg.streaming && msg.content && (
                                  <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1"></span>
                                )}
                                {msg.sources && msg.sources.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-gray-600">
                                    <p className="text-xs font-semibold mb-2">📚 Sources:</p>
                                    {msg.sources.map((source, idx) => (
                                      <div key={idx} className="text-xs p-2 bg-gray-800 rounded mt-1">
                                        <p className="font-mono text-gray-400 mb-1 truncate">
                                          {source.metadata.source}
                                        </p>
                                        <p className="text-gray-300 line-clamp-3">{source.content}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleAskStreaming()}
                        placeholder="Ask a question..."
                        className="flex-1 p-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-200 placeholder-gray-500 text-sm md:text-base"
                        disabled={asking}
                      />
                      <button
                        onClick={handleAskStreaming}
                        disabled={asking || !question.trim()}
                        className="px-4 md:px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
                      >
                        {asking ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                        <span className="hidden md:inline">Send</span>
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

      {/* New Chat Configuration Modal */}
      {showChatConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-lg shadow-2xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Create New Chat</h2>
              <button
                onClick={() => setShowChatConfig(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm mb-2 text-gray-400">Chat Title (Optional)</label>
                <input
                  type="text"
                  placeholder="Will be auto-generated from first message"
                  value={newChatConfig.title}
                  onChange={(e) => setNewChatConfig({...newChatConfig, title: e.target.value})}
                  className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500"
                />
              </div>
              
              <div>
                <label className="block text-sm mb-2 text-gray-400">Select Bot (Optional)</label>
                <select
                  value={newChatConfig.bot_id || ""}
                  onChange={(e) => setNewChatConfig({...newChatConfig, bot_id: e.target.value || null})}
                  className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-200"
                >
                  <option value="">Default RAG Agent</option>
                  {bots.map((bot) => (
                    <option key={bot.id} value={bot.id}>{bot.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm mb-3 text-gray-400">
                  Select Documents (Optional - leave empty for all documents)
                </label>
                {docs.length === 0 ? (
                  <p className="text-sm text-gray-500 p-4 bg-gray-900 rounded-lg">
                    No documents uploaded. Upload documents first or proceed without selection.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto bg-gray-900 rounded-lg p-4">
                    {docs.map((doc) => (
                      <label
                        key={doc.id}
                        className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 cursor-pointer transition"
                      >
                        <input
                          type="checkbox"
                          checked={newChatConfig.selected_documents.includes(doc.id)}
                          onChange={() => toggleDocumentSelection(doc.id)}
                          className="w-4 h-4 accent-blue-600"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-gray-200">{doc.name}</p>
                          <p className="text-xs text-gray-400">{doc.size}</p>
                        </div>
                        {newChatConfig.selected_documents.includes(doc.id) && (
                          <Check className="w-5 h-5 text-blue-400" />
                        )}
                      </label>
                    ))}
                  </div>
                )}
                {newChatConfig.selected_documents.length > 0 && (
                  <p className="text-sm text-blue-400 mt-2">
                    {newChatConfig.selected_documents.length} document(s) selected
                  </p>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-700 flex gap-3 justify-end">
              <button
                onClick={() => setShowChatConfig(false)}
                className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateChat}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Chat
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}