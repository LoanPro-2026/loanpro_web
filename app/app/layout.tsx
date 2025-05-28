'use client'
import Link from "next/link";
import { useState } from "react";
import { Dashboard, Add, Remove, AccountBalanceWallet, ListAlt, AccountCircle, Settings, Menu, Brightness4, Brightness7, Notifications } from "@mui/icons-material";
import { useTheme } from "./theme/ThemeProvider";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: <Dashboard /> },
  { to: "/add-record", label: "Add New Record", icon: <Add /> },
  { to: "/remove-record", label: "Remove Record", icon: <Remove /> },
  { to: "/add-deposit", label: "Add Deposit", icon: <AccountBalanceWallet /> },
  { to: "/view-records", label: "View Records", icon: <ListAlt /> },
  { to: "/view-accounts", label: "View Accounts", icon: <AccountCircle /> },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-neutral-900">
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? 'w-20' : 'w-64'} flex flex-col bg-white dark:bg-neutral-800 border-r border-gray-200 dark:border-neutral-700 transition-all duration-200`}>
        <div className={`flex flex-col items-center ${sidebarCollapsed ? 'py-2' : 'py-0'}`}>
          <img src={"/logo.png"} alt="Logo" className={`${sidebarCollapsed ? 'h-10' : 'h-30'} mb-8 transition-all duration-200`} />
        </div>
        <nav className="flex-1">
          <ul className="space-y-2">
            {navItems.map(item => (
              <li key={item.to}>
                <Link href={"/app" + item.to} legacyBehavior>
                  <a
                    className={`flex items-center px-6 py-3 text-base font-medium transition-colors rounded-l-full text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-neutral-700`}
                  >
                    <span className="mr-4 flex justify-center w-6">{item.icon}</span>
                    {!sidebarCollapsed && item.label}
                  </a>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto mb-4 px-6">
          <Link href="/app/settings" legacyBehavior>
            <a className={`flex items-center px-4 py-2 rounded-lg transition-colors text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-neutral-700`}>
              <Settings className="mr-3" /> {!sidebarCollapsed && 'Settings'}
            </a>
          </Link>
        </div>
      </aside>
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-8 bg-white dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700">
          <div className="flex items-center w-1/2">
            {/* Menu button */}
            <button
              className="mr-4 p-2 rounded hover:bg-gray-200 dark:hover:bg-neutral-700"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              aria-label="Toggle sidebar"
            >
              <Menu />
            </button>
            {/* Placeholder for search bar */}
            <input
              type="text"
              placeholder="Search Customer"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-neutral-600 bg-gray-50 dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="flex items-center space-x-4">
            {/* Notification icon */}
            <button className="transition-colors" aria-label="Notifications">
              <Notifications />
            </button>
            {/* Theme switcher */}
            <button className="transition-colors" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === "dark" ? <Brightness7 /> : <Brightness4 />}
            </button>
            {/* Placeholder for user actions */}
            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg">Add Cash</button>
            <button className="px-4 py-2 bg-red-500 text-white rounded-lg">Remove Cash</button>
            <button className="p-2 rounded-full bg-gray-200 dark:bg-neutral-700">
              <AccountCircle className="text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </header>
        {/* Page Content */}
        <main className="flex-1 p-8 bg-gray-50 dark:bg-neutral-900">
          {children}
        </main>
      </div>
    </div>
  );
} 