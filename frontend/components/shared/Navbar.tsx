'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Navbar() {
  return (
    <nav className="border-b bg-white/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/">
          <h1 className="text-2xl font-bold text-blue-600">IA-DAF</h1>
        </Link>
        <Link href="/login">
          <Button>Se connecter</Button>
        </Link>
      </div>
    </nav>
  );
}
