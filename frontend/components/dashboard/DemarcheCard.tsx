'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Demarche } from '@/types/demarche';
import { formatDate } from '@/lib/utils/format';

interface DemarcheCardProps {
  demarche: Demarche;
  onView?: (id: number) => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
}

const getStatutColor = (statut: string) => {
  switch (statut) {
    case 'EN_COURS':
      return 'bg-blue-100 text-blue-800';
    case 'TERMINEE':
      return 'bg-green-100 text-green-800';
    case 'EN_ATTENTE':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatutLabel = (statut: string) => {
  switch (statut) {
    case 'EN_COURS':
      return 'En cours';
    case 'TERMINEE':
      return 'Terminée';
    case 'EN_ATTENTE':
      return 'En attente';
    default:
      return statut;
  }
};

export default function DemarcheCard({ demarche, onView, onEdit, onDelete }: DemarcheCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{demarche.titre}</CardTitle>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatutColor(demarche.statut)}`}>
            {getStatutLabel(demarche.statut)}
          </span>
        </div>
        <CardDescription>{demarche.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-gray-500">
          <p>Créée le: {formatDate(demarche.dateCreation)}</p>
          <p>Modifiée le: {formatDate(demarche.dateModification)}</p>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        {onView && (
          <Button variant="outline" size="sm" onClick={() => onView(demarche.id)}>
            Voir
          </Button>
        )}
        {onEdit && (
          <Button variant="outline" size="sm" onClick={() => onEdit(demarche.id)}>
            Modifier
          </Button>
        )}
        {onDelete && (
          <Button variant="destructive" size="sm" onClick={() => onDelete(demarche.id)}>
            Supprimer
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
