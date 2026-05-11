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

const SEND_MESSAGE_URL =
  process.env.NEXT_PUBLIC_SEND_MESSAGE_URL ?? '/api/send-message';

export async function sendMessage(message: string): Promise<MessageResponse> {
  const user = auth?.currentUser;
  if (!user) throw new Error('User not authenticated');

  const idToken = await user.getIdToken();

  const response = await fetch(SEND_MESSAGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ message, userId: user.uid, userEmail: user.email }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error || `Request failed: ${response.statusText}`);
  }

  return response.json() as Promise<MessageResponse>;
}
