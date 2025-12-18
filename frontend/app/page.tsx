import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Navbar */}
      <nav className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">IA-DAF</h1>
          <Link href="/login">
            <Button>Se connecter</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Simplifiez vos démarches administratives
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Une plateforme intelligente pour vous accompagner dans toutes vos démarches
            administratives avec l'aide de l'IA.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/login">
              <Button size="lg">Commencer</Button>
            </Link>
            <Button variant="outline" size="lg">
              En savoir plus
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="text-center p-6">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              📄
            </div>
            <h3 className="text-xl font-semibold mb-2">Gestion des démarches</h3>
            <p className="text-gray-600">
              Suivez toutes vos démarches en un seul endroit
            </p>
          </div>
          <div className="text-center p-6">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              📎
            </div>
            <h3 className="text-xl font-semibold mb-2">Documents sécurisés</h3>
            <p className="text-gray-600">
              Stockez vos documents en toute sécurité
            </p>
          </div>
          <div className="text-center p-6">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              🤖
            </div>
            <h3 className="text-xl font-semibold mb-2">Assistance IA</h3>
            <p className="text-gray-600">
              Une IA pour vous guider à chaque étape
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
