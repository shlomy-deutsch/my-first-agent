'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { auth } from '@/lib/firebase';

const ADMIN_API = process.env.NEXT_PUBLIC_ADMIN_API_URL ?? '';

interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  creationTime: string;
  lastSignInTime: string;
  isAdmin: boolean;
}

interface Message {
  id: number;
  user_id: string;
  user_email: string | null;
  message: string;
  created_at: string;
}

async function adminFetch(path: string, options: RequestInit = {}) {
  const idToken = await auth!.currentUser!.getIdToken();
  return fetch(`${ADMIN_API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
      ...(options.headers as Record<string, string>),
    },
  });
}

export default function AdminPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<FirebaseUser[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    user.getIdTokenResult().then(result => {
      if (!result.claims.admin) { router.push('/dashboard'); return; }
      setIsAdmin(true);
      Promise.all([
        adminFetch('/users').then(r => r.json()).then(setUsers),
        adminFetch('/messages').then(r => r.json()).then(setMessages),
      ]).catch(e => setError(String(e)));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  async function toggleAdmin(uid: string, grant: boolean) {
    await adminFetch(`/users/${uid}/admin`, {
      method: 'POST',
      body: JSON.stringify({ grant }),
    });
    setUsers(prev => prev.map(u => u.uid === uid ? { ...u, isAdmin: grant } : u));
  }

  async function deleteMessage(id: number) {
    await adminFetch(`/messages/${id}`, { method: 'DELETE' });
    setMessages(prev => prev.filter(m => m.id !== id));
  }

  async function saveEdit(id: number) {
    const r = await adminFetch(`/messages/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ message: editText }),
    });
    const updated: Message = await r.json();
    setMessages(prev => prev.map(m => (m.id === id ? updated : m)));
    setEditId(null);
  }

  if (loading || isAdmin === null) return <div className="p-8">Loading...</div>;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-5 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <button
            onClick={() => logout().then(() => router.push('/login'))}
            className="text-red-600 hover:text-red-800 font-semibold"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {error && <div className="bg-red-100 text-red-700 p-4 rounded">{error}</div>}

        {/* Users */}
        <section className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-bold">Registered Users ({users.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['UID', 'Email', 'Name', 'Created', 'Admin'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map(u => (
                  <tr key={u.uid} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{u.uid}</td>
                    <td className="px-4 py-3">{u.email ?? '—'}</td>
                    <td className="px-4 py-3">{u.displayName ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {u.creationTime ? new Date(u.creationTime).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleAdmin(u.uid, !u.isAdmin)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          u.isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {u.isAdmin ? 'Admin' : 'User'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Messages */}
        <section className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-bold">Message History ({messages.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['ID', 'User', 'Message', 'Date', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {messages.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{m.id}</td>
                    <td className="px-4 py-3 text-xs">{m.user_email ?? m.user_id}</td>
                    <td className="px-4 py-3">
                      {editId === m.id ? (
                        <input
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          className="border rounded px-2 py-1 w-full"
                        />
                      ) : (
                        m.message
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(m.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 space-x-3">
                      {editId === m.id ? (
                        <>
                          <button onClick={() => saveEdit(m.id)} className="text-green-600 font-semibold">Save</button>
                          <button onClick={() => setEditId(null)} className="text-gray-500">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => { setEditId(m.id); setEditText(m.message); }}
                            className="text-blue-600 font-semibold"
                          >
                            Edit
                          </button>
                          <button onClick={() => deleteMessage(m.id)} className="text-red-600 font-semibold">
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
