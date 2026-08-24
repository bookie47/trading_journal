'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  History, 
  PlusCircle, 
  Target, 
  Briefcase, 
  TrendingUp, 
  BookOpen,
  Sparkles,
  Cpu,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useTrading } from '@/lib/context/trading-context';

export function Sidebar() {
  const pathname = usePathname();
  const { isDemo, stats } = useTrading();

  const navItems = [
    { label: 'แดชบอร์ด', href: '/', icon: LayoutDashboard },
    { label: 'บันทึกเทรดใหม่', href: '/trades/new', icon: PlusCircle, highlight: true },
    { label: 'ประวัติการเทรด', href: '/trades', icon: History, count: stats.totalTrades },
    { label: 'กลยุทธ์ (Strategies)', href: '/strategies', icon: Target },
    { label: 'พอร์ตการลงทุน', href: '/portfolios', icon: Briefcase },
    { label: 'เชื่อมต่อ MT5 (EA)', href: '/mt5-sync', icon: Cpu },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-slate-800 bg-slate-950/90 backdrop-blur-xl h-screen sticky top-0 z-30">
      {/* Brand / Logo */}
      <div className="p-6 border-b border-slate-800/80 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-white tracking-tight text-base leading-tight">TradeJournal</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-slate-400 font-medium">ระบบบันทึกการเทรด</span>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-3 mb-2">
          เมนูหลัก
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group',
                isActive
                  ? 'bg-brand-600/15 text-brand-400 border border-brand-500/30 shadow-sm'
                  : item.highlight
                  ? 'bg-gradient-to-r from-brand-600/20 to-indigo-600/10 text-brand-300 hover:from-brand-600/30 hover:to-indigo-600/20 border border-brand-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={clsx(
                    'w-5 h-5 transition-colors',
                    isActive ? 'text-brand-400' : 'text-slate-400 group-hover:text-slate-200'
                  )}
                />
                <span>{item.label}</span>
              </div>
              {typeof item.count === 'number' && (
                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Open Trades Quick Summary */}
      {stats.openTradesCount > 0 && (
        <div className="p-4 mx-4 mb-4 rounded-xl bg-indigo-950/40 border border-indigo-800/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-300">ออเดอร์ที่เปิดอยู่</span>
            <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md font-mono font-bold">
              {stats.openTradesCount}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">อย่าลืมบันทึกปิดออเดอร์และสรุปผล</p>
          <Link
            href="/trades?status=open"
            className="block text-center text-xs font-semibold text-brand-400 hover:text-brand-300 mt-2.5 pt-2 border-t border-indigo-800/30 transition"
          >
            ดูออเดอร์ที่เปิดอยู่ &rarr;
          </Link>
        </div>
      )}

      {/* Mode Badge & Footer */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-medium text-slate-300">
              {isDemo ? 'โหมดทดลอง (Demo)' : 'Supabase Cloud'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
            PWA Ready
          </span>
        </div>
      </div>
    </aside>
  );
}
