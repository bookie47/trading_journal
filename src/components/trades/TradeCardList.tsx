'use client';

import React from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  Image as ImageIcon, 
  ChevronRight,
  Clock
} from 'lucide-react';
import { Trade } from '@/lib/types';
import { useTrading } from '@/lib/context/trading-context';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface TradeCardListProps {
  trades: Trade[];
  onSelectTrade: (trade: Trade) => void;
  onOpenCloseModal: (trade: Trade) => void;
}

export function TradeCardList({ trades, onSelectTrade, onOpenCloseModal }: TradeCardListProps) {
  const { strategies, activePortfolio } = useTrading();
  const currency = activePortfolio?.currency || 'USD';

  if (trades.length === 0) {
    return (
      <div className="md:hidden text-center py-12 bg-slate-950/60 rounded-2xl border border-slate-800 p-6">
        <p className="text-sm text-slate-400">ไม่พบรายการเทรดตามเงื่อนไขที่เลือก</p>
      </div>
    );
  }

  return (
    <div className="md:hidden space-y-3 pb-20">
      {trades.map((trade) => {
        const isLong = trade.side === 'long';
        const isOpen = trade.status === 'open';
        const isWin = trade.pnl > 0;
        const isLoss = trade.pnl < 0;
        const strat = strategies.find((s) => s.id === trade.strategy_id);

        return (
          <div
            key={trade.id}
            onClick={() => onSelectTrade(trade)}
            className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/90 shadow-md active:bg-slate-850 transition duration-150 space-y-3"
          >
            {/* Top Bar: Asset, Side, Status, Date */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                    isLong ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                  }`}
                >
                  {isLong ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-bold text-white font-mono">{trade.asset}</span>
                    <Badge variant={isLong ? 'profit' : 'loss'} size="sm">
                      {trade.side.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(trade.entry_time).toLocaleDateString('th-TH', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>

              {/* Status or PnL */}
              <div className="text-right">
                {isOpen ? (
                  <Badge variant="info" size="sm" pulse>
                    กำลังเปิด
                  </Badge>
                ) : (
                  <div>
                    <div className={`text-base font-bold font-mono ${isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-slate-300'}`}>
                      {isWin ? '+' : ''}{trade.pnl.toLocaleString()} {currency}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {trade.r_multiple ? `${trade.r_multiple > 0 ? '+' : ''}${trade.r_multiple}R` : `${trade.pnl_percentage}%`}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Middle: Entry, Exit/TP/SL, Size */}
            <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-slate-950/60 text-xs font-mono border border-slate-800/60">
              <div>
                <span className="text-[10px] text-slate-500 block">Entry</span>
                <span className="font-semibold text-slate-200">{trade.entry_price}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">SL / TP</span>
                <span className="text-rose-400 text-[11px]">{trade.sl || '-'}</span>
                <span className="text-slate-500 mx-1">/</span>
                <span className="text-emerald-400 text-[11px]">{trade.tp || '-'}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block">Size</span>
                <span className="font-semibold text-slate-300">{trade.size} lot</span>
              </div>
            </div>

            {/* Bottom Row: Strategy, Emotion, Action */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <div className="flex items-center gap-2 max-w-[65%] truncate">
                {strat && (
                  <span className="flex items-center gap-1 text-[11px] text-slate-300 truncate">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: strat.color }} />
                    <span className="truncate">{strat.name}</span>
                  </span>
                )}
                {trade.emotion_tag && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60 shrink-0">
                    {trade.emotion_tag}
                  </span>
                )}
                {trade.images && trade.images.length > 0 && (
                  <span className="text-indigo-400 flex items-center gap-0.5 text-[10px]">
                    <ImageIcon className="w-3 h-3" /> {trade.images.length}
                  </span>
                )}
              </div>

              {isOpen ? (
                <Button
                  size="sm"
                  variant="primary"
                  className="text-xs py-1 px-3 bg-indigo-600 hover:bg-indigo-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenCloseModal(trade);
                  }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  ปิดออเดอร์
                </Button>
              ) : (
                <div className="text-slate-500 text-xs flex items-center">
                  รายละเอียด <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
