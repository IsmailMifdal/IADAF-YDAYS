"use client";

import { useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import { Menu } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex w-full min-h-screen bg-slate-100">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {!isSidebarOpen && (
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Ouvrir la sidebar"
          className="fixed top-4 left-4 z-50 bg-blue-600 text-white p-2 rounded-lg shadow-md hover:bg-blue-700 transition"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      <main
        className={`flex-1 w-full min-h-screen overflow-y-auto transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "ml-64" : "ml-0"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
