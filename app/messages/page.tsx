'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { sendMessage, type MessageResponse } from '@/lib/api-client';
import Link from 'next/link';

export default function MessagesPage() {
  const { user, logout, loading } = useAuth();
  const [messageText, setMessageText] = useState('');
  const [responses, setResponses] = useState<MessageResponse[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!messageText.trim()) {
      setError('Please enter a message');
      return;
    }

    setIsSending(true);

    try {
      const response = await sendMessage(messageText);
      setResponses([response, ...responses]);
      setMessageText('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
              <p className="text-gray-600">Send messages to backend</p>
            </div>
            <div className="flex gap-4">
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 font-semibold">
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 font-semibold"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* User Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">User Info</h2>
          <div className="space-y-2">
            <p className="text-gray-700">
              <span className="font-semibold">Email:</span> {user.email}
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">User ID:</span> <span className="text-xs break-all">{user.uid}</span>
            </p>
          </div>
        </div>

        {/* Send Message Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Send Message</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSendMessage} className="space-y-4">
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                id="message"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Enter your message..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none"
                rows={4}
              />
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>

        {/* Responses */}
        {responses.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Backend Responses</h2>
            <div className="space-y-4">
              {responses.map((response, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-green-600">{response.message}</h3>
                    <span className="text-xs text-gray-500">
                      {new Date(response.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p>
                      <span className="font-medium">Your message:</span> {response.receivedMessage}
                    </p>
                    <p>
                      <span className="font-medium">Status:</span>{' '}
                      <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded">
                        {response.status}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {responses.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            Send a message to see backend responses here
          </div>
        )}
      </main>
    </div>
  );
}
