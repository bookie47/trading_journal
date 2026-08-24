'use client';

import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  DollarSign, 
  Target, 
  Smile, 
  FileText, 
  Trash2, 
  CheckCircle2, 
  Maximize2,
  Scale
} from 'lucide-react';
import { Trade } from '@/lib/types';
import { useTrading } from '@/lib/context/trading-context';
import { calculatePlannedRR } from '@/lib/calculations';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ImageLightbox } from './ImageLightbox';

interface TradeDetailModalProps {
  isOpen: boolean;
  trade: Trade;
  onClose: () => void;
  onOpenCloseModal?: (trade: Trade) => void;
}

export function TradeDetailModal({
  isOpen,
  trade,
  onClose,
  onOpenCloseModal,
}: TradeDetailModalProps) {
  const { strategies, deleteTrade, activePortfolio } = useTrading();
  const currency = activePortfolio?.currency || 'USD';

  const [lightboxImage, setLightboxImage] = useState<{ url: string; caption?: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isLong = trade.side === 'long';
  const isOpenTrade = trade.status === 'open';
  const isWin = trade.pnl > 0;
  const strat = strategies.find((s) => s.id === trade.strategy_id);

  const planned = calculatePlannedRR(trade.side, trade.entry_price, trade.sl, trade.tp);

  const setupImages = trade.images?.filter((img) => img.type === 'setup') || [];
  const resultImages = trade.images?.filter((img) => img.type === 'result') || [];

  const handleDelete = async () => {
    if (confirm(`คุณต้องการลบออเดอร์ ${trade.asset} นี้ใช่หรือไม่?`)) {
      setIsDeleting(true);
      try {
        await deleteTrade(trade.id);
        onClose();
      } catch (err) {
        console.error('Failed to delete trade:', err);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="2xl"
        title={`รายละเอียดออเดอร์: ${trade.asset}`}
        description={`บันทึกเมื่อ ${new Date(trade.created_at).toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}`}
      >
        <div className="space-y-6">
          {/* Main Status & Outcome Bar */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg ${
                  isLong ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                }`}
              >
                {isLong ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-white tracking-tight">{trade.asset}</span>
                  <Badge variant={isLong ? 'profit' : 'loss'}>{trade.side.toUpperCase()}</Badge>
                  {isOpenTrade ? (
                    <Badge variant="info" pulse>
                      กำลังเปิด (OPEN)
                    </Badge>
                  ) : (
                    <Badge variant={isWin ? 'profit' : 'loss'}>
                      {isWin ? 'WIN' : trade.pnl < 0 ? 'LOSS' : 'BREAKEVEN'}
                    </Badge>
                  )}
                </div>
                {strat && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: strat.color }} />
                    <span className="text-xs text-slate-300 font-medium">{strat.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* PnL or Action */}
            <div className="text-right">
              {isOpenTrade ? (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    onClose();
                    if (onOpenCloseModal) onOpenCloseModal(trade);
                  }}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  ปิดออเดอร์นี้
                </Button>
              ) : (
                <div>
                  <div className={`text-2xl font-bold font-mono ${isWin ? 'text-emerald-400' : trade.pnl < 0 ? 'text-rose-400' : 'text-slate-200'}`}>
                    {isWin ? '+' : ''}{trade.pnl.toLocaleString()} {currency}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    <span>{isWin ? '+' : ''}{trade.pnl_percentage}%</span>
                    {trade.r_multiple ? <span className="ml-1.5 font-bold text-brand-400">({trade.r_multiple > 0 ? '+' : ''}{trade.r_multiple}R)</span> : null}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Numbers Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[11px] font-medium text-slate-400">ราคาเข้า (Entry)</span>
              <div className="text-sm font-bold text-white font-mono mt-1">{trade.entry_price}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[11px] font-medium text-slate-400">Stop Loss (SL)</span>
              <div className="text-sm font-bold text-rose-400 font-mono mt-1">{trade.sl || 'ไม่มี'}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[11px] font-medium text-slate-400">Take Profit (TP)</span>
              <div className="text-sm font-bold text-emerald-400 font-mono mt-1">{trade.tp || 'ไม่มี'}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[11px] font-medium text-slate-400">ราคาออก (Exit)</span>
              <div className="text-sm font-bold text-white font-mono mt-1">{trade.exit_price || 'ยังไม่ปิด'}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[11px] font-medium text-slate-400">ขนาด Position</span>
              <div className="text-sm font-bold text-white font-mono mt-1">{trade.size} lot/unit</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[11px] font-medium text-slate-400">ค่าธรรมเนียม (Fee)</span>
              <div className="text-sm font-bold text-slate-300 font-mono mt-1">${trade.fee || 0}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[11px] font-medium text-slate-400">Planned R:R</span>
              <div className="text-sm font-bold text-brand-300 font-mono mt-1">
                {planned.isValid ? `1 : ${planned.riskRewardRatio}` : 'N/A'}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[11px] font-medium text-slate-400">สภาวะอารมณ์</span>
              <div className="text-xs font-semibold text-slate-200 mt-1">
                {trade.emotion_tag ? <Badge variant="warning">{trade.emotion_tag}</Badge> : '-'}
              </div>
            </div>
          </div>

          {/* Notes & Lessons */}
          {(trade.notes || trade.lessons_learned) && (
            <div className="space-y-3">
              {trade.notes && (
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    <FileText className="w-3.5 h-3.5 text-brand-400" />
                    เหตุผลและบันทึกก่อนเข้าเทรด (Entry Notes)
                  </div>
                  <p className="text-sm text-slate-200 whitespace-pre-wrap">{trade.notes}</p>
                </div>
              )}

              {trade.lessons_learned && (
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    สิ่งที่ได้เรียนรู้หลังปิดเทรด (Lessons Learned)
                  </div>
                  <p className="text-sm text-slate-200 whitespace-pre-wrap">{trade.lessons_learned}</p>
                </div>
              )}
            </div>
          )}

          {/* Screenshot Gallery (Setup vs Result) */}
          {((setupImages.length > 0) || (resultImages.length > 0)) && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                รูปภาพบันทึกกราฟ (Chart Screenshots)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {setupImages.map((img) => (
                  <div
                    key={img.id}
                    className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video cursor-pointer"
                    onClick={() => setLightboxImage({ url: img.image_url, caption: img.caption || 'Setup Screenshot' })}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.image_url} alt="Setup" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                    <div className="absolute top-2 left-2">
                      <Badge variant="brand" size="sm">SETUP CHART</Badge>
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                      <Maximize2 className="w-6 h-6 text-white" />
                    </div>
                  </div>
                ))}

                {resultImages.map((img) => (
                  <div
                    key={img.id}
                    className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video cursor-pointer"
                    onClick={() => setLightboxImage({ url: img.image_url, caption: img.caption || 'Result Screenshot' })}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.image_url} alt="Result" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                    <div className="absolute top-2 left-2">
                      <Badge variant="profit" size="sm">RESULT CHART</Badge>
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                      <Maximize2 className="w-6 h-6 text-white" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <Button
              type="button"
              variant="danger"
              size="sm"
              isLoading={isDeleting}
              onClick={handleDelete}
              className="text-xs"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              ลบออเดอร์นี้
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              ปิดหน้าต่าง
            </Button>
          </div>
        </div>
      </Modal>

      {/* Lightbox for Zoom */}
      {lightboxImage && (
        <ImageLightbox
          isOpen={Boolean(lightboxImage)}
          imageUrl={lightboxImage.url}
          caption={lightboxImage.caption}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </>
  );
}
