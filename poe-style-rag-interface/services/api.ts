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

// ★ 新增：更新 Bot
export const updateBot = async (botId: string, botData: any) => {
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch(`${API_URL}/bots/${botId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-User-ID': auth.currentUser?.uid || 'guest'
    },
    body: JSON.stringify(botData),
  });
  if (!response.ok) throw new Error('Failed to update bot');
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

// ★ 修改：改用 XHR 以支持上传进度监听
export const uploadFile = async (file: File, onProgress?: (percent: number) => void) => {
  const token = await auth.currentUser?.getIdToken();
  const userId = auth.currentUser?.uid || 'guest';
  
  return new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.open('POST', `${API_URL}/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('X-User-ID', userId);

    // 监听上传进度
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (e) {
          reject(new Error('Invalid JSON response'));
        }
      } else {
        // ★ Fix: Parse backend error message
        try {
          const res = JSON.parse(xhr.responseText);
          reject(new Error(res.error || res.message || xhr.statusText));
        } catch (e) {
          reject(new Error(xhr.statusText || 'Upload failed'));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network error'));
    
    xhr.send(formData);
  });
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