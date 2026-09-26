import axiosClient from '@/lib/axiosClient';
import type { ChatMessagePayload, ChatReply } from '@/types';

export const chatApi = {
  send: async (messages: ChatMessagePayload[]) => {
    const { data } = await axiosClient.post<ChatReply>('/chat/messages/', {
      messages,
    });
    return data;
  },
};
