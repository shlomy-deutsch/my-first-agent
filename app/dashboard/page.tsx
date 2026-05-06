'use client';

import { useState } from 'react';
import Link from 'next/link';

interface DashboardData {
  userName: string;
  userEmail: string;
  accountCreated: string;
  totalPurchases: number;
  totalSpent: string;
  memberSince: string;
}

interface Activity {
  id: number;
  title: string;
  description: string;
  date: string;
  type: string;
}

export default function DashboardPage() {
  const [userData] = useState<DashboardData>({
    userName: 'John Doe',
    userEmail: 'john@example.com',
    accountCreated: 'Jan 15, 2024',
    totalPurchases: 23,
    totalSpent: '$1,245.00',
    memberSince: '1 year, 4 months',
  });

  const [activities] = useState<Activity[]>([
    { id: 1, title: 'Purchase Complete', description: 'You purchased Premium Plan', date: 'May 3, 2026', type: 'purchase' },
    { id: 2, title: 'Payment Processed', description: 'Payment of $99.00 processed successfully', date: 'May 1, 2026', type: 'payment' },
    { id: 3, title: 'Profile Updated', description: 'Your profile information was updated', date: 'Apr 28, 2026', type: 'profile' },
    { id: 4, title: 'Email Verified', description: 'Your email was verified', date: 'Apr 25, 2026', type: 'security' },
  ]);

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
              <Link href="/login" className="text-red-600 hover:text-red-700 font-semibold">
                Logout
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-8 text-white mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome back, {userData.userName}!</h2>
          <p className="text-blue-100">Here's an overview of your account activity and status</p>
        </div>

        {/* User Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Total Purchases</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{userData.totalPurchases}</p>
            <p className="text-gray-600 text-sm mt-2">Orders placed</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Total Spent</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{userData.totalSpent}</p>
            <p className="text-gray-600 text-sm mt-2">All time</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Member Since</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">1+</p>
            <p className="text-gray-600 text-sm mt-2">Year</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-gray-500 text-sm font-medium">Account Status</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">Active</p>
            <p className="text-gray-600 text-sm mt-2">All good</p>
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
                  <p className="text-gray-900 font-semibold">{userData.userName}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Email Address</label>
                  <p className="text-gray-900 font-semibold break-all">{userData.userEmail}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Member Since</label>
                  <p className="text-gray-900 font-semibold">{userData.accountCreated}</p>
                </div>
                <button className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition">
                  Edit Profile
                </button>
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
