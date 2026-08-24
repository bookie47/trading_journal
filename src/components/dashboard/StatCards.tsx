'use client';

import React from 'react';
import Link from 'next/link';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Percent, 
  Target, 
  ShieldAlert, 
  Award,
  Scale
} from 'lucide-react';
import { useTrading } from '@/lib/context/trading-context';
import { Card } from '../ui/Card';

export function StatCards() {
  const { stats, activePortfolio } = useTrading();
  const currency = activePortfolio?.currency || 'USD';

  const isProfit = stats.netPnL >= 0;
  const isCashProfit = (stats.netCashProfit ?? 0) >= 0;

  const cardItems = [
    {
      label: 'ยอดเงินพอร์ตปัจจุบัน (Balance)',
      value: `${stats.currentBalance.toLocaleString()} ${currency}`,
      subtext: `ทุนเริ่มต้น ${(activePortfolio?.initial_balance ?? 0).toLocaleString()} ${currency} (คลิกเพื่อแก้ไข)`,
      icon: Wallet,
      color: 'text-brand-400',
      bgColor: 'bg-brand-500/10',
      href: '/portfolios',
    },
    {
      label: 'อัตราการชนะ (Win Rate)',
      value: `${stats.winRate}%`,
      subtext: `ชนะ ${stats.winningTradesCount} / แพ้ ${stats.losingTradesCount} (ปิด ${stats.closedTradesCount})`,
      icon: Percent,
      color: stats.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400',
      bgColor: stats.winRate >= 50 ? 'bg-emerald-500/10' : 'bg-amber-500/10',
    },
    {
      label: 'Profit Factor',
      value: stats.profitFactor > 50 ? '∞' : stats.profitFactor.toFixed(2),
      subtext: `Avg Win: $${stats.avgWin} / Avg Loss: $${stats.avgLoss}`,
      icon: Award,
      color: stats.profitFactor >= 1.5 ? 'text-emerald-400' : 'text-slate-300',
      bgColor: 'bg-slate-800',
    },
    {
      label: 'Average Risk:Reward (R:R)',
      value: `1 : ${stats.avgRR > 0 ? stats.avgRR : 'N/A'}`,
      subtext: `กำไรสูงสุด: +$${stats.largestWin.toLocaleString()}`,
      icon: Scale,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
    },
    {
      label: 'Max Drawdown',
      value: `-${stats.maxDrawdown}%`,
      subtext: `ลดลงสูงสุด: -$${stats.maxDrawdownAmount.toLocaleString()} ${currency}`,
      icon: ShieldAlert,
      color: stats.maxDrawdown > 15 ? 'text-rose-400' : 'text-amber-400',
      bgColor: 'bg-rose-500/10',
      valueColor: 'text-rose-400',
    },
  ];

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Dual Accounting Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* Card 1: Trader Cash Flow */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 space-y-2 shadow-lg shadow-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-emerald-300 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              1. กำไรเงินสดจริงเข้ากระเป๋า (Trader Cash-Flow)
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black">
              ROI +{stats.cashROI ?? 0}%
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
            {isCashProfit ? '+' : ''}${(stats.netCashProfit ?? 0).toLocaleString()} {currency}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800/80">
            <span>เงินต้นฝากจริง: <b className="text-white">${stats.totalDeposits ?? 0}</b></span>
            <span>ถอนเงินสดออก: <b className="text-white">${stats.totalWithdrawals ?? 0}</b></span>
          </div>
        </div>

        {/* Card 2: MT5 Trade Performance */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/30 space-y-2 shadow-lg shadow-indigo-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-indigo-300 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-indigo-400" />
              2. ผลงานการเทรดบนกระดาน (MT5 Trade Performance)
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold">
              Win Rate {stats.winRate}%
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-300 font-mono tracking-tight">
            {isProfit ? '+' : ''}${stats.netPnL.toLocaleString()} {currency}
          </div>
          <div className="text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800/80">
            <span>Gross Win: <b className="text-emerald-400">+${stats.grossProfit}</b></span>
            <span>Gross Loss: <b className="text-rose-400">-${stats.grossLoss}</b></span>
            <span>PF: <b className="text-amber-400">{stats.profitFactor}</b></span>
          </div>
        </div>
      </div>

      {/* Sub-KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {cardItems.map((card, idx) => {
          const Icon = card.icon;
          const CardContent = (
            <Card className={`p-4 h-full flex flex-col justify-between hover:border-slate-700/80 transition-all ${card.href ? 'cursor-pointer hover:border-brand-500/50 hover:bg-slate-900/80' : ''}`}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] sm:text-xs font-medium text-slate-400 truncate">
                  {card.label}
                </span>
                <div className={`p-1.5 rounded-lg ${card.bgColor} shrink-0`}>
                  <Icon className={`w-3.5 h-3.5 ${card.color}`} />
                </div>
              </div>
              <div>
                <div className={`text-sm sm:text-lg font-bold tracking-tight font-mono ${card.valueColor || 'text-white'}`}>
                  {card.value}
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1 truncate">
                  {card.subtext}
                </div>
              </div>
            </Card>
          );

          if (card.href) {
            return (
              <Link key={idx} href={card.href} className="block">
                {CardContent}
              </Link>
            );
          }

          return <div key={idx}>{CardContent}</div>;
        })}
      </div>
    </div>
  );
}
