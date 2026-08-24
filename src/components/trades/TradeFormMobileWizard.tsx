'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  ChevronRight, 
  ChevronLeft, 
  Camera, 
  Check, 
  Scale, 
  X,
  Target
} from 'lucide-react';
import { Trade, TradeSide, EmotionTag } from '@/lib/types';
import { useTrading } from '@/lib/context/trading-context';
import { calculatePlannedRR } from '@/lib/calculations';
import { TradingRepository } from '@/lib/storage';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';

const POPULAR_ASSETS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSDT', 'ETHUSDT', 'US100', 'NVDA'];

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

export function TradeFormMobileWizard() {
  const router = useRouter();
  const { activePortfolio, strategies, addTrade } = useTrading();
  const currency = activePortfolio?.currency || 'USD';

  const [step, setStep] = useState<number>(1); // 1, 2, 3

  // Form State
  const [asset, setAsset] = useState('XAUUSD');
  const [side, setSide] = useState<TradeSide>('long');
  
  const now = new Date();
  const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const [entryTime, setEntryTime] = useState(localIso);

  const [entryPrice, setEntryPrice] = useState('');
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [size, setSize] = useState('1.0');
  const [fee, setFee] = useState('0.00');

  const [strategyId, setStrategyId] = useState(strategies[0]?.id || '');
  const [emotionTag, setEmotionTag] = useState<EmotionTag>('Disciplined');
  const [notes, setNotes] = useState('');
  const [setupImage, setSetupImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live R:R Calculation
  const numericEntry = parseFloat(entryPrice);
  const numericSl = parseFloat(sl);
  const numericTp = parseFloat(tp);
  const numericSize = parseFloat(size) || 1.0;
  const numericFee = parseFloat(fee) || 0;

  const rrInfo = calculatePlannedRR(side, numericEntry, numericSl, numericTp);

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const tempTradeId = 'temp_' + Date.now();
      const url = await TradingRepository.uploadImage(file, tempTradeId, 'setup');
      setSetupImage(url);
    }
  };

  const handleNextStep = () => {
    if (step === 1 && !asset) return;
    if (step === 2 && (!numericEntry || numericEntry <= 0)) return;
    setStep((prev) => Math.min(prev + 1, 3));
  };

  const handlePrevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!asset || !numericEntry || numericEntry <= 0) return;

    setIsSubmitting(true);
    try {
      const tradeId = 'trade_' + Date.now();
      const images = setupImage
        ? [
            {
              id: 'img_' + Date.now(),
              trade_id: tradeId,
              image_url: setupImage,
              type: 'setup' as const,
              caption: 'Setup Entry Chart',
              uploaded_at: new Date().toISOString(),
            },
          ]
        : [];

      const newTrade: Trade = {
        id: tradeId,
        portfolio_id: activePortfolio?.id || 'portfolio-demo-1',
        asset: asset.toUpperCase().trim(),
        side,
        entry_price: numericEntry,
        sl: numericSl || undefined,
        tp: numericTp || undefined,
        size: numericSize,
        fee: numericFee,
        entry_time: new Date(entryTime).toISOString(),
        strategy_id: strategyId || undefined,
        emotion_tag: emotionTag,
        notes,
        status: 'open',
        pnl: 0,
        pnl_percentage: 0,
        r_multiple: 0,
        images,
        created_at: new Date().toISOString(),
      };

      await addTrade(newTrade);
      router.push('/trades');
    } catch (err) {
      console.error('Failed to create trade on mobile:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="md:hidden space-y-4 pb-20">
      {/* Wizard Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span>ขั้นตอนที่ {step} จาก 3: {step === 1 ? 'เลือกสินทรัพย์' : step === 2 ? 'กรอกตัวเลขราคา' : 'กลยุทธ์และรูปกราฟ'}</span>
          <span className="text-brand-400">{Math.round((step / 3) * 100)}%</span>
        </div>
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
          <div
            className="bg-gradient-to-r from-brand-600 to-indigo-500 h-full transition-all duration-300 rounded-full"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      {/* STEP 1: Asset, Side, Time */}
      {step === 1 && (
        <Card className="p-4 space-y-4 animate-fade-in">
          <div className="space-y-2">
            <Input
              label="สินทรัพย์ (Asset) *"
              placeholder="เช่น XAUUSD, BTCUSDT"
              value={asset}
              onChange={(e) => setAsset(e.target.value.toUpperCase())}
              required
              autoFocus
            />
            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {POPULAR_ASSETS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setAsset(item)}
                  className={`text-xs font-mono px-2.5 py-1 rounded-lg border transition ${
                    asset === item
                      ? 'bg-brand-600/30 border-brand-500 text-brand-300 font-bold'
                      : 'bg-slate-850 border-slate-800 text-slate-400'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              ทิศทาง Position *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSide('long')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
                  side === 'long'
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-lg shadow-emerald-600/30'
                    : 'bg-slate-900 border border-slate-800 text-slate-400'
                }`}
              >
                <ArrowUpRight className="w-5 h-5" />
                <span>LONG (ซื้อ)</span>
              </button>

              <button
                type="button"
                onClick={() => setSide('short')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
                  side === 'short'
                    ? 'bg-rose-600 text-white ring-2 ring-rose-400 shadow-lg shadow-rose-600/30'
                    : 'bg-slate-900 border border-slate-800 text-slate-400'
                }`}
              >
                <ArrowDownRight className="w-5 h-5" />
                <span>SHORT (ขาย)</span>
              </button>
            </div>
          </div>

          <Input
            label="วันเวลาที่เข้า (Entry Time)"
            type="datetime-local"
            value={entryTime}
            onChange={(e) => setEntryTime(e.target.value)}
          />
        </Card>
      )}

      {/* STEP 2: Numbers (Entry, SL, TP, Size) with decimal keypad */}
      {step === 2 && (
        <Card className="p-4 space-y-4 animate-fade-in">
          <Input
            label="ราคาเข้า (Entry Price) *"
            type="number"
            step="any"
            inputMode="decimal"
            placeholder="เช่น 2635.50"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Stop Loss (SL)"
              type="number"
              step="any"
              inputMode="decimal"
              placeholder="SL"
              value={sl}
              onChange={(e) => setSl(e.target.value)}
            />
            <Input
              label="Take Profit (TP)"
              type="number"
              step="any"
              inputMode="decimal"
              placeholder="TP"
              value={tp}
              onChange={(e) => setTp(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="ขนาด Position (Lot/Units) *"
              type="number"
              step="any"
              inputMode="decimal"
              placeholder="1.0"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              required
            />
            <Input
              label="ค่าธรรมเนียม (Fee)"
              type="number"
              step="any"
              inputMode="decimal"
              placeholder="0.00"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
            />
          </div>

          {/* R:R Preview Box */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-brand-400" /> Planned Risk:Reward
              </span>
              <span className="font-bold text-white font-mono">
                {rrInfo.isValid ? `1 : ${rrInfo.riskRewardRatio}` : 'ระบุ SL & TP'}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* STEP 3: Strategy, Screenshot & Notes */}
      {step === 3 && (
        <Card className="p-4 space-y-4 animate-fade-in">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              กลยุทธ์การเทรด (Strategy)
            </label>
            <select
              value={strategyId}
              onChange={(e) => setStrategyId(e.target.value)}
              className="block w-full rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 py-2.5 px-3.5"
            >
              <option value="">-- ไม่ระบุกลยุทธ์ --</option>
              {strategies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              สภาวะอารมณ์ (Emotion)
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

          {/* Camera Capture or Image Upload */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              แนบรูป Setup กราฟ
            </label>
            {setupImage ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-700 aspect-video">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={setupImage} alt="Setup" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setSetupImage(null)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/80 text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 p-3.5 rounded-xl border border-dashed border-slate-700 bg-slate-900/60 hover:bg-slate-900 cursor-pointer transition text-xs font-medium text-slate-300">
                <Camera className="w-4 h-4 text-brand-400" />
                <span>ถ่ายรูปกราฟ / เลือกจากคลังภาพ</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageCapture}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              เหตุผลการเข้าเทรด (Notes)
            </label>
            <textarea
              rows={3}
              placeholder="ระบุเหตุผลการเข้าเทรดย่อ ๆ..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="block w-full rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </Card>
      )}

      {/* Navigation Controls */}
      <div className="flex items-center gap-3 pt-2">
        {step > 1 ? (
          <Button
            type="button"
            variant="secondary"
            className="flex-1 py-3"
            onClick={handlePrevStep}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            ย้อนกลับ
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="flex-1 py-3 text-slate-400"
            onClick={() => router.back()}
          >
            ยกเลิก
          </Button>
        )}

        {step < 3 ? (
          <Button
            type="button"
            variant="primary"
            className="flex-1 py-3"
            onClick={handleNextStep}
          >
            ถัดไป
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            className="flex-1 py-3 bg-brand-600 hover:bg-brand-500 shadow-lg shadow-brand-500/30"
            isLoading={isSubmitting}
            onClick={handleSubmit}
          >
            <Check className="w-4 h-4 mr-1" />
            บันทึกเปิดออเดอร์
          </Button>
        )}
      </div>
    </div>
  );
}
