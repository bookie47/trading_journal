'use client';

import React, { useState } from 'react';
import { Target, Plus, Trash2, Edit3, Check, Percent, DollarSign } from 'lucide-react';
import { useTrading } from '@/lib/context/trading-context';
import { Strategy } from '@/lib/types';
import { calculateStrategyPerformance } from '@/lib/calculations';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';

const COLOR_PALETTES = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#38bdf8', // Sky
  '#8b5cf6', // Purple
  '#14b8a6', // Teal
  '#f43f5e', // Rose
];

export default function StrategiesPage() {
  const { strategies, trades, activePortfolio, createStrategy, deleteStrategy } = useTrading();
  const currency = activePortfolio?.currency || 'USD';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLOR_PALETTES[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const strategyStats = calculateStrategyPerformance(trades, strategies);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await createStrategy({
        portfolio_id: activePortfolio?.id || 'portfolio-demo-1',
        name: name.trim(),
        description: description.trim() || undefined,
        color,
      });
      setName('');
      setDescription('');
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to create strategy:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`คุณต้องการลบกลยุทธ์ "${name}" ใช่หรือไม่?`)) {
      await deleteStrategy(id);
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            จัดการกลยุทธ์ (Trading Strategies)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            สร้างและติดตามประสิทธิภาพของระบบเทรดแต่ละรูปแบบ
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="shadow-brand-500/25">
          <Plus className="w-4 h-4 mr-1.5" />
          + เพิ่มกลยุทธ์ใหม่
        </Button>
      </div>

      {/* Strategies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {strategies.map((strat) => {
          const stat = strategyStats.find((s) => s.strategyId === strat.id);
          const total = stat?.totalTrades || 0;
          const winRate = stat?.winRate || 0;
          const netPnL = stat?.netPnL || 0;
          const isProfit = netPnL >= 0;

          return (
            <Card
              key={strat.id}
              className="p-5 flex flex-col justify-between hover:border-slate-700 transition space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full shadow-sm"
                      style={{ backgroundColor: strat.color }}
                    />
                    <h3 className="text-base font-bold text-white tracking-tight">
                      {strat.name}
                    </h3>
                  </div>
                  <button
                    onClick={() => handleDelete(strat.id, strat.name)}
                    className="text-slate-500 hover:text-rose-400 p-1 transition"
                    title="ลบกลยุทธ์"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-400 mt-2 min-h-[36px]">
                  {strat.description || 'ไม่มีคำอธิบาย'}
                </p>
              </div>

              {/* Stats Box */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">ออเดอร์ทั้งหมด</span>
                  <span className="font-mono font-bold text-slate-200">{total} ไม้</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Win Rate</span>
                  <span className="font-mono font-bold text-slate-200">{winRate}%</span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Net PnL</span>
                  <span className={`font-mono font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isProfit ? '+' : ''}{netPnL.toLocaleString()} {currency}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${winRate}%` }}
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add Strategy Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="เพิ่มกลยุทธ์การเทรดใหม่"
        description="กำหนดชื่อและคำอธิบายเงื่อนไขของ Setup การเข้าเทรด"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="ชื่อกลยุทธ์ *"
            placeholder="เช่น Order Block + FVG, Breakout 1H"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              คำอธิบาย / เงื่อนไขของกลยุทธ์
            </label>
            <textarea
              rows={3}
              placeholder="เช่น รอแท่ง 15m ปิดทะลุแนวต้าน แล้วเข้าที่ FVG..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="block w-full rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Color Palette Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              สีประจำกลยุทธ์
            </label>
            <div className="flex items-center gap-2">
              {COLOR_PALETTES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                    color === c ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              ยกเลิก
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              บันทึกกลยุทธ์
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
