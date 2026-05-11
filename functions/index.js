const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { Pool } = require('pg');

admin.initializeApp();

let pool;
async function getPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST,
      database: process.env.DB_NAME || 'myagent',
      user: process.env.DB_USER || 'myagent-user',
      password: process.env.DB_PASS,
      port: 5432,
    });
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id         SERIAL PRIMARY KEY,
        user_id    VARCHAR(128) NOT NULL,
        user_email VARCHAR(256),
        message    TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  }
  return pool;
}

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

    let savedId = null;
    if (process.env.DB_HOST) {
      const db = await getPool();
      const { rows } = await db.query(
        'INSERT INTO messages (user_id, user_email, message) VALUES ($1, $2, $3) RETURNING id',
        [decoded.uid, decoded.email || null, message]
      );
      savedId = rows[0].id;
    }

    return res.status(200).json({
      success: true,
      message: 'Thanks for your message!',
      receivedMessage: message,
      userId: decoded.uid,
      userEmail: decoded.email || null,
      timestamp: new Date().toISOString(),
      status: 'processed',
      ...(savedId !== null && { id: savedId }),
    });
  } catch (error) {
    console.error('[saveMessage]', error);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

exports.sendMessageHandler = sendMessageHandler;

// Private: INTERNAL_ONLY, requires invoker auth — called via ESPv2
exports.saveMessage = onRequest(
  {
    region: 'us-central1',
    invoker: 'public',
    ingressSettings: 'ALLOW_ALL',
    vpcConnector: 'myagent-connector',
    vpcConnectorEgressSettings: 'PRIVATE_RANGES_ONLY',
    secrets: ['DB_HOST', 'DB_PASS'],
  },
  sendMessageHandler
);

// Public: Firebase Auth sign-in / sign-up wrappers
exports.signinUser = onRequest(
  { region: 'us-central1', invoker: 'public', cors: true },
  async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'idToken is required' });
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      return res.status(200).json({ success: true, uid: decoded.uid, email: decoded.email });
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }
);

exports.signupUser = onRequest(
  { region: 'us-central1', invoker: 'public', cors: true },
  async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'idToken is required' });
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      return res.status(200).json({ success: true, uid: decoded.uid, email: decoded.email });
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }
);
