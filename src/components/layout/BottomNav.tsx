'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, History, Plus, Target, Briefcase } from 'lucide-react';
import { clsx } from 'clsx';
import { useTrading } from '@/lib/context/trading-context';

export function BottomNav() {
  const pathname = usePathname();
  const { stats } = useTrading();

  const items = [
    { label: 'แดชบอร์ด', href: '/', icon: LayoutDashboard },
    { label: 'ประวัติ', href: '/trades', icon: History, count: stats.openTradesCount > 0 ? stats.openTradesCount : undefined },
    { label: 'เพิ่มเทรด', href: '/trades/new', icon: Plus, isPrimary: true },
    { label: 'กลยุทธ์', href: '/strategies', icon: Target },
    { label: 'พอร์ต', href: '/portfolios', icon: Briefcase },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 pb-safe">
      <nav className="flex items-center justify-around px-2 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          if (item.isPrimary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center -mt-5 group"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/40 border-2 border-slate-950 transition active:scale-95">
                  <Plus className="w-6 h-6 stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-semibold text-brand-400 mt-1">เพิ่มเทรด</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all relative',
                isActive ? 'text-brand-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <div className="relative">
                <Icon className={clsx('w-5 h-5', isActive && 'stroke-[2.5]')} />
                {item.count && (
                  <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {item.count}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
