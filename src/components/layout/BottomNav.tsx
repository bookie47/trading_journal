'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  History, 
  Plus, 
  Target, 
  Briefcase, 
  FileText, 
  Camera, 
  Edit3,
  X,
  Sparkles
} from 'lucide-react';
import { clsx } from 'clsx';
import { useTrading } from '@/lib/context/trading-context';
import { MT5ReportImporterModal } from '@/components/trades/MT5ReportImporterModal';
import { AIScreenshotImporterModal } from '@/components/trades/AIScreenshotImporterModal';

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { stats } = useTrading();

  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  const items = [
    { label: 'แดชบอร์ด', href: '/', icon: LayoutDashboard },
    { label: 'ประวัติ', href: '/trades', icon: History, count: stats.openTradesCount > 0 ? stats.openTradesCount : undefined },
    { label: 'เพิ่มไฟล์', isPrimary: true },
    { label: 'กลยุทธ์', href: '/strategies', icon: Target },
    { label: 'พอร์ต', href: '/portfolios', icon: Briefcase },
  ];

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/90 pb-safe">
        <nav className="flex items-center justify-around px-2 py-2">
          {items.map((item, idx) => {
            if (item.isPrimary) {
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setIsActionSheetOpen(true)}
                  className="flex flex-col items-center -mt-5 group focus:outline-none"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-500 via-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 border-2 border-slate-950 transition active:scale-95">
                    <Plus className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 mt-1">เพิ่มไฟล์</span>
                </button>
              );
            }

            const Icon = item.icon!;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href!}
                className={clsx(
                  'flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all relative',
                  isActive ? 'text-brand-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
                )}
              >
                <div className="relative">
                  <Icon className={clsx('w-5 h-5', isActive && 'stroke-[2.5]')} />
                  {item.count && (
                    <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-indigo-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {item.count}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Mobile Action Sheet for Adding / Importing Files */}
      {isActionSheetOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div 
            className="fixed inset-0"
            onClick={() => setIsActionSheetOpen(false)}
          />

          <div className="relative w-full max-w-lg bg-slate-900 border-t border-slate-800 rounded-t-3xl p-5 space-y-4 shadow-2xl z-10 animate-slide-up pb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  เพิ่มข้อมูลการเทรด / นำเข้าไฟล์
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">เลือกรูปแบบที่คุณต้องการบันทึกลงพอร์ต</p>
              </div>
              <button
                onClick={() => setIsActionSheetOpen(false)}
                className="p-2 rounded-full text-slate-400 hover:text-white bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 pt-1">
              {/* Option 1: PDF / MT5 Report */}
              <button
                onClick={() => {
                  setIsActionSheetOpen(false);
                  setIsReportModalOpen(true);
                }}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/40 flex items-center gap-3.5 text-left transition active:scale-98 hover:border-emerald-500"
              >
                <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    📄 นำเข้า PDF / รายงาน MT5
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">แนะนำ</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    อ่านไฟล์ PDF Statement หรือ HTML พร้อมคำนวณกำไรเงินสดจริง
                  </div>
                </div>
              </button>

              {/* Option 2: AI Multi-Screenshot OCR */}
              <button
                onClick={() => {
                  setIsActionSheetOpen(false);
                  setIsAIModalOpen(true);
                }}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-slate-900 border border-indigo-500/40 flex items-center gap-3.5 text-left transition active:scale-98 hover:border-indigo-500"
              >
                <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    📸 นำเข้าจากรูปภาพ (AI OCR)
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    อัปโหลดรูปแคปหน้าจอหลายๆ รูป AI จะดึงไม้ให้อัตโนมัติ
                  </div>
                </div>
              </button>

              {/* Option 3: Manual Trade Entry */}
              <button
                onClick={() => {
                  setIsActionSheetOpen(false);
                  router.push('/trades/new');
                }}
                className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3.5 text-left transition active:scale-98 hover:border-slate-700"
              >
                <div className="p-3 rounded-xl bg-slate-800 text-slate-300 shrink-0">
                  <Edit3 className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">
                    ✍️ กรอกข้อมูลด้วยตนเอง (Manual Form)
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    กรอกราคาเข้า, SL, TP, กลยุทธ์ และจดบันทึกแบบละเอียด
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Modals on Mobile */}
      <MT5ReportImporterModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />

      <AIScreenshotImporterModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
      />
    </>
  );
}
