import { auth } from '@/lib/firebase';

export interface MessageResponse {
  success: boolean;
  message: string;
  receivedMessage: string;
  userId: string;
  userEmail: string | null;
  timestamp: string;
  status: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  message: string;
  created_at?: string;
}

const SEND_MESSAGE_URL =
  process.env.NEXT_PUBLIC_SEND_MESSAGE_URL ?? '/api/send-message';

const CHAT_URL =
  process.env.NEXT_PUBLIC_CHAT_URL ?? '';

async function getAuthHeader(): Promise<Record<string, string>> {
  const user = auth?.currentUser;
  if (!user) throw new Error('User not authenticated');
  const idToken = await user.getIdToken();
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` };
}

export async function sendMessage(message: string): Promise<MessageResponse> {
  const headers = await getAuthHeader();
  const response = await fetch(SEND_MESSAGE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error || `Request failed: ${response.statusText}`);
  }

  return response.json() as Promise<MessageResponse>;
}

export async function sendChatMessage(message: string): Promise<{ reply: string }> {
  const headers = await getAuthHeader();
  const response = await fetch(CHAT_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error || `Request failed: ${response.statusText}`);
  }

  return response.json() as Promise<{ reply: string }>;
}

export async function getChatHistory(): Promise<ChatMessage[]> {
  const headers = await getAuthHeader();
  const response = await fetch(CHAT_URL, { method: 'GET', headers });

  if (!response.ok) return [];

  return response.json() as Promise<ChatMessage[]>;
}
