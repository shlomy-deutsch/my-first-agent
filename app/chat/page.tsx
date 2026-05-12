'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { sendChatMessage, getChatHistory, type ChatMessage } from '@/lib/api-client';
import Link from 'next/link';

export default function ChatPage() {
  const { user, logout, loading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      getChatHistory().then(setMessages).catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    const userMessage = input.trim();
    setInput('');
    setError('');
    setMessages(prev => [...prev, { role: 'user', message: userMessage }]);
    setIsSending(true);

    try {
      const { reply } = await sendChatMessage(userMessage);
      setMessages(prev => [...prev, { role: 'assistant', message: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as unknown as React.FormEvent);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-white shadow shrink-0">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">AI Chat</h1>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          <div className="flex gap-4">
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              Dashboard
            </Link>
            <button
              onClick={logout}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto py-6 px-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 && !isSending && (
            <p className="text-center text-gray-400 mt-16">
              Start a conversation — ask me anything.
            </p>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-sm lg:max-w-lg px-4 py-3 rounded-2xl whitespace-pre-wrap text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-white text-gray-800 shadow rounded-bl-sm'
                }`}
              >
                {msg.message}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-400 px-4 py-3 rounded-2xl rounded-bl-sm shadow text-sm">
                <span className="animate-pulse">Thinking...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      <footer className="bg-white border-t shrink-0">
        <div className="max-w-2xl mx-auto px-4 py-3">
          {error && (
            <p className="text-red-500 text-xs mb-2">{error}</p>
          )}
          <form onSubmit={handleSend} className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
              rows={1}
              className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Send
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}
