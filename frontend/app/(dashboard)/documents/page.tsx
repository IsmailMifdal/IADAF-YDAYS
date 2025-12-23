'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';

interface Document {
  id: number;
  nom: string;
  type: string;
  taille: string;
  dateUpload: string;
}

const mockDocuments: Document[] = [
  {
    id: 1,
    nom: 'passeport.pdf',
    type: 'PDF',
    taille: '2.4 MB',
    dateUpload: '2024-01-15',
  },
  {
    id: 2,
    nom: 'justificatif_domicile.pdf',
    type: 'PDF',
    taille: '1.2 MB',
    dateUpload: '2024-01-14',
  },
  {
    id: 3,
    nom: 'photo_identite.jpg',
    type: 'Image',
    taille: '500 KB',
    dateUpload: '2024-01-13',
  },
];

export default function DocumentsPage() {
  const [documents] = useState<Document[]>(mockDocuments);

  const handleUpload = () => {
    console.log('Upload document');
  };

  const handleDownload = (id: number) => {
    console.log('Download document:', id);
  };

  const handleDelete = (id: number) => {
    console.log('Delete document:', id);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Mes Documents</h1>
        <Button onClick={handleUpload}>Uploader un document</Button>
      </div>

      <div className="grid gap-4">
        {documents.map((doc) => (
          <Card key={doc.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{doc.nom}</CardTitle>
                  <div className="text-sm text-gray-500 mt-2">
                    <span className="mr-4">Type: {doc.type}</span>
                    <span className="mr-4">Taille: {doc.taille}</span>
                    <span>Uploadé le: {doc.dateUpload}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(doc.id)}
                  >
                    Télécharger
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(doc.id)}
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {documents.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Aucun document pour le moment</p>
          <Button onClick={handleUpload}>Uploader mon premier document</Button>
        </div>
      )}
    </div>
  );
}
