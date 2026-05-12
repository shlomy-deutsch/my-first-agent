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
        id              SERIAL PRIMARY KEY,
        user_id         VARCHAR(128) NOT NULL,
        user_email      VARCHAR(256),
        message         TEXT NOT NULL,
        role            VARCHAR(16) DEFAULT 'user',
        conversation_id VARCHAR(128),
        created_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS role VARCHAR(16) DEFAULT 'user'`);
    await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id VARCHAR(128)`);
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

async function verifyAdmin(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) throw Object.assign(new Error('Unauthorized'), { status: 401 });
  const decoded = await admin.auth().verifyIdToken(authHeader.split('Bearer ')[1]);
  if (!decoded.admin) throw Object.assign(new Error('Forbidden'), { status: 403 });
}

exports.adminApi = onRequest(
  {
    region: 'us-central1',
    invoker: 'public',
    cors: true,
    ingressSettings: 'ALLOW_ALL',
    vpcConnector: 'myagent-connector',
    vpcConnectorEgressSettings: 'PRIVATE_RANGES_ONLY',
    secrets: ['DB_HOST', 'DB_PASS'],
  },
  async (req, res) => {
    try {
      await verifyAdmin(req);
    } catch (e) {
      return res.status(e.status || 401).json({ error: e.message });
    }

    const path = req.path;
    try {
      if (path === '/users' && req.method === 'GET') {
        const result = await admin.auth().listUsers(1000);
        return res.json(result.users.map(u => ({
          uid: u.uid,
          email: u.email || null,
          displayName: u.displayName || null,
          creationTime: u.metadata.creationTime,
          lastSignInTime: u.metadata.lastSignInTime,
          isAdmin: u.customClaims?.admin === true,
        })));
      }

      const userClaimMatch = path.match(/^\/users\/([^/]+)\/admin$/);
      if (userClaimMatch && req.method === 'POST') {
        const uid = userClaimMatch[1];
        const { grant } = req.body;
        const user = await admin.auth().getUser(uid);
        const current = user.customClaims || {};
        await admin.auth().setCustomUserClaims(uid, { ...current, admin: !!grant });
        return res.json({ success: true, uid, admin: !!grant });
      }

      if (path === '/messages' && req.method === 'GET') {
        const db = await getPool();
        const { rows } = await db.query('SELECT * FROM messages ORDER BY created_at DESC');
        return res.json(rows);
      }

      const msgMatch = path.match(/^\/messages\/(\d+)$/);
      if (msgMatch) {
        const id = parseInt(msgMatch[1]);
        const db = await getPool();
        if (req.method === 'DELETE') {
          await db.query('DELETE FROM messages WHERE id = $1', [id]);
          return res.json({ success: true });
        }
        if (req.method === 'PUT') {
          const { message } = req.body;
          const { rows } = await db.query(
            'UPDATE messages SET message = $1 WHERE id = $2 RETURNING *',
            [message, id]
          );
          return res.json(rows[0]);
        }
      }

      return res.status(404).json({ error: 'Not found' });
    } catch (e) {
      console.error('[adminApi]', e);
      return res.status(500).json({ error: 'Internal server error' });
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

exports.chat = onRequest(
  {
    region: 'us-central1',
    invoker: 'public',
    cors: true,
    ingressSettings: 'ALLOW_ALL',
    vpcConnector: 'myagent-connector',
    vpcConnectorEgressSettings: 'PRIVATE_RANGES_ONLY',
    secrets: ['DB_HOST', 'DB_PASS', 'GROQ_API_KEY'],
  },
  async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(authHeader.split('Bearer ')[1]);
    } catch {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conversationId = decoded.uid;

    if (req.method === 'GET') {
      const db = await getPool();
      const { rows } = await db.query(
        `SELECT role, message, created_at FROM messages
         WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 50`,
        [conversationId]
      );
      return res.json(rows);
    }

    if (req.method === 'POST') {
      const { message } = req.body;
      if (!message) return res.status(400).json({ error: 'Message is required' });

      const db = await getPool();

      await db.query(
        'INSERT INTO messages (user_id, user_email, message, role, conversation_id) VALUES ($1, $2, $3, $4, $5)',
        [decoded.uid, decoded.email || null, message, 'user', conversationId]
      );

      const { rows: history } = await db.query(
        `SELECT role, message FROM messages
         WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 20`,
        [conversationId]
      );

      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: history.map(row => ({
            role: row.role === 'assistant' ? 'assistant' : 'user',
            content: row.message,
          })),
        }),
      });
      const groqData = await groqRes.json();
      const aiReply = groqData.choices[0].message.content;

      await db.query(
        'INSERT INTO messages (user_id, user_email, message, role, conversation_id) VALUES ($1, $2, $3, $4, $5)',
        [decoded.uid, decoded.email || null, aiReply, 'assistant', conversationId]
      );

      return res.json({ reply: aiReply });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  }
);
