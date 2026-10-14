"use client";

import Link from "next/link";
import { Sparkles, Mail, MapPin, Phone } from "lucide-react";
import { packs } from "../../(app)/packs/packsData";
import { LEGAL_INFO } from "../../lib/legalInfo";

const navLinks = [
  { label: "Accueil", href: "/" },
  { label: "Nos packs", href: "/nosPacks" },
  { label: "Démarches", href: "/procedures" },
  { label: "Mes Dossiers", href: "/myFolders" },
];

// Kept in sync with packsData.ts — these are the packs actually on sale.
const packLinks = packs.map((pack) => ({
  label: pack.title,
  href: "/nosPacks",
}));

const legalLinks = [
  { label: "Mentions légales", href: "/mentions-legales" },
  { label: "Confidentialité", href: "/confidentialite" },
  { label: "CGV", href: "/cgv" },
];

export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 text-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-lg">IA-DAF</p>
                <p className="text-sm text-blue-200">Assistant Administratif</p>
              </div>
            </div>
            <p className="text-blue-100 text-sm leading-relaxed">
              Votre assistant intelligent pour simplifier vos démarches
              administratives françaises. Accessible, multilingue et disponible
              24/7.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-semibold mb-4 text-white">Navigation</h3>
            <ul className="space-y-2.5">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-blue-100 text-sm hover:text-white transition"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Packs */}
          <div>
            <h3 className="font-semibold mb-4 text-white">Nos packs</h3>
            <ul className="space-y-2.5">
              {packLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-blue-100 text-sm hover:text-white transition"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4 text-white">Contact</h3>
            {/* Only real details: an invented phone number or address on a
                commercial site misleads customers. Empty fields are hidden. */}
            <ul className="space-y-3">
              {LEGAL_INFO.contactEmail && (
                <li className="flex items-center gap-3 text-blue-100 text-sm">
                  <Mail className="w-4 h-4 text-blue-300 shrink-0" />
                  <a href={`mailto:${LEGAL_INFO.contactEmail}`} className="hover:text-white transition">
                    {LEGAL_INFO.contactEmail}
                  </a>
                </li>
              )}
              {LEGAL_INFO.phone && (
                <li className="flex items-center gap-3 text-blue-100 text-sm">
                  <Phone className="w-4 h-4 text-blue-300 shrink-0" />
                  {LEGAL_INFO.phone}
                </li>
              )}
              {LEGAL_INFO.address && (
                <li className="flex items-center gap-3 text-blue-100 text-sm">
                  <MapPin className="w-4 h-4 text-blue-300 shrink-0" />
                  {LEGAL_INFO.address}
                </li>
              )}
              <li className="text-blue-100 text-sm">
                <Link href="/mentions-legales" className="hover:text-white transition">
                  Toutes nos coordonnées →
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/15">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-blue-200 text-sm">
            © {new Date().getFullYear()} IA-DAF. Tous droits réservés.
          </p>
          <div className="flex items-center gap-6">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-blue-200 text-sm hover:text-white transition"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
