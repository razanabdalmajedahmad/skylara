import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface ChatChannel {
  id: number;
  name: string;
  type: 'DIRECT' | 'GROUP' | 'LOAD';
  avatarUrl: string | null;
  memberCount: number;
  unreadCount: number;
  lastMessage: string | null;
  lastMessageTime: string | null;
  lastMessageSender: string | null;
}

export interface ChatMessage {
  id: number;
  channelId: number;
  senderId: number;
  senderName: string;
  senderInitials: string;
  body: string;
  replyToId: number | null;
  createdAt: string;
}

export interface ChatUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export function useChannels() {
  return useQuery({
    queryKey: ['chat', 'channels'],
    queryFn: async () => {
      const response = await api.get('/chat/channels');
      return response.data as ChatChannel[];
    },
    staleTime: 15000,
    refetchInterval: 15000,
  });
}

export function useMessages(channelId: number | string | null | undefined) {
  const id = channelId ?? '';
  return useInfiniteQuery({
    queryKey: ['chat', 'messages', id],
    queryFn: async ({ pageParam }: { pageParam?: number }) => {
      const params: Record<string, any> = { limit: 50 };
      if (pageParam) params.before = pageParam;

      const response = await api.get(`/chat/channels/${channelId}/messages`, { params });
      return response.data as { messages: ChatMessage[]; hasMore: boolean };
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore || lastPage.messages.length === 0) return undefined;
      return lastPage.messages[lastPage.messages.length - 1].id;
    },
    enabled: channelId != null && channelId !== '',
    staleTime: 5000,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ channelId, body, replyToId }: { channelId: number; body: string; replyToId?: number }) => {
      const response = await api.post(`/chat/channels/${channelId}/messages`, { body, replyToId });
      return response.data as ChatMessage;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', variables.channelId] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'channels'] });
    },
  });
}

export function useCreateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, type, memberIds }: { name?: string; type: 'DIRECT' | 'GROUP'; memberIds: number[] }) => {
      const response = await api.post('/chat/channels', { name, type, memberIds });
      return response.data as ChatChannel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'channels'] });
    },
  });
}

export function useMarkChannelRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channelId: number) => {
      await api.post(`/chat/channels/${channelId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'channels'] });
    },
  });
}

export function useChatUsers() {
  return useQuery({
    queryKey: ['chat', 'users'],
    queryFn: async () => {
      const response = await api.get('/chat/users');
      return response.data as ChatUser[];
    },
    staleTime: 300000,
  });
}
