const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

async function verifyAuthToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('[Firebase Auth] Token verification failed:', error);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

app.post('/api/send-message', verifyAuthToken, async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const user = req.user;

  const response = {
    success: true,
    message: 'Thanks for your message!',
    receivedMessage: message,
    userId: user.uid,
    userEmail: user.email || null,
    timestamp: new Date().toISOString(),
    status: 'processed',
  };

  console.log('[Function] message received:', response);
  return res.status(200).json(response);
});

exports.appApi = functions.https.onRequest(app);
