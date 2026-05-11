const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

admin.initializeApp();

async function sendMessageHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const idToken = authHeader.split('Bearer ')[1];
    const decoded = await admin.auth().verifyIdToken(idToken);

    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    return res.status(200).json({
      success: true,
      message: 'Thanks for your message!',
      receivedMessage: message,
      userId: decoded.uid,
      userEmail: decoded.email || null,
      timestamp: new Date().toISOString(),
      status: 'processed',
    });
  } catch (error) {
    console.error('[Auth] Token verification failed:', error);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

exports.sendMessageHandler = sendMessageHandler;

exports.sendMessage = onRequest(
  { invoker: 'public', region: 'us-central1', cors: true },
  sendMessageHandler
);
