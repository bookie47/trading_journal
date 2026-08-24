'use client';

import React, { useMemo } from 'react';
import { Target, Percent, DollarSign } from 'lucide-react';
import { useTrading } from '@/lib/context/trading-context';
import { calculateStrategyPerformance } from '@/lib/calculations';
import { Card } from '../ui/Card';

export function StrategyPerformanceChart() {
  const { trades, strategies, activePortfolio } = useTrading();
  const currency = activePortfolio?.currency || 'USD';

  const data = useMemo(() => {
    return calculateStrategyPerformance(trades, strategies);
  }, [trades, strategies]);

  return (
    <Card className="p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-bold text-white">ประสิทธิภาพรายกลยุทธ์</h3>
        </div>
        <span className="text-xs text-slate-400">{data.length} กลยุทธ์</span>
      </div>

      <div className="space-y-3.5 flex-1 overflow-y-auto">
        {data.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">ยังไม่มีข้อมูลการเทรดที่ปิด</p>
        ) : (
          data.map((strat) => {
            const isProfit = strat.netPnL >= 0;
            return (
              <div
                key={strat.strategyId}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: strat.color }}
                    />
                    <span className="text-xs font-bold text-slate-200 truncate max-w-[180px]">
                      {strat.strategyName}
                    </span>
                  </div>
                  <div className={`text-xs font-mono font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isProfit ? '+' : ''}{strat.netPnL.toLocaleString()} {currency}
                  </div>
                </div>

                {/* Progress Bar for Win Rate */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      Win Rate: <b className="text-slate-200">{strat.winRate}%</b> ({strat.wins}W / {strat.losses}L)
                    </span>
                    <span>PF: <b className="text-slate-200">{strat.profitFactor > 50 ? '∞' : strat.profitFactor}</b></span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${strat.winRate}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
