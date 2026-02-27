'use client';

import { useAuth } from '@/lib/auth/AuthProvider';

export default function Header() {
  const { userInfo } = useAuth();

  return (
    <header className="bg-white shadow-sm">
      <div className="px-6 py-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {userInfo?.email}
          </span>
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
            {userInfo?.given_name?.[0] || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
