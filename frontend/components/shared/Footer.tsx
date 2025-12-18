'use client';

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t">
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-bold text-lg mb-4">IA-DAF</h3>
            <p className="text-gray-600">
              Plateforme d&apos;assistance pour les démarches administratives
            </p>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4">Liens rapides</h3>
            <ul className="space-y-2">
              <li><a href="/about" className="text-gray-600 hover:text-blue-600">À propos</a></li>
              <li><a href="/contact" className="text-gray-600 hover:text-blue-600">Contact</a></li>
              <li><a href="/help" className="text-gray-600 hover:text-blue-600">Aide</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4">Légal</h3>
            <ul className="space-y-2">
              <li><a href="/privacy" className="text-gray-600 hover:text-blue-600">Confidentialité</a></li>
              <li><a href="/terms" className="text-gray-600 hover:text-blue-600">CGU</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t mt-8 pt-8 text-center text-gray-600">
          <p>&copy; 2024 IA-DAF. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
}
