'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  UploadCloud, 
  Camera, 
  Check, 
  Sparkles, 
  Scale, 
  Shield, 
  Target,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { Trade, TradeSide, EmotionTag } from '@/lib/types';
import { useTrading } from '@/lib/context/trading-context';
import { calculatePlannedRR } from '@/lib/calculations';
import { TradingRepository } from '@/lib/storage';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

const POPULAR_ASSETS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSDT', 'ETHUSDT', 'US100', 'US30', 'NVDA', 'TSLA'];

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

export function TradeFormDesktop() {
  const router = useRouter();
  const { activePortfolio, strategies, addTrade } = useTrading();
  const currency = activePortfolio?.currency || 'USD';

  const [asset, setAsset] = useState('XAUUSD');
  const [side, setSide] = useState<TradeSide>('long');
  const [entryPrice, setEntryPrice] = useState('');
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [size, setSize] = useState('1.0');
  const [fee, setFee] = useState('0.00');
  
  const now = new Date();
  const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const [entryTime, setEntryTime] = useState(localIso);
  
  const [strategyId, setStrategyId] = useState(strategies[0]?.id || '');
  const [emotionTag, setEmotionTag] = useState<EmotionTag>('Disciplined');
  const [notes, setNotes] = useState('');
  const [setupImage, setSetupImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live Risk:Reward calculation
  const numericEntry = parseFloat(entryPrice);
  const numericSl = parseFloat(sl);
  const numericTp = parseFloat(tp);
  const numericSize = parseFloat(size) || 1.0;
  const numericFee = parseFloat(fee) || 0;

  const rrInfo = calculatePlannedRR(side, numericEntry, numericSl, numericTp);

  const riskInCurrency = rrInfo.isValid
    ? Number((rrInfo.riskAmount * numericSize).toFixed(2))
    : 0;
  const rewardInCurrency = rrInfo.isValid
    ? Number((rrInfo.rewardAmount * numericSize).toFixed(2))
    : 0;

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const tempTradeId = 'temp_' + Date.now();
      const url = await TradingRepository.uploadImage(file, tempTradeId, 'setup');
      setSetupImage(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      console.error('Failed to create trade:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="hidden md:block space-y-6">
      <div className="grid grid-cols-12 gap-6">
        {/* Column 1: Core Trade Setup (5 cols) */}
        <div className="col-span-5 space-y-5">
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-500" />
              1. ข้อมูลสินทรัพย์และทิศทาง
            </h3>

            {/* Asset Selector + Autocomplete chips */}
            <div className="space-y-2">
              <Input
                label="ชื่อสินทรัพย์ (Asset / Ticker) *"
                placeholder="เช่น XAUUSD, BTCUSDT, NVDA"
                value={asset}
                onChange={(e) => setAsset(e.target.value.toUpperCase())}
                required
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {POPULAR_ASSETS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setAsset(item)}
                    className={`text-[11px] font-mono px-2 py-0.5 rounded-md border transition ${
                      asset === item
                        ? 'bg-brand-600/30 border-brand-500 text-brand-300 font-bold'
                        : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Side Long / Short Toggle */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                ทิศทางออเดอร์ (Position Side) *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSide('long')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
                    side === 'long'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-500'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
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
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 ring-2 ring-rose-500'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ArrowDownRight className="w-5 h-5" />
                  <span>SHORT (ขาย)</span>
                </button>
              </div>
            </div>

            {/* Entry Time */}
            <Input
              label="วันเวลาที่เข้าเทรด (Entry Time) *"
              type="datetime-local"
              value={entryTime}
              onChange={(e) => setEntryTime(e.target.value)}
              required
            />
          </Card>

          {/* Strategy & Context */}
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              2. กลยุทธ์และสภาวะอารมณ์
            </h3>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                กลยุทธ์การเทรด (Strategy Tag)
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
                สภาวะจิตใจ/อารมณ์ตอนเข้าเทรด (Emotion)
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
          </Card>
        </div>

        {/* Column 2: Pricing & Sizing (4 cols) */}
        <div className="col-span-4 space-y-5">
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              3. ราคาและขนาด Position
            </h3>

            <Input
              label="ราคาเข้า (Entry Price) *"
              type="number"
              step="any"
              placeholder="เช่น 2635.50"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Stop Loss (SL)"
                type="number"
                step="any"
                placeholder="เช่น 2628.00"
                value={sl}
                onChange={(e) => setSl(e.target.value)}
              />
              <Input
                label="Take Profit (TP)"
                type="number"
                step="any"
                placeholder="เช่น 2658.00"
                value={tp}
                onChange={(e) => setTp(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="ขนาด Lot / Units *"
                type="number"
                step="any"
                placeholder="1.0"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                required
              />
              <Input
                label="ค่าธรรมเนียม (Fee)"
                type="number"
                step="any"
                placeholder="0.00"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
              />
            </div>
          </Card>

          {/* Live Risk / Reward Card */}
          <Card className="p-5 bg-gradient-to-br from-slate-900 to-indigo-950/40 border-indigo-800/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-brand-400" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Risk : Reward Preview
                </span>
              </div>
              {rrInfo.isValid && (
                <Badge variant={rrInfo.riskRewardRatio >= 2 ? 'profit' : 'warning'} size="sm">
                  {rrInfo.riskRewardRatio >= 2 ? 'R:R ยอดเยี่ยม' : 'R:R ปานกลาง'}
                </Badge>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-400">อัตราส่วน R:R</span>
                <span className="text-2xl font-bold font-mono text-white">
                  {rrInfo.isValid ? `1 : ${rrInfo.riskRewardRatio}` : 'ระบุ SL & TP'}
                </span>
              </div>

              {rrInfo.isValid && (
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800/50 text-xs">
                  <div>
                    <span className="text-slate-400">เสี่ยงขาดทุน (Risk)</span>
                    <p className="font-mono font-bold text-rose-400">
                      -${riskInCurrency.toLocaleString()} {currency}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400">เป้ากำไร (Reward)</span>
                    <p className="font-mono font-bold text-emerald-400">
                      +${rewardInCurrency.toLocaleString()} {currency}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Column 3: Screenshot & Reason Notes (3 cols) */}
        <div className="col-span-3 space-y-5">
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              4. แนบรูปและเหตุผล
            </h3>

            {/* Screenshot Upload Drag & Drop */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                รูปภาพ Setup กราฟ
              </label>

              {setupImage ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-700 group aspect-video">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={setupImage} alt="Setup preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setSetupImage(null)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-rose-600 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/40 hover:bg-slate-900/80 hover:border-brand-500/50 cursor-pointer transition text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-brand-400">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-300">คลิกเพื่ออัปโหลด หรือลากไฟล์มาวาง</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">PNG, JPG, WebP</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                เหตุผลการเข้าเทรด (Entry Notes)
              </label>
              <textarea
                rows={5}
                placeholder="ระบุเหตุผล แนวรับแนวต้าน อินดิเคเตอร์ ข่าว หรือสัญญาณคอนเฟิร์ม..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="block w-full rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm placeholder-slate-500 p-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </Card>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          ยกเลิก
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          className="px-8 text-base shadow-brand-500/30"
        >
          <Check className="w-5 h-5 mr-2" />
          บันทึกเปิดออเดอร์ (Open Trade)
        </Button>
      </div>
    </form>
  );
}
