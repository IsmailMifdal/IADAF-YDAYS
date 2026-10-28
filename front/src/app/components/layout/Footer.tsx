"use client";

import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { localizedPack, packs } from "../../(app)/packs/packsData";
import { useLanguage } from "../../context/LanguageContext";
import { fmt } from "../../i18n";
import { LEGAL_INFO } from "../../lib/legalInfo";
import { BrandLogo } from "../brand/BrandMark";


const linkClass =
  "rounded text-sm text-brand-100 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70";

export default function Footer() {
  const { m } = useLanguage();

  const navLinks = [
    { label: m.nav.home, href: "/" },
    { label: m.nav.packs, href: "/nosPacks" },
    { label: m.nav.procedures, href: "/procedures" },
    { label: m.nav.folders, href: "/myFolders" },
  ];

  // Kept in sync with packsData.ts — these are the packs actually on sale.
  const packLinks = packs.map((pack) => ({
    label: localizedPack(m, pack).title,
    href: "/nosPacks",
  }));

  const legalLinks = [
    { label: m.footer.legalNotice, href: "/mentions-legales" },
    { label: m.footer.privacy, href: "/confidentialite" },
    { label: m.footer.terms, href: "/cgv" },
  ];

  return (
    <footer className="bg-gradient-to-r from-brand-900 via-brand-800 to-brand-700 text-white rtl:bg-gradient-to-l">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <BrandLogo onDark />
            <p className="mt-4 text-brand-100 text-sm leading-relaxed">
              {m.footer.about}
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white">
              {m.footer.navigation}
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
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white">
              {m.footer.packs}
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
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white">
              {m.footer.contact}
            </h3>
            {/* Only real details: an invented phone number or address on a
                commercial site misleads customers. Empty fields are hidden. */}
            <ul className="space-y-3">
              {LEGAL_INFO.contactEmail && (
                <li className="flex items-center gap-3 text-sm text-brand-100">
                  <Mail className="w-4 h-4 text-brand-300 shrink-0" />
                  <a href={`mailto:${LEGAL_INFO.contactEmail}`} className={linkClass}>
                    {LEGAL_INFO.contactEmail}
                  </a>
                </li>
              )}
              {LEGAL_INFO.phone && (
                <li className="flex items-center gap-3 text-sm text-brand-100">
                  <Phone className="w-4 h-4 text-brand-300 shrink-0" />
                  {LEGAL_INFO.phone}
                </li>
              )}
              {LEGAL_INFO.address && (
                <li className="flex items-center gap-3 text-sm text-brand-100">
                  <MapPin className="w-4 h-4 text-brand-300 shrink-0" />
                  {LEGAL_INFO.address}
                </li>
              )}
              <li>
                <Link
                  href="/mentions-legales"
                  className="rounded text-sm font-medium text-white transition hover:text-brand-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  {m.footer.allContacts}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/15">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-brand-200 text-sm">
            {fmt(m.footer.rights, { year: new Date().getFullYear() })}
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
