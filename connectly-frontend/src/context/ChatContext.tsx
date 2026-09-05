import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Conversation, Message } from '../types/conversation';
import { chatService } from '../services/chat.service';
import { useAuth } from './AuthContext';

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  onlineUserIds: Set<string>;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  setActiveConversation: (conversation: Conversation | null) => void;
  startConversationWithUser: (userId: string) => Promise<Conversation>;
  sendMessage: (content: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
  isUserOnline: (userId: string) => boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversationState] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [isLoadingConversations, setIsLoadingConversations] = useState<boolean>(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);

  const socketRef = useRef<Socket | null>(null);
  const activeConversationRef = useRef<Conversation | null>(null);

  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  // Load user conversations from backend
  const refreshConversations = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setIsLoadingConversations(true);
      const data = await chatService.getConversations();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshConversations();
    } else {
      setConversations([]);
      setActiveConversationState(null);
      setMessages([]);
      setOnlineUserIds(new Set());
    }
  }, [isAuthenticated, refreshConversations]);

  // Socket.IO lifecycle
  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socket = io({
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('presence_snapshot', ({ onlineUserIds: userIds }: { onlineUserIds: string[] }) => {
      setOnlineUserIds(new Set(userIds.map((id) => id.toString())));
    });

    socket.on('user_online', ({ userId }: { userId: string }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        next.add(userId.toString());
        return next;
      });
    });

    socket.on('user_offline', ({ userId }: { userId: string }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        next.delete(userId.toString());
        return next;
      });
    });

    socket.on('new_message', (msg: Message) => {
      const active = activeConversationRef.current;
      const conversationId = msg.conversationId.toString();

      // If active conversation, append message and mark as read/delivered
      if (active && (active._id === conversationId || active.id === conversationId)) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });

        if (msg.senderId !== user.id) {
          socket.emit('message_read', { conversationId });
          socket.emit('message_delivered', { messageId: msg._id });
        }
      }

      // Update conversations list with latest message and unread count
      setConversations((prev) => {
        return prev.map((c) => {
          const cId = c._id || c.id;
          if (cId === conversationId) {
            const isCurrentChat = active && (active._id === conversationId || active.id === conversationId);
            return {
              ...c,
              lastMessage: {
                content: msg.content,
                createdAt: 'Just now',
                senderId: msg.senderId,
              },
              unreadCount: isCurrentChat || msg.senderId === user.id ? 0 : (c.unreadCount || 0) + 1,
              updatedAt: new Date().toISOString(),
            };
          }
          return c;
        });
      });
    });

    socket.on('message_read', ({ messageIds }: { messageIds: string[] }) => {
      if (!messageIds || messageIds.length === 0) return;
      setMessages((prev) =>
        prev.map((msg) =>
          messageIds.includes(msg._id) ? { ...msg, status: 'read' } : msg
        )
      );
    });

    socket.on('message_delivered', ({ messageId }: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId && msg.status === 'sent'
            ? { ...msg, status: 'delivered' }
            : msg
        )
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, user]);

  // Handle switching active conversation
  const setActiveConversation = useCallback(
    async (conversation: Conversation | null) => {
      const socket = socketRef.current;
      const prev = activeConversationRef.current;

      if (prev && socket) {
        socket.emit('leave_conversation', prev._id || prev.id);
      }

      setActiveConversationState(conversation);

      if (!conversation) {
        setMessages([]);
        return;
      }

      const conversationId = conversation._id || conversation.id || '';
      if (!conversationId) return;

      if (socket) {
        socket.emit('join_conversation', conversationId);
      }

      // Clear unread count locally
      setConversations((prev) =>
        prev.map((c) =>
          (c._id || c.id) === conversationId ? { ...c, unreadCount: 0 } : c
        )
      );

      // Fetch message history
      try {
        setIsLoadingMessages(true);
        const data = await chatService.getMessages(conversationId);
        // Messages come sorted { createdAt: -1 } from backend, reverse for chronological UI
        setMessages([...(data.messages || [])].reverse());
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      } finally {
        setIsLoadingMessages(false);
      }
    },
    []
  );

  // Send message via Socket.IO with ack
  const sendMessage = useCallback(
    async (content: string) => {
      const active = activeConversationRef.current;
      const socket = socketRef.current;
      if (!active || !socket || !content.trim()) return;

      const conversationId = active._id || active.id;
      const clientMessageId = crypto.randomUUID();

      return new Promise<void>((resolve, reject) => {
        socket.emit(
          'send_message',
          {
            conversationId,
            content: content.trim(),
            clientMessageId,
          },
          (res: { ok: boolean; message?: Message; messageId?: string; error?: string }) => {
            if (res && res.ok) {
              resolve();
            } else {
              reject(new Error(res?.error || 'Failed to send message'));
            }
          }
        );
      });
    },
    []
  );

  // Start new conversation with a participant
  const startConversationWithUser = useCallback(
    async (participantId: string): Promise<Conversation> => {
      const res = await chatService.createConversation(participantId);
      const newConv = res.conversation;

      setConversations((prev) => {
        const id = newConv._id || newConv.id;
        const exists = prev.some((c) => (c._id || c.id) === id);
        if (exists) return prev;
        return [newConv, ...prev];
      });

      await setActiveConversation(newConv);
      return newConv;
    },
    [setActiveConversation]
  );

  const isUserOnline = useCallback(
    (userId: string) => {
      return onlineUserIds.has(userId.toString());
    },
    [onlineUserIds]
  );

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        messages,
        onlineUserIds,
        isLoadingConversations,
        isLoadingMessages,
        setActiveConversation,
        startConversationWithUser,
        sendMessage,
        refreshConversations,
        isUserOnline,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
