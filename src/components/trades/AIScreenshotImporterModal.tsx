'use client';

import React, { useState, useRef } from 'react';
import { 
  Camera, 
  UploadCloud, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Key, 
  ArrowUpRight, 
  ArrowDownRight, 
  Layers, 
  X, 
  Loader2,
  CheckSquare,
  Square,
  ShieldCheck
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useTrading } from '@/lib/context/trading-context';
import { ParsedTradeCandidate, Trade, TradeSide } from '@/lib/types';
import { calculateRMultiple } from '@/lib/calculations';

interface AIScreenshotImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function compressImage(file: File, maxDim = 1200, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(img.src);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function AIScreenshotImporterModal({ isOpen, onClose }: AIScreenshotImporterModalProps) {
  const { strategies, activePortfolio, addTrade } = useTrading();
  const currency = activePortfolio?.currency || 'USD';

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{
    totalParsed: number;
    newCount: number;
    duplicateCount: number;
    trades: (ParsedTradeCandidate & { selected: boolean })[];
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    const combinedFiles = [...selectedFiles, ...newFiles];
    setSelectedFiles(combinedFiles);

    // Generate previews
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
    setErrorMsg('');
  };

  const handleRemoveImage = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleStartScan = async () => {
    if (selectedFiles.length === 0) {
      setErrorMsg('กรุณาเลือกรูปภาพอย่างน้อย 1 รูป');
      return;
    }

    setIsScanning(true);
    setErrorMsg('');
    setScanResult(null);

    try {
      // Compress and convert all files to optimized base64
      const base64List: string[] = await Promise.all(
        selectedFiles.map(file => compressImage(file))
      );

      const localKey = typeof window !== 'undefined' ? localStorage.getItem('trading_journal_gemini_key') || '' : '';

      const res = await fetch('/api/ai/parse-trade-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: base64List,
          apiKey: localKey || undefined,
          portfolioId: activePortfolio?.id,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการสแกนรูปภาพ');
      }

      setScanResult({
        totalParsed: data.totalParsed,
        newCount: data.newCount,
        duplicateCount: data.duplicateCount,
        trades: data.trades.map((t: ParsedTradeCandidate) => ({
          ...t,
          selected: !t.isDuplicate, // Auto-select only new non-duplicate trades
        })),
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'ไม่สามารถสแกนรูปภาพได้ โปรดตรวจสอบการเชื่อมต่อหรือลองใหม่อีกครั้ง');
    } finally {
      setIsScanning(false);
    }
  };

  const handleToggleSelectAll = (select: boolean) => {
    if (!scanResult) return;
    setScanResult({
      ...scanResult,
      trades: scanResult.trades.map(t => ({
        ...t,
        selected: select,
      })),
    });
  };

  const handleToggleItem = (index: number) => {
    if (!scanResult) return;
    const updated = [...scanResult.trades];
    updated[index].selected = !updated[index].selected;
    setScanResult({ ...scanResult, trades: updated });
  };

  const handleConfirmImport = async () => {
    if (!scanResult) return;
    const tradesToSave = scanResult.trades.filter(t => t.selected);
    if (tradesToSave.length === 0) {
      alert('กรุณาเลือกอย่างน้อย 1 ไม้เพื่อบันทึก');
      return;
    }

    setIsSaving(true);
    try {
      for (const t of tradesToSave) {
        const tradeId = t.ticket ? `mt5_${t.ticket}` : `ai_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const rMultiple = t.sl ? calculateRMultiple(t.side, t.entry_price, t.exit_price || t.entry_price, t.sl) : 0;

        const newTrade: Trade = {
          id: tradeId,
          portfolio_id: activePortfolio?.id || 'portfolio-demo-1',
          ticket: t.ticket,
          asset: t.asset,
          side: t.side,
          size: t.size,
          entry_price: t.entry_price,
          exit_price: t.exit_price || t.entry_price,
          sl: t.sl,
          tp: t.tp,
          fee: t.fee || 0,
          entry_time: t.entry_time,
          exit_time: t.exit_time || t.entry_time,
          strategy_id: selectedStrategyId || undefined,
          status: 'closed',
          pnl: t.pnl,
          pnl_percentage: t.pnl_percentage || 0,
          r_multiple: rMultiple,
          notes: t.notes || 'Imported via AI Multi-Screenshot OCR',
          created_at: new Date().toISOString(),
        };

        await addTrade(newTrade);
      }

      alert(`บันทึกประวัติการเทรดสำเร็จ ${tradesToSave.length} ไม้เรียบร้อยแล้ว!`);
      handleReset();
      onClose();
    } catch (err: any) {
      console.error('Error saving imported trades:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSelectedFiles([]);
    setPreviews([]);
    setScanResult(null);
    setErrorMsg('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        handleReset();
        onClose();
      }}
      title="📸 นำเข้าประวัติการเทรดด้วย AI (Multi-Screenshot OCR)"
      maxWidth="4xl"
    >
      <div className="space-y-5 py-2">
        {/* Step 1: Upload Dropzone (if not scanned yet) */}
        {!scanResult && (
          <>
            <div className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-xs text-brand-300 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white text-sm mb-1">
                  สแกนรูปประวัติ MT5 หลายรูปพร้อมกัน + ตรวจจับออเดอร์ซ้ำอัตโนมัติ
                </p>
                <p className="text-slate-300 leading-relaxed">
                  คุณสามารถเลือกภาพสกรีนช็อตหน้า History ใน MT5 ได้หลายๆ รูปพร้อมกัน ระบบ AI จะถอดตารางออกมาเป็นรายการเทรดจริง และป้องกันการนำเข้าออเดอร์ซ้ำให้อัตโนมัติ 100%
                </p>
              </div>
            </div>

            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-brand-500/80 rounded-2xl p-8 text-center cursor-pointer transition-all bg-slate-900/40 hover:bg-slate-900/80 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
              <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-7 h-7 text-brand-400" />
              </div>
              <p className="text-sm font-semibold text-white">
                คลิกเพื่อเลือกรูปสกรีนช็อตประวัติ MT5 (เลือกได้หลายรูป)
              </p>
              <p className="text-xs text-slate-400 mt-1">
                รองรับไฟล์ PNG, JPG, JPEG จากทั้งมือถือและคอมพิวเตอร์
              </p>
            </div>

            {/* Selected Images Preview Grid */}
            {previews.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300">
                    รูปภาพที่เลือก ({previews.length} รูป):
                  </span>
                  <button
                    onClick={handleReset}
                    className="text-xs text-rose-400 hover:underline"
                  >
                    ล้างทั้งหมด
                  </button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {previews.map((src, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-900 aspect-[3/4]">
                      <img src={src} alt="preview" className="w-full h-full object-cover" />
                      <button
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-slate-950/80 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-slate-950/80 text-[10px] text-slate-300 font-mono">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* Optional Gemini API Key Box */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
              <div className="flex items-center justify-between text-slate-300 font-medium mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>Google Gemini API Key:</span>
                </div>
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-brand-400 hover:underline text-[11px]"
                >
                  รับคีย์ฟรี &rarr;
                </a>
              </div>
              <input
                type="password"
                placeholder="AIzaSy... (วางคีย์ตรงนี้ หรือใส่ใน Vercel Settings)"
                defaultValue={typeof window !== 'undefined' ? localStorage.getItem('trading_journal_gemini_key') || '' : ''}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  if (typeof window !== 'undefined') {
                    if (val) localStorage.setItem('trading_journal_gemini_key', val);
                    else localStorage.removeItem('trading_journal_gemini_key');
                  }
                }}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="break-all">{errorMsg}</span>
              </div>
            )}

            {/* Action Button */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={onClose}>
                ยกเลิก
              </Button>
              <Button
                onClick={handleStartScan}
                disabled={selectedFiles.length === 0 || isScanning}
                className="bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    กำลังสแกนรูปภาพด้วย AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    เริ่มสแกนด้วย AI ({selectedFiles.length} รูป)
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Step 2: Review Scan Results & Deduplication Table */}
        {scanResult && (
          <div className="space-y-4">
            {/* Stats Summary Banner */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
                <div className="text-xs text-slate-400 mb-0.5">พบทั้งหมดในภาพ</div>
                <div className="text-xl font-black text-white">{scanResult.totalParsed} ไม้</div>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                <div className="text-xs text-emerald-400 mb-0.5">✨ ไม้ใหม่ที่จะนำเข้า</div>
                <div className="text-xl font-black text-emerald-400">{scanResult.newCount} ไม้</div>
              </div>
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
                <div className="text-xs text-amber-400 mb-0.5">🛡️ ตรวจพบซ้ำ (ข้ามให้)</div>
                <div className="text-xl font-black text-amber-400">{scanResult.duplicateCount} ไม้</div>
              </div>
            </div>

            {/* Batch Strategy Assign */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-400" />
                <span className="font-semibold text-slate-200">ระบุกลยุทธ์ที่ใช้ (ไม่บังคับ):</span>
                <select
                  value={selectedStrategyId}
                  onChange={(e) => setSelectedStrategyId(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 text-xs"
                >
                  <option value="">-- ไม่ระบุ --</option>
                  {strategies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleSelectAll(true)}
                  className="text-brand-400 hover:underline"
                >
                  เลือกทั้งหมด
                </button>
                <span className="text-slate-600">•</span>
                <button
                  onClick={() => handleToggleSelectAll(false)}
                  className="text-slate-400 hover:underline"
                >
                  ยกเลิกเลือก
                </button>
              </div>
            </div>

            {/* Trades List Table */}
            <div className="max-h-[340px] overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/60">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-900 text-slate-400 font-semibold text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">เลือก</th>
                    <th className="py-2.5 px-3">สถานะ</th>
                    <th className="py-2.5 px-3">Ticket / เวลา</th>
                    <th className="py-2.5 px-3">คู่เงิน</th>
                    <th className="py-2.5 px-3">ฝั่ง</th>
                    <th className="py-2.5 px-3 text-right">Lot</th>
                    <th className="py-2.5 px-3 text-right">ราคาเข้า &rarr; ปิด</th>
                    <th className="py-2.5 px-4 text-right">กำไรสุทธิ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {scanResult.trades.map((trade, idx) => {
                    const isLong = trade.side === 'long';
                    const isWin = trade.pnl > 0;
                    const isLoss = trade.pnl < 0;

                    return (
                      <tr
                        key={idx}
                        onClick={() => handleToggleItem(idx)}
                        className={`cursor-pointer transition-colors ${
                          trade.selected
                            ? 'bg-slate-900/60 hover:bg-slate-900'
                            : 'opacity-50 bg-slate-950/40 hover:opacity-75'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={trade.selected}
                            onChange={() => handleToggleItem(idx)}
                            className="rounded bg-slate-900 border-slate-700 text-brand-500 focus:ring-0 cursor-pointer"
                          />
                        </td>

                        {/* Status Badge */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {trade.isDuplicate ? (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                              <ShieldCheck className="w-3 h-3" />
                              ซ้ำ (ข้าม)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                              <CheckCircle2 className="w-3 h-3" />
                              ไม้ใหม่
                            </span>
                          )}
                        </td>

                        {/* Ticket & Time */}
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px]">
                          <div className="text-slate-300">
                            {trade.ticket ? `#${trade.ticket}` : `Img #${trade.sourceImageIndex || 1}`}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {new Date(trade.entry_time).toLocaleDateString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        {/* Symbol */}
                        <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                          <span className="font-mono text-amber-300/90">{trade.asset}</span>
                        </td>

                        {/* Side */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <Badge variant={isLong ? 'profit' : 'loss'} size="sm">
                            {isLong ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                            {isLong ? 'BUY' : 'SELL'}
                          </Badge>
                        </td>

                        {/* Lot */}
                        <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                          {trade.size}
                        </td>

                        {/* Entry -> Exit Price */}
                        <td className="py-2.5 px-3 text-right font-mono text-slate-300 whitespace-nowrap">
                          <span>{trade.entry_price}</span> &rarr; <span className="font-bold text-white">{trade.exit_price || '-'}</span>
                        </td>

                        {/* Net Profit */}
                        <td className="py-2.5 px-4 text-right font-mono whitespace-nowrap">
                          <span className={`font-bold ${isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-slate-300'}`}>
                            {isWin ? '+' : ''}{trade.pnl.toLocaleString()} {currency}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleReset}
              >
                &larr; สแกนรูปชุดใหม่
              </Button>

              <div className="flex gap-3">
                <Button variant="secondary" onClick={onClose}>
                  ยกเลิก
                </Button>
                <Button
                  onClick={handleConfirmImport}
                  disabled={isSaving || scanResult.trades.filter(t => t.selected).length === 0}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      กำลังบันทึกข้อมูล...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      ยืนยันบันทึก {scanResult.trades.filter(t => t.selected).length} ไม้
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
