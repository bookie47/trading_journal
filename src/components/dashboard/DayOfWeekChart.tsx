'use client';

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from 'recharts';
import { Calendar } from 'lucide-react';
import { useTrading } from '@/lib/context/trading-context';
import { calculateDayOfWeekPerformance } from '@/lib/calculations';
import { Card } from '../ui/Card';

export function DayOfWeekChart() {
  const { trades, activePortfolio } = useTrading();
  const currency = activePortfolio?.currency || 'USD';

  const data = useMemo(() => {
    return calculateDayOfWeekPerformance(trades);
  }, [trades]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700/80 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
          <p className="font-bold text-white">วัน{label}</p>
          <p className="text-slate-400">จำนวน: {d.totalTrades} ออเดอร์</p>
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
          <Calendar className="w-5 h-5 text-sky-400" />
          <h3 className="text-base font-bold text-white">ผลตอบแทนตามวันในสัปดาห์</h3>
        </div>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        เปรียบเทียบกำไร-ขาดทุนสะสมในแต่ละวัน ช่วยเช็คจังหวะเทรดที่ดีที่สุด
      </p>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="netPnL" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`bar-${index}`}
                  fill={entry.netPnL >= 0 ? '#10b981' : '#f43f5e'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
