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
      label: 'Net PnL รวมทั้งหมด',
      value: `${isProfit ? '+' : ''}${stats.netPnL.toLocaleString()} ${currency}`,
      subtext: `${isProfit ? '+' : ''}${stats.totalPnLPercentage}% จากทุนเริ่มต้น`,
      icon: isProfit ? TrendingUp : TrendingDown,
      color: isProfit ? 'text-emerald-400' : 'text-rose-400',
      bgColor: isProfit ? 'bg-emerald-500/10' : 'bg-rose-500/10',
      valueColor: isProfit ? 'text-emerald-400' : 'text-rose-400',
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
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
      {cardItems.map((card, idx) => {
        const Icon = card.icon;
        const CardContent = (
          <Card className={`p-4 sm:p-5 h-full flex flex-col justify-between hover:border-slate-700/80 transition-all ${card.href ? 'cursor-pointer hover:border-brand-500/50 hover:bg-slate-900/80' : ''}`}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] sm:text-xs font-medium text-slate-400 truncate">
                {card.label}
              </span>
              <div className={`p-2 rounded-xl ${card.bgColor} shrink-0`}>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
            <div>
              <div className={`text-base sm:text-xl font-bold tracking-tight font-mono ${card.valueColor || 'text-white'}`}>
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
  );
}
