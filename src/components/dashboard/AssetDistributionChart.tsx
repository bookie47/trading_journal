'use client';

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Coins } from 'lucide-react';
import { useTrading } from '@/lib/context/trading-context';
import { calculateAssetPerformance } from '@/lib/calculations';
import { Card } from '../ui/Card';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#38bdf8', '#8b5cf6'];

export function AssetDistributionChart() {
  const { trades, activePortfolio } = useTrading();
  const currency = activePortfolio?.currency || 'USD';

  const data = useMemo(() => {
    return calculateAssetPerformance(trades);
  }, [trades]);

  const pieData = useMemo(() => {
    return data.map((d, i) => ({
      name: d.asset,
      value: d.totalTrades,
      netPnL: d.netPnL,
      winRate: d.winRate,
      color: COLORS[i % COLORS.length],
    }));
  }, [data]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700/80 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
          <p className="font-bold text-white">{d.name}</p>
          <p className="text-slate-400">จำนวน: {d.value} ออเดอร์</p>
          <p className="text-slate-400">Win Rate: {d.winRate}%</p>
          <p className={d.netPnL >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
            PnL: {d.netPnL >= 0 ? '+' : ''}{d.netPnL.toLocaleString()} {currency}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-bold text-white">สัดส่วนสินทรัพย์ที่เทรด</h3>
        </div>
        <span className="text-xs text-slate-400">{data.length} สินทรัพย์</span>
      </div>

      {pieData.length === 0 ? (
        <p className="text-xs text-slate-500 py-12 text-center">ไม่มีข้อมูล</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="font-semibold text-slate-200">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-slate-400">{item.value} ไม้</span>
                  <span className={item.netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {item.netPnL >= 0 ? '+' : ''}${item.netPnL}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
