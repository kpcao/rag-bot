import { auth } from './firebase';

// ★ 修复：智能判断 API 地址
// 如果是本地开发(localhost)，用 http://localhost:5000/api
// 如果是线上部署(rag.aied.hku.hk)，用相对路径 /api (通过 Nginx 转发)
const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

export const fetchBots = async () => {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(`${API_URL}/bots`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-User-ID': auth.currentUser?.uid || 'guest'
    }
  });
  if (!response.ok) throw new Error('Failed to fetch bots');
  return response.json();
};

// ★ Restored missing function
export const createBot = async (botData: any) => {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(`${API_URL}/bots`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-User-ID': auth.currentUser?.uid || 'guest'
    },
    body: JSON.stringify(botData),
  });
  if (!response.ok) throw new Error('Failed to create bot');
  return response.json();
};

export const fetchChats = async () => {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(`${API_URL}/chats`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-User-ID': auth.currentUser?.uid || 'guest'
    }
  });
  if (!response.ok) throw new Error('Failed to fetch chats');
  return response.json();
};

export const createChat = async (data: any) => {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(`${API_URL}/chats/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-User-ID': auth.currentUser?.uid || 'guest'
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create chat');
  return response.json();
};

export const updateChat = async (chatId: string, updates: any) => {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(`${API_URL}/chats/${chatId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-User-ID': auth.currentUser?.uid || 'guest'
    },
    body: JSON.stringify(updates),
  });
  if (!response.ok) throw new Error('Failed to update chat');
  return response.json();
};

export const deleteChat = async (chatId: string) => {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(`${API_URL}/chats/${chatId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-User-ID': auth.currentUser?.uid || 'guest'
    }
  });
  if (!response.ok) throw new Error('Failed to delete chat');
  return response.json();
};

export const fetchDocuments = async () => {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(`${API_URL}/documents`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-User-ID': auth.currentUser?.uid || 'guest'
    }
  });
  if (!response.ok) throw new Error('Failed to fetch documents');
  return response.json();
};

export const uploadFile = async (file: File) => {
  const token = await auth.currentUser?.getIdToken();
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-User-ID': auth.currentUser?.uid || 'guest'
    },
    body: formData,
  });
  if (!response.ok) throw new Error('Failed to upload file');
  return response.json();
};

// ★ 补回缺失的 deleteDocument 函数
export const deleteDocument = async (docId: string) => {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(`${API_URL}/documents/${docId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-User-ID': auth.currentUser?.uid || 'guest'
    }
  });
  if (!response.ok) throw new Error('Failed to delete document');
  return response.json();
};

export const streamChat = async (
  chatId: string, 
  question: string, 
  onData: (data: any) => void,
  onError: (err: any) => void,
  onComplete: () => void
) => {
  const token = await auth.currentUser?.getIdToken();
  
  try {
    const response = await fetch(`${API_URL}/chats/${chatId}/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-User-ID': auth.currentUser?.uid || 'guest'
      },
      body: JSON.stringify({ question }),
    });

    if (!response.ok) throw new Error('Network response was not ok');
    if (!response.body) throw new Error('No response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            onData(data);
          } catch (e) {
            console.error('Error parsing SSE data:', e);
          }
        }
      }
    }
    onComplete();
  } catch (error) {
    onError(error);
  }
};

// ★ 新增：调用生成 Profile 的函数
export const generateBotProfile = async (name: string) => {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(`${API_URL}/bots/generate-profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-User-ID': auth.currentUser?.uid || 'guest'
    },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error('Failed to generate profile');
  return response.json();
};