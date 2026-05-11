jest.mock('firebase-functions/v2/https', () => ({
  onRequest: (_opts, handler) => handler,
}));

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  auth: jest.fn(),
}));

const admin = require('firebase-admin');
const { sendMessageHandler } = require('../index');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('sendMessageHandler', () => {
  let mockVerifyIdToken;

  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyIdToken = jest.fn();
    admin.auth.mockReturnValue({ verifyIdToken: mockVerifyIdToken });
  });

  it('returns 405 for non-POST requests', async () => {
    const res = mockRes();
    await sendMessageHandler({ method: 'GET', headers: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' });
  });

  it('returns 401 with no auth header', async () => {
    const res = mockRes();
    await sendMessageHandler({ method: 'POST', headers: {} }, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  it('returns 401 on invalid token', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));
    const res = mockRes();
    await sendMessageHandler(
      { method: 'POST', headers: { authorization: 'Bearer bad-token' }, body: { message: 'hi' } },
      res
    );
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 400 when message body is missing', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'u1', email: 'a@b.com' });
    const res = mockRes();
    await sendMessageHandler(
      { method: 'POST', headers: { authorization: 'Bearer tok' }, body: {} },
      res
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Message is required' });
  });

  it('returns 200 with correct shape on valid request', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'u1', email: 'a@b.com' });
    const res = mockRes();
    await sendMessageHandler(
      { method: 'POST', headers: { authorization: 'Bearer tok' }, body: { message: 'hello' } },
      res
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        receivedMessage: 'hello',
        userId: 'u1',
        userEmail: 'a@b.com',
        status: 'processed',
      })
    );
  });
});
