'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Link from 'next/link';

interface NavUser {
  name?: string | null;
  email?: string | null;
  role: string;
}

interface NavLink {
  label: string;
  href: string;
}

function getNavLinks(role: string): NavLink[] {
  if (role === 'LANDLORD') {
    return [
      { label: 'Dashboard', href: '/dashboard/landlord' },
      { label: 'Properties', href: '/dashboard/landlord/properties' },
      { label: 'Tenancies', href: '/dashboard/landlord/tenancies' },
      { label: 'Payments', href: '/dashboard/landlord/payments' },
      { label: 'Messages', href: '/dashboard/landlord/messages' },
    ];
  }
  if (role === 'TENANT') {
    return [
      { label: 'Dashboard', href: '/dashboard/tenant' },
      { label: 'My Tenancy', href: '/dashboard/tenant/tenancy' },
      { label: 'Payments', href: '/dashboard/tenant/payments' },
      { label: 'Conditions', href: '/dashboard/tenant/conditions' },
      { label: 'Messages', href: '/dashboard/tenant/messages' },
    ];
  }
  if (role === 'ADMIN') {
    return [
      { label: 'Dashboard', href: '/dashboard/admin' },
      { label: 'Users', href: '/dashboard/admin/users' },
    ];
  }
  return [];
}

export default function TopNav({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const links = getNavLinks(user.role);

  const isActive = (href: string) => {
    if (
      href === '/dashboard/landlord' ||
      href === '/dashboard/tenant' ||
      href === '/dashboard/admin'
    ) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  // Poll the unread message count every 30 seconds.
  // This powers the badge dot on the Messages nav link.
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/messages/unread');
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.count ?? 0);
        }
      } catch {
        // Silently fail — the badge is non-critical UI
      }
    };

    fetchUnread(); // run immediately on mount
    const interval = setInterval(fetchUnread, 30_000);
    return () => clearInterval(interval); // cleanup on unmount
  }, []);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link
            href={`/dashboard/${user.role.toLowerCase()}`}
            className="text-xl font-bold text-blue-600 tracking-tight"
          >
            RentalEase
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  isActive(link.href)
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {link.label}
                {link.label === 'Messages' && unreadCount > 0 && (
                  <span className="bg-blue-600 text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 leading-none">
                {user.name}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 capitalize">
                {user.role.toLowerCase()}
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-sm text-gray-500 hover:text-red-600 transition-colors font-medium"
            >
              Sign out
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 pt-2 space-y-1 border-t border-gray-100">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {link.label}
                {link.label === 'Messages' && unreadCount > 0 && (
                  <span className="bg-blue-600 text-white text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            ))}
            <div className="pt-3 px-4 border-t border-gray-100 mt-2 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-400 capitalize">
                  {user.role.toLowerCase()}
                </p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-sm text-red-500 font-medium"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
