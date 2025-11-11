'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b" style={{ 
      backgroundColor: 'var(--bg-card)',
      borderColor: 'var(--border-primary)'
    }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 transition-smooth hover:opacity-80">
            <div className="w-1 h-8 rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }} />
            <div>
              <h1 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                PulseWatch PH
              </h1>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-3 sm:gap-6">
            <Link 
              href="/health"
              className="flex items-center gap-2 text-sm font-medium transition-smooth hover:opacity-80"
              style={{ 
                color: pathname === '/health' ? 'var(--accent-primary)' : 'var(--text-secondary)' 
              }}
            >
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Health</span>
            </Link>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
