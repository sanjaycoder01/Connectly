import type { Conversation, Message } from '../types/conversation';
import type { User } from '../types/auth';

const API_BASE = '/api';

class ApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data.message || 'API request failed', response.status);
  }

  return data as T;
}

export const chatService = {
  getConversations: async (): Promise<{ conversations: Conversation[] }> => {
    return request<{ conversations: Conversation[] }>('/conversations');
  },

  createConversation: async (participantId: string): Promise<{ conversation: Conversation }> => {
    return request<{ conversation: Conversation }>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ participantId }),
    });
  },

  getMessages: async (
    conversationId: string,
    limit = 20,
    cursor?: string
  ): Promise<{ messages: Message[]; nextCursor: string | null; hasMore: boolean }> => {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (cursor) params.append('cursor', cursor);
    return request(`/messages/${conversationId}?${params.toString()}`);
  },

  searchUsers: async (query = ''): Promise<{ users: User[] }> => {
    const params = new URLSearchParams();
    if (query) params.append('search', query);
    return request(`/users?${params.toString()}`);
  },
};
