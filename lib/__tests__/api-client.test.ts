import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/firebase', () => ({
  auth: { currentUser: null },
}));

import { sendMessage } from '@/lib/api-client';
import { auth } from '@/lib/firebase';

const mockAuth = auth as { currentUser: any };

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.currentUser = null;
});

describe('sendMessage', () => {
  it('throws if user is not authenticated', async () => {
    await expect(sendMessage('hello')).rejects.toThrow('User not authenticated');
  });

  it('sends POST with bearer token and returns response', async () => {
    mockAuth.currentUser = {
      uid: 'u1',
      email: 'a@b.com',
      getIdToken: vi.fn().mockResolvedValue('fake-token'),
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true, message: 'Thanks!' }),
    });

    const result = await sendMessage('hello');

    expect(result).toEqual({ success: true, message: 'Thanks!' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer fake-token' }),
        body: expect.stringContaining('hello'),
      })
    );
  });

  it('throws on non-ok response', async () => {
    mockAuth.currentUser = {
      uid: 'u1',
      email: 'a@b.com',
      getIdToken: vi.fn().mockResolvedValue('tok'),
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Unauthorized',
      json: vi.fn().mockResolvedValue({ error: 'Unauthorized' }),
    });

    await expect(sendMessage('hello')).rejects.toThrow('Unauthorized');
  });
});
