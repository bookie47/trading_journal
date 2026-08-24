import { Trade, DashboardStats, EquityPoint, StrategyPerformance, AssetPerformance, DayOfWeekPerformance, Strategy } from './types';

/**
 * Calculates PnL for a trade given entry, exit, side, size, and fee
 */
export function calculatePnL(
  side: 'long' | 'short',
  entryPrice: number,
  exitPrice: number,
  size: number,
  fee: number = 0,
  asset: string = ''
): { pnl: number; pnlPercentage: number; rMultiple: number; } {
  if (!entryPrice || !exitPrice || entryPrice <= 0) {
    return { pnl: 0, pnlPercentage: 0, rMultiple: 0 };
  }

  // Base raw price difference
  let diff = side === 'long' ? exitPrice - entryPrice : entryPrice - exitPrice;
  
  // Estimate contract value / dollar PnL
  // For standard sizing (e.g. 1 unit / lot): diff * size - fee
  const rawPnL = diff * size;
  const netPnL = Number((rawPnL - fee).toFixed(2));
  
  const returnPercentage = Number(((diff / entryPrice) * 100).toFixed(2));

  return {
    pnl: netPnL,
    pnlPercentage: returnPercentage,
    rMultiple: 0 // Will be computed with SL if provided
  };
}

/**
 * Calculates R-Multiple based on Risk (Entry to SL distance)
 */
export function calculateRMultiple(
  side: 'long' | 'short',
  entryPrice: number,
  exitPrice: number,
  sl?: number
): number {
  if (!sl || !entryPrice || !exitPrice || sl === entryPrice) {
    return 0;
  }

  const initialRisk = side === 'long' ? entryPrice - sl : sl - entryPrice;
  if (initialRisk <= 0) return 0; // Invalid SL placement

  const realizedGain = side === 'long' ? exitPrice - entryPrice : entryPrice - exitPrice;
  return Number((realizedGain / initialRisk).toFixed(2));
}

/**
 * Calculates planned Risk:Reward Ratio
 */
export function calculatePlannedRR(
  side: 'long' | 'short',
  entryPrice: number,
  sl?: number,
  tp?: number
): { riskRewardRatio: number; riskAmount: number; rewardAmount: number; isValid: boolean } {
  if (!entryPrice || !sl || !tp) {
    return { riskRewardRatio: 0, riskAmount: 0, rewardAmount: 0, isValid: false };
  }

  const risk = side === 'long' ? entryPrice - sl : sl - entryPrice;
  const reward = side === 'long' ? tp - entryPrice : entryPrice - tp;

  if (risk <= 0 || reward <= 0) {
    return { riskRewardRatio: 0, riskAmount: Math.abs(risk), rewardAmount: Math.abs(reward), isValid: false };
  }

  const rr = Number((reward / risk).toFixed(2));
  return {
    riskRewardRatio: rr,
    riskAmount: Number(risk.toFixed(4)),
    rewardAmount: Number(reward.toFixed(4)),
    isValid: true
  };
}

/**
 * Calculates complete dashboard metrics from list of trades and initial portfolio balance
 */
