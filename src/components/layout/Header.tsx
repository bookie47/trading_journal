'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ChevronDown, 
  RotateCcw, 
  Sparkles, 
  Plus, 
  FolderPlus,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Trash2
} from 'lucide-react';
import { useTrading } from '@/lib/context/trading-context';
import { Button } from '../ui/Button';

export function Header() {
  const { 
    portfolios, 
    activePortfolio, 
    setActivePortfolioId, 
    isDemo, 
    resetToDemoData,
    clearAllTrades,
    trades,
    stats 
  } = useTrading();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl px-4 lg:px-8 py-3 flex items-center justify-between">
      {/* Left: Mobile Brand & Active Portfolio Switcher */}
      <div className="flex items-center gap-3">
        <div className="md:hidden flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
            <TrendingUp className="w-4 h-4" />
          </div>
          <span className="font-bold text-white text-sm">TradeJournal</span>
        </div>

        {/* Portfolio Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm font-medium text-slate-200 hover:border-slate-700 transition"
          >
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            <span className="font-semibold text-white max-w-[140px] sm:max-w-[200px] truncate">
              {activePortfolio?.name || 'พอร์ตหลัก'}
            </span>
            <span className="text-[11px] text-slate-400 font-mono bg-slate-800 px-1.5 py-0.5 rounded">
              {activePortfolio?.currency || 'USD'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-20" 
                onClick={() => setIsDropdownOpen(false)} 
              />
              <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-30 space-y-1">
                <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  เลือกพอร์ตการลงทุน
                </div>
                {portfolios.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setActivePortfolioId(p.id);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                      p.id === activePortfolio?.id
                        ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex flex-col items-start truncate">
                      <span className="font-semibold truncate">{p.name}</span>
                      <span className="text-[10px] text-slate-500">ทุนเริ่มต้น: {p.initial_balance.toLocaleString()} {p.currency}</span>
                    </div>
                    {p.id === activePortfolio?.id && (
                      <span className="text-brand-400 text-xs font-bold">✓</span>
                    )}
                  </button>
                ))}

                <div className="pt-2 border-t border-slate-800">
                  <Link
                    href="/portfolios"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-brand-400 hover:bg-brand-600/10 transition font-medium"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>จัดการ / สร้างพอร์ตใหม่</span>
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: Quick actions & Demo status */}
      <div className="flex items-center gap-2 sm:gap-3">
        {isDemo && (
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Demo Data</span>
            <button
              onClick={resetToDemoData}
              title="รีเซ็ตข้อมูลตัวอย่าง"
              className="text-amber-400 hover:text-amber-200 p-0.5 ml-1 transition"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        )}


        <Link href="/mt5-sync">
          <Button variant="outline" size="sm" className="text-xs border-indigo-700/60 text-indigo-300 hover:bg-indigo-950/40">
            <Cpu className="w-3.5 h-3.5 mr-1 text-brand-400 animate-pulse" />
            <span>MT5 EA</span>
          </Button>
        </Link>

        <Link href="/auth" className="hidden lg:block">
          <Button variant="outline" size="sm" className="text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/10">
            <span className="w-2 h-2 rounded-full bg-amber-400 mr-1.5 animate-pulse" />
            <span>Firebase Cloud</span>
          </Button>
        </Link>

        <Link href="/trades/new" className="hidden md:block">
          <Button size="sm" className="shadow-brand-500/20">
            <Plus className="w-4 h-4" />
            <span>+ บันทึกเทรด</span>
          </Button>
        </Link>
      </div>
    </header>
  );
}
