'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, DollarSign, Camera, Image as ImageIcon, Sparkles, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { Trade, EmotionTag } from '@/lib/types';
import { useTrading } from '@/lib/context/trading-context';
import { calculatePnL, calculateRMultiple } from '@/lib/calculations';
import { TradingRepository } from '@/lib/storage';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

const EMOTION_TAGS: EmotionTag[] = [
  'Disciplined',
  'Patient',
  'Confident',
  'FOMO',
  'Revenge',
  'Greedy',
  'Fearful',
  'Hesitant',
  'Overleveraged',
  'Impulsive',
];

interface CloseTradeModalProps {
  isOpen: boolean;
  trade: Trade;
  onClose: () => void;
}

export function CloseTradeModal({ isOpen, trade, onClose }: CloseTradeModalProps) {
  const { closeTrade, activePortfolio } = useTrading();
  const currency = activePortfolio?.currency || 'USD';

  const [exitPrice, setExitPrice] = useState<string>('');
  const [exitTime, setExitTime] = useState<string>('');
  const [additionalFee, setAdditionalFee] = useState<string>('0');
  const [emotionTag, setEmotionTag] = useState<EmotionTag>('Disciplined');
  const [lessonsLearned, setLessonsLearned] = useState<string>('');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setExitPrice(trade.exit_price ? String(trade.exit_price) : '');
      const now = new Date();
      const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setExitTime(trade.exit_time ? trade.exit_time.slice(0, 16) : localIso);
      setEmotionTag(trade.emotion_tag || 'Disciplined');
      setLessonsLearned(trade.lessons_learned || '');
    }
  }, [isOpen, trade]);

  // Live PnL calculation
  const numericExit = parseFloat(exitPrice);
  const numericFee = parseFloat(additionalFee) || 0;
  const isExitValid = !isNaN(numericExit) && numericExit > 0;

  const pnlPreview = isExitValid
    ? calculatePnL(trade.side, trade.entry_price, numericExit, trade.size, (trade.fee || 0) + numericFee, trade.asset)
    : { pnl: 0, pnlPercentage: 0, rMultiple: 0 };

  const rMultiplePreview = isExitValid && trade.sl
    ? calculateRMultiple(trade.side, trade.entry_price, numericExit, trade.sl)
    : 0;

  const isWin = pnlPreview.pnl > 0;

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const url = await TradingRepository.uploadImage(file, trade.id, 'result');
        setResultImage(url);
      } catch (err) {
        console.error('Image upload failed:', err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isExitValid) return;

    setIsSubmitting(true);
    try {
      await closeTrade(
        trade.id,
        numericExit,
        new Date(exitTime).toISOString(),
        numericFee,
        emotionTag,
        lessonsLearned,
        resultImage || undefined
      );
      onClose();
    } catch (err) {
      console.error('Failed to close trade:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`ปิดออเดอร์: ${trade.asset} (${trade.side.toUpperCase()})`}
      description={`ราคาเข้า: ${trade.entry_price} | ขนาด: ${trade.size} lot`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Live Calculation Preview Banner */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            !isExitValid
              ? 'bg-slate-950/60 border-slate-800 text-slate-400'
              : isWin
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {isExitValid ? (isWin ? 'ผลกำไรที่คาดการณ์' : 'ผลขาดทุนที่คาดการณ์') : 'กรอกราคาปิดเพื่อคำนวณกำไร/ขาดทุน'}
            </span>
            {isExitValid && (
              <Badge variant={isWin ? 'profit' : 'loss'} size="sm">
                {isWin ? 'WIN' : 'LOSS'}
              </Badge>
            )}
          </div>
          {isExitValid && (
            <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-slate-800/40">
              <div className="text-2xl font-bold font-mono">
                {isWin ? '+' : ''}{pnlPreview.pnl.toLocaleString()} {currency}
              </div>
              <div className="text-xs font-mono">
                <span>{isWin ? '+' : ''}{pnlPreview.pnlPercentage}%</span>
                {trade.sl && <span className="ml-2 font-bold text-brand-300">({rMultiplePreview > 0 ? '+' : ''}{rMultiplePreview}R)</span>}
              </div>
            </div>
          )}
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="ราคาปิดออเดอร์ (Exit Price) *"
            type="number"
            step="any"
            inputMode="decimal"
            placeholder={trade.tp ? String(trade.tp) : "เช่น 2650.50"}
            value={exitPrice}
            onChange={(e) => setExitPrice(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="วันเวลาที่ปิด (Exit Time)"
            type="datetime-local"
            value={exitTime}
            onChange={(e) => setExitTime(e.target.value)}
            required
          />

          <Input
            label="ค่าธรรมเนียมเพิ่มเติม (Fee)"
            type="number"
            step="any"
            inputMode="decimal"
            placeholder="0.00"
            value={additionalFee}
            onChange={(e) => setAdditionalFee(e.target.value)}
          />

          <div className="w-full space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              สภาวะอารมณ์ (Emotion Tag)
            </label>
            <select
              value={emotionTag}
              onChange={(e) => setEmotionTag(e.target.value as EmotionTag)}
              className="block w-full rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 py-2.5 px-3.5"
            >
              {EMOTION_TAGS.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Lessons Learned */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
            สิ่งที่ได้เรียนรู้จากไม้นี้ (Lessons Learned / Review)
          </label>
          <textarea
            rows={3}
            placeholder="เช่น ปิดตามแผน SL/TP ได้ดี หรือ มีอาการคันมือรีบปิดกำไรก่อนถึงเป้า..."
            value={lessonsLearned}
            onChange={(e) => setLessonsLearned(e.target.value)}
            className="block w-full rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm placeholder-slate-500 p-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Upload Result Image */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
            แนบรูปภาพผลลัพธ์หลังปิดเทรด (Result Screenshot)
          </label>
          <div className="flex items-center gap-3">
            <label className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-slate-700 bg-slate-900/50 hover:bg-slate-900 hover:border-brand-500/50 cursor-pointer transition text-xs text-slate-300">
              <Camera className="w-4 h-4 text-brand-400" />
              <span>{resultImage ? 'เปลี่ยนรูปภาพผลลัพธ์' : 'ถ่ายรูป / เลือกรูปภาพผลลัพธ์'}</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
            {resultImage && (
              <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-700 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resultImage} alt="Result" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            ยกเลิก
          </Button>
          <Button
            type="submit"
            variant="success"
            isLoading={isSubmitting}
            disabled={!isExitValid}
            className="px-6"
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            บันทึกและปิดออเดอร์
          </Button>
        </div>
      </form>
    </Modal>
  );
}
