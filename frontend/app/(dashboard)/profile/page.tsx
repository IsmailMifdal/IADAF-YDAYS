'use client';

import { useAuth } from '@/lib/auth/AuthProvider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ProfilePage() {
  const { userInfo } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Update profile');
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Mon Profil</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informations personnelles</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="prenom">Prénom</Label>
                  <Input
                    id="prenom"
                    defaultValue={userInfo?.given_name || ''}
                    placeholder="Votre prénom"
                  />
                </div>
                <div>
                  <Label htmlFor="nom">Nom</Label>
                  <Input
                    id="nom"
                    defaultValue={userInfo?.family_name || ''}
                    placeholder="Votre nom"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue={userInfo?.email || ''}
                  placeholder="votre@email.com"
                />
              </div>

              <div>
                <Label htmlFor="telephone">Téléphone</Label>
                <Input
                  id="telephone"
                  type="tel"
                  placeholder="+33 6 12 34 56 78"
                />
              </div>

              <div>
                <Label htmlFor="langue">Langue préférée</Label>
                <Input
                  id="langue"
                  defaultValue="Français"
                  placeholder="Français"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pays">Pays d&apos;origine</Label>
                  <Input id="pays" placeholder="France" />
                </div>
                <div>
                  <Label htmlFor="ville">Ville de résidence</Label>
                  <Input id="ville" placeholder="Paris" />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit">Enregistrer les modifications</Button>
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sécurité</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              La gestion des mots de passe et de l&apos;authentification est gérée par Keycloak.
            </p>
            <Button variant="outline">Modifier mon mot de passe</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