export function calculateDashboardStats(
  trades: Trade[],
  initialBalance: number = 10000
): DashboardStats {
  const closedTrades = trades.filter(t => t.status === 'closed');
  const openTrades = trades.filter(t => t.status === 'open');

  const winningTrades = closedTrades.filter(t => t.pnl > 0);
  const losingTrades = closedTrades.filter(t => t.pnl < 0);
  const breakevenTrades = closedTrades.filter(t => t.pnl === 0);

  const totalClosed = closedTrades.length;
  const winRate = totalClosed > 0 ? Number(((winningTrades.length / totalClosed) * 100).toFixed(1)) : 0;

  const totalGrossWin = winningTrades.reduce((acc, t) => acc + t.pnl, 0);
  const totalGrossLoss = Math.abs(losingTrades.reduce((acc, t) => acc + t.pnl, 0));
  const netPnL = Number((totalGrossWin - totalGrossLoss).toFixed(2));
  const currentBalance = Number((initialBalance + netPnL).toFixed(2));
  const totalPnLPercentage = initialBalance > 0 ? Number(((netPnL / initialBalance) * 100).toFixed(2)) : 0;

  const profitFactor = totalGrossLoss > 0 ? Number((totalGrossWin / totalGrossLoss).toFixed(2)) : (totalGrossWin > 0 ? 99.9 : 0);

  // Average Win / Loss
  const avgWin = winningTrades.length > 0 ? Number((totalGrossWin / winningTrades.length).toFixed(2)) : 0;
  const avgLoss = losingTrades.length > 0 ? Number((totalGrossLoss / losingTrades.length).toFixed(2)) : 0;

  // Largest Win / Loss
  const largestWin = winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl)) : 0;
  const largestLoss = losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl)) : 0;

  // Average Realized R:R (using r_multiple when available, or avgWin / avgLoss)
  const validRTrades = closedTrades.filter(t => t.r_multiple && t.r_multiple !== 0);
  const avgRR = validRTrades.length > 0
    ? Number((validRTrades.reduce((acc, t) => acc + t.r_multiple, 0) / validRTrades.length).toFixed(2))
    : (avgLoss > 0 ? Number((avgWin / avgLoss).toFixed(2)) : 0);

  // Calculate Max Drawdown
  let peakBalance = initialBalance;
  let maxDdAmount = 0;
  let maxDdPercent = 0;
  let runningBalance = initialBalance;

  // Sort closed trades chronologically
  const sortedClosed = [...closedTrades].sort((a, b) => 
    new Date(a.exit_time || a.entry_time).getTime() - new Date(b.exit_time || b.entry_time).getTime()
  );

  for (const t of sortedClosed) {
    runningBalance += t.pnl;
    if (runningBalance > peakBalance) {
      peakBalance = runningBalance;
    }
    const currentDdAmount = peakBalance - runningBalance;
    const currentDdPercent = peakBalance > 0 ? (currentDdAmount / peakBalance) * 100 : 0;

    if (currentDdAmount > maxDdAmount) {
      maxDdAmount = currentDdAmount;
    }
    if (currentDdPercent > maxDdPercent) {
      maxDdPercent = currentDdPercent;
    }
  }

  return {
    currentBalance,
    netPnL,
    totalPnLPercentage,
    winRate,
    totalTrades: trades.length,
    openTradesCount: openTrades.length,
    closedTradesCount: totalClosed,
    winningTradesCount: winningTrades.length,
    losingTradesCount: losingTrades.length,
    breakevenTradesCount: breakevenTrades.length,
    profitFactor,
    avgRR,
    maxDrawdown: Number(maxDdPercent.toFixed(2)),
    maxDrawdownAmount: Number(maxDdAmount.toFixed(2)),
    avgWin,
    avgLoss,
    largestWin,
    largestLoss,
  };
}

/**
 * Builds chronological equity curve data points for Recharts
 */
export function buildEquityCurve(
  trades: Trade[],
  initialBalance: number = 10000
): EquityPoint[] {
  const closedTrades = trades
    .filter(t => t.status === 'closed')
    .sort((a, b) => new Date(a.exit_time || a.entry_time).getTime() - new Date(b.exit_time || b.entry_time).getTime());

  if (closedTrades.length === 0) {
    return [
      {
        date: 'Start',
        balance: initialBalance,
        tradeNumber: 0,
        pnl: 0,
      }
    ];
  }

  let runningBalance = initialBalance;
  const points: EquityPoint[] = [
    {
      date: 'Start',
      balance: initialBalance,
      tradeNumber: 0,
      pnl: 0,
    }
  ];

  closedTrades.forEach((trade, idx) => {
    runningBalance += trade.pnl;
    const dateStr = new Date(trade.exit_time || trade.entry_time).toLocaleDateString('th-TH', {
      month: 'short',
      day: 'numeric'
    });

    points.push({
      date: `${dateStr} (#${idx + 1})`,
      balance: Number(runningBalance.toFixed(2)),
      tradeNumber: idx + 1,
      pnl: trade.pnl,
      asset: trade.asset,
    });
  });

  return points;
}

/**
 * Calculates performance grouped by strategy
 */
