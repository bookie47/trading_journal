'use client';

import React, { useState } from 'react';
import { 
  FileText, 
  UploadCloud, 
  Sparkles, 
  CheckCircle2, 
  DollarSign, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useTrading } from '@/lib/context/trading-context';
import { parseMT5HTMLReport, MT5ParsedReport } from '@/lib/mt5-report-parser';
import { Trade } from '@/lib/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function MT5ReportImporterModal({ isOpen, onClose }: Props) {
  const { addTrade, activePortfolio, strategies } = useTrading();
  const [report, setReport] = useState<MT5ParsedReport | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');

  const currency = activePortfolio?.currency || 'USD';

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = parseMT5HTMLReport(content);
        if (parsed.trades.length === 0) {
          setErrorMsg('ไม่พบรายการเทรดในไฟล์รายงานนี้ โปรดใช้ไฟล์ HTML Trade History Report จาก MT5');
          return;
        }
        setReport(parsed);
        setErrorMsg('');
      } catch (err: any) {
        console.error('Error parsing MT5 Report:', err);
        setErrorMsg('เกิดข้อผิดพลาดในการอ่านไฟล์ HTML รายงาน');
      }
    };
    reader.readAsText(file);
  };

  const handleSaveAll = async () => {
    if (!report || report.trades.length === 0) return;

    setIsSaving(true);
    try {
      for (const t of report.trades) {
        const tradeId = t.ticket ? `mt5_${t.ticket}` : `trade_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        const newTrade: Trade = {
          id: tradeId,
          portfolio_id: activePortfolio?.id || 'portfolio-demo-1',
          ticket: t.ticket ? Number(t.ticket) : undefined,
          asset: t.asset,
          side: t.side,
          size: t.size,
          entry_price: t.entry_price,
          exit_price: t.exit_price || t.entry_price,
          fee: 0,
          entry_time: t.entry_time,
          exit_time: t.exit_time || t.entry_time,
          strategy_id: selectedStrategyId || undefined,
          status: 'closed',
          pnl: t.pnl,
          pnl_percentage: 0,
          r_multiple: 0,
          notes: `Imported from MT5 Report (Ticket #${t.ticket || 'N/A'})`,
          created_at: new Date().toISOString(),
        };

        await addTrade(newTrade);
      }

      alert(`บันทึกประวัติการเทรด ${report.trades.length} ไม้ พร้อมระบบคำนวณกำไรเงินสดเรียบร้อยแล้ว!`);
      setReport(null);
      onClose();
    } catch (err: any) {
      console.error('Save error:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setReport(null);
        setErrorMsg('');
        onClose();
      }}
      title="📄 นำเข้าจากรายงาน MT5 Report (HTML / Statement)"
      maxWidth="4xl"
    >
      <div className="space-y-5 py-2">
        {!report ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white text-sm mb-1">
                  นำเข้าไฟล์รายงาน MT5 Report &ndash; คำนวณตรงเป๊ะ 100% พร้อมวิธีคิดกระแสเงินสดจริง
                </p>
                <p className="text-slate-300 leading-relaxed">
                  บันทึกไฟล์รายงานจาก MT5 (เมนู History &rarr; คลิกขวา &rarr; Report &rarr; HTML) แล้วเลือกไฟล์ที่นี่ ระบบจะถอดทั้ง 25 ไม้ครบทุกตั๋ว พร้อมคำนวณกำไรเงินสดเข้ากระเป๋าจริงให้อัตโนมัติทันที
                </p>
              </div>
            </div>

            {/* Dropzone */}
            <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-700 hover:border-brand-500/60 rounded-2xl bg-slate-900/40 hover:bg-slate-900/80 cursor-pointer transition-all">
              <FileText className="w-12 h-12 text-brand-400 mb-3 animate-pulse" />
              <p className="text-sm font-bold text-white mb-1">
                คลิกเลือกไฟล์รายงาน MT5 (.html / .htm)
              </p>
              <p className="text-xs text-slate-400">
                หรือลากไฟล์รายงานมาวางที่นี่
              </p>
              <input
                type="file"
                accept=".html,.htm"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {/* Header Metrics: Dual Mode Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Box 1: Trader Cash Flow View */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    1. กระแสเงินสดจริงเข้ากระเป๋า (Cash-Flow)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                    ROI +{report.cashROI}%
                  </span>
                </div>
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  +${report.netCashProfit.toLocaleString()} {currency}
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
                  <span>เงินต้นฝากจริง: <b className="text-white">${report.totalDeposits}</b></span>
                  <span>ถอนเงินสดออก: <b className="text-white">${report.totalWithdrawals}</b></span>
                </div>
              </div>

              {/* Box 2: MT5 Trade Performance View */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                    2. ผลงานการเทรดบนกระดาน (Trading PnL)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold">
                    Win Rate {report.winRate}%
                  </span>
                </div>
                <div className="text-2xl font-black text-indigo-300 font-mono">
                  +${report.totalNetProfit.toLocaleString()} {currency}
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800">
                  <span>Gross Win: <b className="text-emerald-400">+${report.grossProfit}</b></span>
                  <span>Gross Loss: <b className="text-rose-400">-${report.grossLoss}</b></span>
                  <span>PF: <b className="text-amber-400">{report.profitFactor}</b></span>
                </div>
              </div>
            </div>

            {/* Account Meta */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <div>
                บัญชี: <b className="text-white">{report.accountNumber || 'XM Global'}</b> ({report.accountName || 'Saranyapong'})
              </div>
              <div>
                พบรายการเทรดทั้งหมด: <b className="text-emerald-400">{report.trades.length} ไม้</b>
              </div>
            </div>

            {/* Strategy Selector */}
            {strategies.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">กลยุทธ์ที่ใช้:</span>
                <select
                  value={selectedStrategyId}
                  onChange={(e) => setSelectedStrategyId(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                >
                  <option value="">-- ไม่ระบุ --</option>
                  {strategies.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Positions Table */}
            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/60">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-900 text-slate-400 font-semibold text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">Ticket</th>
                    <th className="py-2 px-3">คู่เงิน</th>
                    <th className="py-2 px-3">ฝั่ง</th>
                    <th className="py-2 px-3 text-right">Lot</th>
                    <th className="py-2 px-3 text-right">ราคาเข้า &rarr; ปิด</th>
                    <th className="py-2 px-4 text-right">กำไรสุทธิ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {report.trades.map((t, idx) => {
                    const isLong = t.side === 'long';
                    const isWin = t.pnl > 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-900/60">
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-400">#{t.ticket}</td>
                        <td className="py-2 px-3 font-bold text-amber-300 font-mono">{t.asset}</td>
                        <td className="py-2 px-3">
                          <Badge variant={isLong ? 'profit' : 'loss'} size="sm">
                            {isLong ? 'BUY' : 'SELL'}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-300">{t.size}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-300">
                          {t.entry_price} &rarr; <span className="font-bold text-white">{t.exit_price}</span>
                        </td>
                        <td className="py-2 px-4 text-right font-mono font-bold">
                          <span className={isWin ? 'text-emerald-400' : 'text-rose-400'}>
                            {isWin ? '+' : ''}{t.pnl} {currency}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReport(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                &larr; เลือกไฟล์ใหม่
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={onClose}
                  className="text-xs"
                >
                  ยกเลิก
                </Button>
                <Button
                  size="md"
                  onClick={handleSaveAll}
                  isLoading={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  ยืนยันบันทึกทั้ง {report.trades.length} ไม้
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
