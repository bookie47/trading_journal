'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PlusCircle, Sparkles, AlertCircle, Camera } from 'lucide-react';
import { useTrading } from '@/lib/context/trading-context';
import { StatCards } from '@/components/dashboard/StatCards';
import { EquityCurveChart } from '@/components/dashboard/EquityCurveChart';
import { StrategyPerformanceChart } from '@/components/dashboard/StrategyPerformanceChart';
import { AssetDistributionChart } from '@/components/dashboard/AssetDistributionChart';
import { DayOfWeekChart } from '@/components/dashboard/DayOfWeekChart';
import { RecentTrades } from '@/components/dashboard/RecentTrades';
import { Button } from '@/components/ui/Button';
import { AIScreenshotImporterModal } from '@/components/trades/AIScreenshotImporterModal';

export default function DashboardPage() {
  const { activePortfolio, stats, trades, isLoading } = useTrading();
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-7xl mx-auto animate-fade-in">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            แดชบอร์ดภาพรวม (Overview)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            พอร์ต: <span className="font-semibold text-slate-200">{activePortfolio?.name || 'Main Trading Portfolio'}</span> • บันทึกแล้วทั้งหมด {stats.totalTrades} ออเดอร์
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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
              + บันทึกการเทรดใหม่
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <StatCards />

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equity Curve (2 cols on desktop) */}
        <div className="lg:col-span-2">
          <EquityCurveChart />
        </div>

        {/* Strategy Performance (1 col) */}
        <div className="lg:col-span-1">
          <StrategyPerformanceChart />
        </div>
      </div>

      {/* Secondary Grid: Asset Breakdown, Day of Week, Recent Trades */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AssetDistributionChart />
        <DayOfWeekChart />
        <RecentTrades />
      </div>

      {/* AI Multi-Screenshot Importer Modal */}
      <AIScreenshotImporterModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
      />
    </div>
  );
}
