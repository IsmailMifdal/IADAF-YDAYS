"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  MessageSquare,
  FileText,
  Folder,
  Upload,
  LayoutGrid,
  Package,
  Settings,
  LogOut,
  X,
  LucideIcon,
} from "lucide-react";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

type MenuItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const menu: MenuItem[] = [
  { label: "Accueil", href: "/", icon: Home },
  { label: "Nos packs", href: "/nosPacks", icon: Package },
  // { label: "Chat IA", href: "/chatIa", icon: MessageSquare },
  { label: "Démarches", href: "/procedures", icon: FileText },
  { label: "Mes Dossiers", href: "/myFolders", icon: Folder },
  // { label: "Documents", href: "/documents", icon: Upload },
  { label: "Tableau de bord", href: "/dashboard", icon: LayoutGrid },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen bg-blue-700 text-white flex flex-col overflow-y-auto transition-all duration-300 ease-in-out ${
        isOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full"
      }`}
    >
      <div className="p-6 border-b border-blue-600 flex justify-between items-start">
        <div>
          <h1 className="text-xl font-semibold">IA-DAF</h1>
          <p className="text-sm text-blue-200">Assistant Administratif</p>
        </div>

        <button
          type="button"
          className="p-1 rounded-md hover:bg-blue-600 transition"
          aria-label="Fermer la sidebar"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menu.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-blue-100 hover:bg-blue-600 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto p-4 border-t border-blue-600 space-y-3">
        <div className="bg-blue-600 rounded-lg p-3 flex items-center gap-3">
          <div className="bg-blue-500 w-10 h-10 rounded-full flex items-center justify-center font-semibold">
            YS
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">Yanis Saoudi</p>
            <p className="text-xs text-blue-200 truncate">
              yanissaoudi@gmail.com
            </p>
          </div>
        </div>

        <button
          type="button"
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-600 transition"
        >
          <Settings className="w-5 h-5" />
          <span>Paramètres</span>
        </button>

        <button
          type="button"
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-600 transition"
        >
          <LogOut className="w-5 h-5" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}