export function calculateStrategyPerformance(
  trades: Trade[],
  strategies: Strategy[]
): StrategyPerformance[] {
  const closedTrades = trades.filter(t => t.status === 'closed');
  const strategyMap = new Map<string, Strategy>();
  strategies.forEach(s => strategyMap.set(s.id, s));

  const statsMap = new Map<string, {
    name: string;
    color: string;
    total: number;
    wins: number;
    losses: number;
    grossWin: number;
    grossLoss: number;
    netPnL: number;
  }>();

  // Initialize strategies
  strategies.forEach(s => {
    statsMap.set(s.id, {
      name: s.name,
      color: s.color || '#6366f1',
      total: 0,
      wins: 0,
      losses: 0,
      grossWin: 0,
      grossLoss: 0,
      netPnL: 0,
    });
  });

  // Handle Unassigned strategy
  const UNASSIGNED = 'unassigned';
  statsMap.set(UNASSIGNED, {
    name: 'ทั่วไป / ไม่ระบุ',
    color: '#94a3b8',
    total: 0,
    wins: 0,
    losses: 0,
    grossWin: 0,
    grossLoss: 0,
    netPnL: 0,
  });

  closedTrades.forEach(t => {
    const key = t.strategy_id && statsMap.has(t.strategy_id) ? t.strategy_id : UNASSIGNED;
    const stat = statsMap.get(key)!;
    stat.total += 1;
    stat.netPnL += t.pnl;

    if (t.pnl > 0) {
      stat.wins += 1;
      stat.grossWin += t.pnl;
    } else if (t.pnl < 0) {
      stat.losses += 1;
      stat.grossLoss += Math.abs(t.pnl);
    }
  });

  const result: StrategyPerformance[] = [];
  statsMap.forEach((val, key) => {
    if (val.total > 0 || key !== UNASSIGNED) {
      const winRate = val.total > 0 ? Number(((val.wins / val.total) * 100).toFixed(1)) : 0;
      const pf = val.grossLoss > 0 ? Number((val.grossWin / val.grossLoss).toFixed(2)) : (val.grossWin > 0 ? 99 : 0);
      result.push({
        strategyId: key,
        strategyName: val.name,
        color: val.color,
        totalTrades: val.total,
        wins: val.wins,
        losses: val.losses,
        winRate,
        netPnL: Number(val.netPnL.toFixed(2)),
        profitFactor: pf,
      });
    }
  });

  return result.sort((a, b) => b.netPnL - a.netPnL);
}

/**
 * Calculates performance grouped by asset
 */
export function calculateAssetPerformance(trades: Trade[]): AssetPerformance[] {
  const closedTrades = trades.filter(t => t.status === 'closed');
  const assetMap = new Map<string, { total: number; wins: number; losses: number; netPnL: number }>();

  closedTrades.forEach(t => {
    const a = t.asset.toUpperCase();
    if (!assetMap.has(a)) {
      assetMap.set(a, { total: 0, wins: 0, losses: 0, netPnL: 0 });
    }
    const stat = assetMap.get(a)!;
    stat.total += 1;
    stat.netPnL += t.pnl;
    if (t.pnl > 0) stat.wins += 1;
    else if (t.pnl < 0) stat.losses += 1;
  });

  const result: AssetPerformance[] = [];
  assetMap.forEach((val, key) => {
    result.push({
      asset: key,
      totalTrades: val.total,
      wins: val.wins,
      losses: val.losses,
      winRate: Number(((val.wins / val.total) * 100).toFixed(1)),
      netPnL: Number(val.netPnL.toFixed(2))
    });
  });

  return result.sort((a, b) => b.totalTrades - a.totalTrades);
}

/**
 * Calculates performance by Day of the Week (Mon - Sun)
 */
export function calculateDayOfWeekPerformance(trades: Trade[]): DayOfWeekPerformance[] {
  const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const dayStats = days.map((day, idx) => ({
    day,
    dayIndex: idx,
    totalTrades: 0,
    netPnL: 0,
    wins: 0,
    winRate: 0,
  }));

  const closed = trades.filter(t => t.status === 'closed');
  closed.forEach(t => {
    const d = new Date(t.entry_time).getDay();
    dayStats[d].totalTrades += 1;
    dayStats[d].netPnL += t.pnl;
    if (t.pnl > 0) dayStats[d].wins += 1;
  });

  return dayStats.map(d => ({
    ...d,
    netPnL: Number(d.netPnL.toFixed(2)),
    winRate: d.totalTrades > 0 ? Number(((d.wins / d.totalTrades) * 100).toFixed(1)) : 0
  }));
}
