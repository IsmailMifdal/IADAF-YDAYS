'use client';

import { useAuth } from '@/lib/auth/AuthProvider';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { userInfo } = useAuth();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">
        Bienvenue, {userInfo?.given_name || 'Utilisateur'} !
      </h1>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Démarches en cours</h3>
          <p className="text-3xl font-bold text-blue-600">3</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Documents</h3>
          <p className="text-3xl font-bold text-green-600">12</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Notifications</h3>
          <p className="text-3xl font-bold text-purple-600">5</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Actions rapides</h2>
        <div className="flex gap-4">
          <Button>Nouvelle démarche</Button>
          <Button variant="outline">Uploader un document</Button>
        </div>
      </div>
    </div>
  );
}
