export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface Bot {
  id: string;
  name: string;
  description: string;
  instructions: string;
  model: string; // e.g., 'llama3', 'gemini-pro'
  temperature: number;
  creatorId?: string;
  avatar?: string;
}

export interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'txt' | 'image' | 'other';
  size: string;
  uploadedAt: string;
}

export interface MessageSource {
  metadata: {
    source: string;
    page?: number;
  };
  content: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  status?: string; // e.g., "Thinking...", "Searching..."
  sources?: MessageSource[];
  streaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  botId: string;
  messages: Message[];
  documentIds: string[];
  updatedAt: string;
}

export interface ApiStatus {
  status: 'connected' | 'disconnected' | 'checking';
  message?: string;
}