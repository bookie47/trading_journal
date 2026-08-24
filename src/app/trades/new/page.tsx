'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { TradeFormDesktop } from '@/components/trades/TradeFormDesktop';
import { TradeFormMobileWizard } from '@/components/trades/TradeFormMobileWizard';

export default function NewTradePage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Top Bar */}
      <div className="flex items-center gap-3">
        <Link
          href="/trades"
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            บันทึกการเทรดใหม่ (Trade Entry)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            กรอกข้อมูลออเดอร์ คำนวณความเสี่ยง และแนบรูปภาพกราฟเพื่อบันทึกสถิติ
          </p>
        </div>
      </div>

      {/* Desktop 3-Column Form */}
      <TradeFormDesktop />

      {/* Mobile 3-Step Wizard */}
      <TradeFormMobileWizard />
    </div>
  );
}
