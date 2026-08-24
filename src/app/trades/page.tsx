'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  PlusCircle, 
  Search, 
  Filter, 
  RotateCcw, 
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { useTrading } from '@/lib/context/trading-context';
import { Trade } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { TradeTable } from '@/components/trades/TradeTable';
import { TradeCardList } from '@/components/trades/TradeCardList';
import { CloseTradeModal } from '@/components/trades/CloseTradeModal';
import { TradeDetailModal } from '@/components/trades/TradeDetailModal';
import { AIScreenshotImporterModal } from '@/components/trades/AIScreenshotImporterModal';
import { Camera, Sparkles } from 'lucide-react';

export default function TradeHistoryPage() {
  const { 
    trades, 
    filteredTrades, 
    strategies, 
    filters, 
    setFilters, 
    resetFilters, 
    clearAllTrades,
    stats,
    activePortfolio 
  } = useTrading();

  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [closingTrade, setClosingTrade] = useState<Trade | null>(null);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  // List of unique assets for quick filter dropdown
  const uniqueAssets = useMemo(() => {
    const set = new Set<string>();
    trades.forEach((t) => set.add(t.asset.toUpperCase()));
    return Array.from(set).sort();
  }, [trades]);

  const currency = activePortfolio?.currency || 'USD';

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            ประวัติการเทรด (Trade History)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            แสดง {filteredTrades.length} จากทั้งหมด {trades.length} ออเดอร์
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {trades.length > 0 && (
            <Button
              variant="danger"
              size="md"
              onClick={() => {
                if (confirm('คุณต้องการลบข้อมูลประวัติการเทรดทั้งหมดในพอร์ตนี้ใช่หรือไม่?')) {
                  clearAllTrades();
                }
              }}
              className="text-xs bg-rose-600/20 text-rose-300 border border-rose-500/40 hover:bg-rose-600 hover:text-white"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              ล้างประวัติ
            </Button>
          )}

          <Button
            onClick={() => setIsAIModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25 text-xs sm:text-sm font-semibold"
          >
            <Camera className="w-4 h-4 mr-1.5 text-indigo-200" />
            📸 นำเข้าจากรูป (AI OCR)
          </Button>

          <Link href="/trades/new" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto shadow-brand-500/25">
              <PlusCircle className="w-4 h-4 mr-2" />
              + บันทึกเทรดใหม่
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
        {/* Search & Quick Status Pills */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full sm:flex-1">
            <Input
              placeholder="ค้นหาตามชื่อสินทรัพย์, โน้ต, อารมณ์..."
              leftIcon={<Search className="w-4 h-4" />}
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {(['all', 'open', 'closed', 'win', 'loss'] as const).map((statusKey) => {
              const labels: Record<string, string> = {
                all: `ทั้งหมด (${trades.length})`,
                open: `กำลังเปิด (${stats.openTradesCount})`,
                closed: `ปิดแล้ว (${stats.closedTradesCount})`,
                win: `ชนะ (${stats.winningTradesCount})`,
                loss: `แพ้ (${stats.losingTradesCount})`,
              };
              const isActive = filters.status === statusKey;

              return (
                <button
                  key={statusKey}
                  onClick={() => setFilters((prev) => ({ ...prev, status: statusKey }))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-md'
                      : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {labels[statusKey]}
                </button>
              );
            })}

            <button
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className={`p-2 rounded-xl border text-xs flex items-center gap-1 transition shrink-0 ${
                isFilterExpanded
                  ? 'bg-brand-600/20 border-brand-500 text-brand-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title="ตัวกรองเพิ่มเติม"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Expanded Filters Drawer */}
        {isFilterExpanded && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800 animate-fade-in text-xs">
            {/* Side */}
            <div>
              <label className="block font-semibold text-slate-400 uppercase text-[10px] mb-1">
                ฝั่ง (Side)
              </label>
              <select
                value={filters.side}
                onChange={(e) => setFilters((prev) => ({ ...prev, side: e.target.value as any }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-200"
              >
                <option value="all">ทั้งหมด (Long & Short)</option>
                <option value="long">Long (ซื้อ)</option>
                <option value="short">Short (ขาย)</option>
              </select>
            </div>

            {/* Strategy */}
            <div>
              <label className="block font-semibold text-slate-400 uppercase text-[10px] mb-1">
                กลยุทธ์ (Strategy)
              </label>
              <select
                value={filters.strategyId}
                onChange={(e) => setFilters((prev) => ({ ...prev, strategyId: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-200"
              >
                <option value="all">ทุกกลยุทธ์</option>
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Asset */}
            <div>
              <label className="block font-semibold text-slate-400 uppercase text-[10px] mb-1">
                สินทรัพย์ (Asset)
              </label>
              <select
                value={filters.asset}
                onChange={(e) => setFilters((prev) => ({ ...prev, asset: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-200"
              >
                <option value="all">ทุกสินทรัพย์</option>
                {uniqueAssets.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            {/* Time Range */}
            <div>
              <label className="block font-semibold text-slate-400 uppercase text-[10px] mb-1">
                ช่วงเวลา (Time Range)
              </label>
              <select
                value={filters.timeRange}
                onChange={(e) => setFilters((prev) => ({ ...prev, timeRange: e.target.value as any }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-200"
              >
                <option value="all">ทั้งหมด</option>
                <option value="today">วันนี้</option>
                <option value="this_week">สัปดาห์นี้ (7 วัน)</option>
                <option value="this_month">เดือนนี้ (30 วัน)</option>
                <option value="this_year">ปีนี้</option>
              </select>
            </div>

            <div className="sm:col-span-4 flex justify-end pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-xs text-slate-400 hover:text-white"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                รีเซ็ตตัวกรองทั้งหมด
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop View: Data Table */}
      <TradeTable
        trades={filteredTrades}
        onSelectTrade={(t) => setSelectedTrade(t)}
        onOpenCloseModal={(t) => setClosingTrade(t)}
      />

      {/* Mobile View: Card List */}
      <TradeCardList
        trades={filteredTrades}
        onSelectTrade={(t) => setSelectedTrade(t)}
        onOpenCloseModal={(t) => setClosingTrade(t)}
      />

      {/* Close Trade Modal */}
      {closingTrade && (
        <CloseTradeModal
          isOpen={Boolean(closingTrade)}
          trade={closingTrade}
          onClose={() => setClosingTrade(null)}
        />
      )}

      {/* Trade Detail Modal */}
      {selectedTrade && (
        <TradeDetailModal
          isOpen={Boolean(selectedTrade)}
          trade={selectedTrade}
          onClose={() => setSelectedTrade(null)}
          onOpenCloseModal={(t) => {
            setSelectedTrade(null);
            setClosingTrade(t);
          }}
        />
      )}

      {/* AI Multi-Screenshot Importer Modal */}
      <AIScreenshotImporterModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
      />
    </div>
  );
}
