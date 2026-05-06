'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

interface Activity {
  id: number;
  title: string;
  description: string;
  date: string;
  type: string;
}

export default function DashboardPage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [activities] = useState<Activity[]>([
    { id: 1, title: 'Account Created', description: 'Welcome to our platform!', date: new Date().toLocaleDateString(), type: 'profile' },
    { id: 2, title: 'Email Verified', description: 'Your email has been verified', date: new Date().toLocaleDateString(), type: 'security' },
  ]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

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
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <div className="flex gap-4">
              <Link href="/admin" className="text-blue-600 hover:text-blue-700 font-semibold">
                Admin Dashboard
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

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-8 text-white mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome back, {user.displayName || user.email}!</h2>
          <p className="text-blue-100">Here's an overview of your account activity and status</p>
        </div>

        {/* User Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Account Status</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">Active</p>
            <p className="text-gray-600 text-sm mt-2">Verified</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Email Verified</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {user.emailVerified ? 'Yes' : 'No'}
            </p>
            <p className="text-gray-600 text-sm mt-2">Status</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Member Since</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {user.metadata.creationTime ? new Date(user.metadata.creationTime).getFullYear() : '2024'}
            </p>
            <p className="text-gray-600 text-sm mt-2">Joined</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Last Login</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">Today</p>
            <p className="text-gray-600 text-sm mt-2">Recent</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Profile */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Account Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500">Full Name</label>
                  <p className="text-gray-900 font-semibold">{user.displayName || 'Not set'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Email Address</label>
                  <p className="text-gray-900 font-semibold break-all">{user.email}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">User ID</label>
                  <p className="text-gray-900 font-semibold text-xs break-all">{user.uid}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Email Verified</label>
                  <p className={`font-semibold ${user.emailVerified ? 'text-green-600' : 'text-red-600'}`}>
                    {user.emailVerified ? 'Verified' : 'Not Verified'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                    <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-white mr-4 ${
                      activity.type === 'purchase' ? 'bg-blue-500' :
                      activity.type === 'payment' ? 'bg-green-500' :
                      activity.type === 'profile' ? 'bg-yellow-500' :
                      'bg-purple-500'
                    }`}>
                      {activity.type === 'purchase' && '🛒'}
                      {activity.type === 'payment' && '💳'}
                      {activity.type === 'profile' && '👤'}
                      {activity.type === 'security' && '🔒'}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{activity.title}</p>
                      <p className="text-sm text-gray-600">{activity.description}</p>
                      <p className="text-xs text-gray-500 mt-1">{activity.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
