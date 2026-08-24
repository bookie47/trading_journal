'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { History, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import { useTrading } from '@/lib/context/trading-context';
import { Trade } from '@/lib/types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CloseTradeModal } from '../trades/CloseTradeModal';
import { TradeDetailModal } from '../trades/TradeDetailModal';

export function RecentTrades() {
  const { trades, strategies, activePortfolio } = useTrading();
  const currency = activePortfolio?.currency || 'USD';

  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [closingTrade, setClosingTrade] = useState<Trade | null>(null);

  const recentList = trades.slice(0, 5);

  return (
    <>
      <Card className="p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-brand-400" />
            <h3 className="text-base font-bold text-white">ออเดอร์ล่าสุด</h3>
          </div>
          <Link
            href="/trades"
            className="text-xs font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1 transition"
          >
            ดูทั้งหมด ({trades.length}) <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentList.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-xs text-slate-500">ยังไม่มีบันทึกการเทรด</p>
            <Link href="/trades/new" className="inline-block mt-3">
              <Button size="sm">+ บันทึกเทรดแรกของคุณ</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentList.map((trade) => {
              const isLong = trade.side === 'long';
              const isOpen = trade.status === 'open';
              const isWin = trade.pnl > 0;
              const strat = strategies.find((s) => s.id === trade.strategy_id);

              return (
                <div
                  key={trade.id}
                  onClick={() => setSelectedTrade(trade)}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 flex items-center justify-between gap-3 cursor-pointer transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isLong ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {isLong ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white tracking-tight">{trade.asset}</span>
                        <Badge variant={isLong ? 'profit' : 'loss'} size="sm">
                          {trade.side.toUpperCase()}
                        </Badge>
                        {isOpen && (
                          <Badge variant="info" size="sm" pulse>
                            กำลังเปิด
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 truncate">
                        <span>{new Date(trade.entry_time).toLocaleDateString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        {strat && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[120px]" style={{ color: strat.color }}>{strat.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Side: PnL or Action */}
                  <div className="flex items-center gap-3 shrink-0">
                    {isOpen ? (
                      <Button
                        size="sm"
                        variant="primary"
                        className="text-xs py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          setClosingTrade(trade);
                        }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        ปิดออเดอร์
                      </Button>
                    ) : (
                      <div className="text-right font-mono">
                        <div className={`text-sm font-bold ${isWin ? 'text-emerald-400' : trade.pnl < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                          {isWin ? '+' : ''}{trade.pnl.toLocaleString()} {currency}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {trade.r_multiple ? `${trade.r_multiple > 0 ? '+' : ''}${trade.r_multiple}R` : `${trade.pnl_percentage}%`}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Close Trade Modal */}
      {closingTrade && (
        <CloseTradeModal
          isOpen={Boolean(closingTrade)}
          trade={closingTrade}
          onClose={() => setClosingTrade(null)}
        />
      )}

      {/* Trade Detail Modal */}
      {selectedTrade && (
        <TradeDetailModal
          isOpen={Boolean(selectedTrade)}
          trade={selectedTrade}
          onClose={() => setSelectedTrade(null)}
          onOpenCloseModal={(t) => {
            setSelectedTrade(null);
            setClosingTrade(t);
          }}
        />
      )}
    </>
  );
}
