'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import DemarcheCard from '@/components/dashboard/DemarcheCard';
import { Demarche } from '@/types/demarche';

// Données mockées pour l'exemple
const mockDemarches: Demarche[] = [
  {
    id: 1,
    titre: 'Demande de carte d\'identité',
    description: 'Renouvellement de carte d\'identité nationale',
    statut: 'EN_COURS',
    dateCreation: '2024-01-15T10:00:00',
    dateModification: '2024-01-20T14:30:00',
  },
  {
    id: 2,
    titre: 'Demande de titre de séjour',
    description: 'Première demande de titre de séjour',
    statut: 'EN_ATTENTE',
    dateCreation: '2024-01-10T09:00:00',
    dateModification: '2024-01-10T09:00:00',
  },
  {
    id: 3,
    titre: 'Inscription université',
    description: 'Dossier d\'inscription pour l\'année universitaire',
    statut: 'TERMINEE',
    dateCreation: '2023-12-01T08:00:00',
    dateModification: '2023-12-15T16:00:00',
  },
];

export default function DemarchesPage() {
  const [demarches] = useState<Demarche[]>(mockDemarches);

  const handleView = (id: number) => {
    console.log('View demarche:', id);
  };

  const handleEdit = (id: number) => {
    console.log('Edit demarche:', id);
  };

  const handleDelete = (id: number) => {
    console.log('Delete demarche:', id);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Mes Démarches</h1>
        <Button>Nouvelle démarche</Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {demarches.map((demarche) => (
          <DemarcheCard
            key={demarche.id}
            demarche={demarche}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {demarches.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Aucune démarche pour le moment</p>
          <Button>Créer ma première démarche</Button>
        </div>
      )}
    </div>
  );
}
