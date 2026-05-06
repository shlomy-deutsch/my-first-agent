import { auth } from '@/lib/firebase';

export async function sendMessage(message: string): Promise<any> {
  try {
    const user = auth?.currentUser;

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get the ID token from Firebase
    const idToken = await user.getIdToken();

    const response = await fetch('/api/send-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        message,
        userId: user.uid,
        userEmail: user.email,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error sending message:', error);
    throw new Error(error.message || 'Failed to send message');
  }
}
