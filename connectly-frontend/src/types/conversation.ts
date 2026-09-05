export interface Participant {
  _id: string;
  id?: string;
  username: string;
  email: string;
  avatarUrl?: string;
  isOnline?: boolean;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  content: string;
  clientMessageId?: string;
  status: 'sent' | 'delivered' | 'read';
  deliveredAt?: string;
  readAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Conversation {
  _id: string;
  id?: string;
  participants: Participant[];
  unreadCount: number;
  lastMessage?: {
    content: string;
    createdAt: string;
    senderId: string;
  };
  createdAt?: string;
  updatedAt: string;
}

export interface SearchResultPerson {
  id: string;
  name: string;
  handle: string;
  role: string;
  team: string;
  avatarUrl: string;
  status: 'online' | 'meeting' | 'offline';
  statusText?: string;
}

export interface SearchResultMessage {
  id: string;
  channelOrUser: string;
  isChannel: boolean;
  time: string;
  snippet: string;
  sender?: string;
}
