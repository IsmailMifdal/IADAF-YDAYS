'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { useAuth } from '@/lib/auth/AuthProvider';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
  { name: 'Démarches', href: '/dashboard/demarches', icon: '📋' },
  { name: 'Documents', href: '/dashboard/documents', icon: '📎' },
  { name: 'Profil', href: '/dashboard/profile', icon: '👤' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout, hasRole } = useAuth();

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      <div className="flex flex-col flex-grow bg-blue-700 pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <h1 className="text-2xl font-bold text-white">IA-DAF</h1>
        </div>
        <nav className="mt-8 flex-1 px-2 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  isActive
                    ? 'bg-blue-800 text-white'
                    : 'text-blue-100 hover:bg-blue-600',
                  'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                )}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.name}
              </Link>
            );
          })}

          {hasRole('ADMIN') && (
            <Link
              href="/dashboard/admin"
              className="text-blue-100 hover:bg-blue-600 group flex items-center px-2 py-2 text-sm font-medium rounded-md"
            >
              <span className="mr-3 text-lg">⚙️</span>
              Administration
            </Link>
          )}
        </nav>
        <div className="px-2">
          <button
            onClick={logout}
            className="w-full text-blue-100 hover:bg-blue-600 group flex items-center px-2 py-2 text-sm font-medium rounded-md"
          >
            <span className="mr-3 text-lg">🚪</span>
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
}
