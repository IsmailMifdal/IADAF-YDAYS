"use client";

import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { packs } from "../../(app)/packs/packsData";
import { LEGAL_INFO } from "../../lib/legalInfo";
import { BrandLogo } from "../brand/BrandMark";

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

const linkClass =
  "rounded text-sm text-gray-600 transition hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500";

export default function Footer() {
  return (
    <footer className="border-t border-gray-200/80 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <BrandLogo />
            <p className="mt-4 text-gray-600 text-sm leading-relaxed">
              Votre assistant pour réussir vos démarches administratives en
              France, dans votre langue, à toute heure.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-900">
              Navigation
            </h3>
            <ul className="space-y-2.5">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Packs */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-900">
              Nos packs
            </h3>
            <ul className="space-y-2.5">
              {packLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-900">
              Contact
            </h3>
            {/* Only real details: an invented phone number or address on a
                commercial site misleads customers. Empty fields are hidden. */}
            <ul className="space-y-3">
              {LEGAL_INFO.contactEmail && (
                <li className="flex items-center gap-3 text-sm text-gray-600">
                  <Mail className="w-4 h-4 text-brand-500 shrink-0" />
                  <a href={`mailto:${LEGAL_INFO.contactEmail}`} className={linkClass}>
                    {LEGAL_INFO.contactEmail}
                  </a>
                </li>
              )}
              {LEGAL_INFO.phone && (
                <li className="flex items-center gap-3 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-brand-500 shrink-0" />
                  {LEGAL_INFO.phone}
                </li>
              )}
              {LEGAL_INFO.address && (
                <li className="flex items-center gap-3 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-brand-500 shrink-0" />
                  {LEGAL_INFO.address}
                </li>
              )}
              <li>
                <Link
                  href="/mentions-legales"
                  className="rounded text-sm font-medium text-brand-700 transition hover:text-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  Toutes nos coordonnées →
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} IA-DAF. Tous droits réservés.
          </p>
          <div className="flex items-center gap-6">
            {legalLinks.map((link) => (
              <Link key={link.href} href={link.href} className={linkClass}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
