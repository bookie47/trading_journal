'use client';

import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  ArrowUpDown, 
  CheckCircle2, 
  Eye, 
  Trash2, 
  Image as ImageIcon,
  Camera,
  Activity
} from 'lucide-react';
import { Trade } from '@/lib/types';
import { useTrading } from '@/lib/context/trading-context';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface TradeTableProps {
  trades: Trade[];
  onSelectTrade: (trade: Trade) => void;
  onOpenCloseModal: (trade: Trade) => void;
}

type SortField = 'entry_time' | 'asset' | 'side' | 'pnl' | 'size' | 'r_multiple' | 'ticket';

export function TradeTable({ trades, onSelectTrade, onOpenCloseModal }: TradeTableProps) {
  const { strategies, activePortfolio, deleteTrade } = useTrading();
  const currency = activePortfolio?.currency || 'USD';

  const [sortField, setSortField] = useState<SortField>('entry_time');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortedTrades = [...trades].sort((a, b) => {
    let diff = 0;
    if (sortField === 'entry_time') {
      diff = new Date(a.entry_time).getTime() - new Date(b.entry_time).getTime();
    } else if (sortField === 'asset') {
      diff = a.asset.localeCompare(b.asset);
    } else if (sortField === 'side') {
      diff = a.side.localeCompare(b.side);
    } else if (sortField === 'pnl') {
      diff = a.pnl - b.pnl;
    } else if (sortField === 'size') {
      diff = a.size - b.size;
    } else if (sortField === 'r_multiple') {
      diff = (a.r_multiple || 0) - (b.r_multiple || 0);
    }
    return sortAsc ? diff : -diff;
  });

  return (
    <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 shadow-xl">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[11px] border-b border-slate-800">
          <tr>
            <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('entry_time')}>
              <div className="flex items-center gap-1.5">
                <span>วันเวลา / Ticket</span>
                <ArrowUpDown className="w-3 h-3" />
              </div>
            </th>
            <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => handleSort('asset')}>
              <div className="flex items-center gap-1.5">
                <span>สินทรัพย์ (Symbol)</span>
                <ArrowUpDown className="w-3 h-3" />
              </div>
            </th>
            <th className="py-3.5 px-3 cursor-pointer hover:text-white" onClick={() => handleSort('side')}>
              <div className="flex items-center gap-1.5">
                <span>ฝั่ง (Type)</span>
                <ArrowUpDown className="w-3 h-3" />
              </div>
            </th>
            <th className="py-3.5 px-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('size')}>
              <div className="flex items-center justify-end gap-1.5">
                <span>ขนาด (Volume/Lot)</span>
                <ArrowUpDown className="w-3 h-3" />
              </div>
            </th>
            <th className="py-3.5 px-3 text-right">ราคาเข้า (Price)</th>
            <th className="py-3.5 px-3 text-right">S / L</th>
            <th className="py-3.5 px-3 text-right">T / P</th>
            <th className="py-3.5 px-3 text-right">ราคาปัจจุบัน / ปิด</th>
            <th className="py-3.5 px-4 text-right cursor-pointer hover:text-white" onClick={() => handleSort('pnl')}>
              <div className="flex items-center justify-end gap-1.5">
                <span>กำไร (Profit/PnL)</span>
                <ArrowUpDown className="w-3 h-3" />
              </div>
            </th>
            <th className="py-3.5 px-4">กลยุทธ์</th>
            <th className="py-3.5 px-3 text-center">รูปกราฟ</th>
            <th className="py-3.5 px-4 text-right">จัดการ</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-800/60 font-sans">
          {sortedTrades.length === 0 ? (
            <tr>
              <td colSpan={12} className="py-12 text-center text-slate-500">
                ไม่พบข้อมูลออเดอร์ตามเงื่อนไขที่เลือก
              </td>
            </tr>
          ) : (
            sortedTrades.map((trade) => {
              const isLong = trade.side === 'long';
              const isOpen = trade.status === 'open';
              const isWin = trade.pnl > 0;
              const isLoss = trade.pnl < 0;
              const strat = strategies.find((s) => s.id === trade.strategy_id);
              const ticketNum = trade.ticket || trade.id.replace('mt5_', '');

              return (
                <tr
                  key={trade.id}
                  onClick={() => onSelectTrade(trade)}
                  className="hover:bg-slate-900/80 transition-colors cursor-pointer group"
                >
                  {/* Date & Ticket */}
                  <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                    <div className="font-medium text-slate-200">
                      {new Date(trade.entry_time).toLocaleDateString('th-TH', { month: 'short', day: 'numeric', year: '2-digit' })}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                      <span>{new Date(trade.entry_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      <span className="text-brand-400/80 bg-brand-500/10 px-1 rounded font-bold">#{ticketNum}</span>
                    </div>
                  </td>

                  {/* Asset */}
                  <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-sm tracking-wide text-amber-300/90">{trade.asset}</span>
                    </div>
                  </td>

                  {/* Side */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <Badge variant={isLong ? 'profit' : 'loss'} size="sm">
                      {isLong ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
                      {isLong ? 'BUY' : 'SELL'}
                    </Badge>
                  </td>

                  {/* Size (Lot) */}
                  <td className="py-3.5 px-3 text-right font-mono text-slate-200 font-semibold">
                    {trade.size}
                  </td>

                  {/* Entry Price */}
                  <td className="py-3.5 px-3 text-right font-mono text-slate-200">
                    {trade.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>

                  {/* SL */}
                  <td className="py-3.5 px-3 text-right font-mono text-rose-400/90 text-[11px] whitespace-nowrap">
                    {trade.sl && trade.sl > 0 ? trade.sl.toLocaleString(undefined, { minimumFractionDigits: 2 }) : <span className="text-slate-600">-</span>}
                  </td>

                  {/* TP */}
                  <td className="py-3.5 px-3 text-right font-mono text-emerald-400/90 text-[11px] whitespace-nowrap">
                    {trade.tp && trade.tp > 0 ? trade.tp.toLocaleString(undefined, { minimumFractionDigits: 2 }) : <span className="text-slate-600">-</span>}
                  </td>

                  {/* Current / Exit Price */}
                  <td className="py-3.5 px-3 text-right font-mono text-slate-200 whitespace-nowrap">
                    {isOpen ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="font-bold text-amber-200">
                          {trade.current_price ? trade.current_price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : trade.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      </div>
                    ) : (
                      <span>{trade.exit_price ? trade.exit_price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</span>
                    )}
                  </td>

                  {/* Profit / Net PnL */}
                  <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap">
                    {isOpen ? (
                      <div>
                        <div className={`font-bold text-sm ${isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-slate-300'}`}>
                          {isWin ? '+' : ''}{trade.pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}
                        </div>
                        <div className="text-[10px] text-emerald-400/80 font-sans font-medium">
                          🟢 กำลังถือครอง (Open)
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className={`font-bold text-sm ${isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-slate-300'}`}>
                          {isWin ? '+' : ''}{trade.pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {trade.r_multiple ? `${trade.r_multiple > 0 ? '+' : ''}${trade.r_multiple}R` : `${trade.pnl_percentage}%`}
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Strategy */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {strat ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-200">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: strat.color }} />
                        <span className="max-w-[120px] truncate">{strat.name}</span>
                      </span>
                    ) : (
                      <span className="text-slate-600 text-[11px]">ไม่ระบุ</span>
                    )}
                  </td>

                  {/* Chart Images */}
                  <td className="py-3.5 px-3 text-center">
                    {trade.images && trade.images.length > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        <ImageIcon className="w-3 h-3" />
                        {trade.images.length}
                      </span>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      {isOpen && (
                        <Button
                          size="sm"
                          variant="primary"
                          className="text-[11px] py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white"
                          onClick={() => onOpenCloseModal(trade)}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          ปิดออเดอร์
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-[11px] py-1 px-2 text-slate-300 hover:text-white"
                        onClick={() => onSelectTrade(trade)}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        size="sm"
                        variant="danger"
                        className="text-[11px] py-1 px-2"
                        onClick={() => {
                          if (confirm(`คุณต้องการลบออเดอร์ #${ticketNum} (${trade.asset}) ใช่หรือไม่?`)) {
                            deleteTrade(trade.id);
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
