'use client';

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, DollarSign } from 'lucide-react';
import { useTrading } from '@/lib/context/trading-context';
import { buildEquityCurve } from '@/lib/calculations';
import { Card } from '../ui/Card';

export function EquityCurveChart() {
  const { trades, activePortfolio } = useTrading();
  const initialBalance = activePortfolio?.initial_balance ?? 0;
  const currency = activePortfolio?.currency || 'USD';

  const chartData = useMemo(() => {
    return buildEquityCurve(trades, initialBalance);
  }, [trades, initialBalance]);

  const currentBalance = chartData[chartData.length - 1]?.balance || initialBalance;
  const isUp = currentBalance >= initialBalance;

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700/80 p-3 rounded-xl shadow-xl text-xs space-y-1">
          <p className="font-semibold text-slate-300">{label}</p>
          {data.asset && (
            <p className="text-slate-400">
              สินทรัพย์: <span className="font-bold text-white">{data.asset}</span>
            </p>
          )}
          {data.tradeNumber > 0 && (
            <p className="text-slate-400">
              ผลการเทรด:{' '}
              <span className={`font-bold ${data.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {data.pnl >= 0 ? '+' : ''}{data.pnl.toLocaleString()} {currency}
              </span>
            </p>
          )}
          <p className="text-slate-200 border-t border-slate-800 pt-1 mt-1 font-mono">
            Balance:{' '}
            <span className="font-bold text-brand-400">
              {data.balance.toLocaleString()} {currency}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-5 flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-400" />
            <h3 className="text-base font-bold text-white">Equity Curve (กราฟการเติบโตของพอร์ต)</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            กราฟแสดงการเปลี่ยนแปลงยอดเงินสะสมตามลำดับการปิดออเดอร์
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-xs text-slate-400">มูลค่าพอร์ตล่าสุด</div>
            <div className={`text-lg font-bold font-mono ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
              {currentBalance.toLocaleString()} {currency}
            </div>
          </div>
        </div>
      </div>

      <div className="h-64 sm:h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorBalance" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="5%" stopColor={isUp ? '#10b981' : '#f43f5e'} stopOpacity={0.4} />
                <stop offset="95%" stopColor={isUp ? '#10b981' : '#f43f5e'} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
              tickFormatter={(v) => `$${v.toLocaleString()}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="balance"
              stroke={isUp ? '#10b981' : '#f43f5e'}
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorBalance)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
