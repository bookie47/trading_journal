export type TradeSide = 'long' | 'short';
export type TradeStatus = 'open' | 'closed' | 'cancelled';
export type ImageType = 'setup' | 'result' | 'other';

export type EmotionTag = 
  | 'Disciplined' 
  | 'Patient' 
  | 'Confident' 
  | 'FOMO' 
  | 'Revenge' 
  | 'Greedy' 
  | 'Fearful' 
  | 'Hesitant' 
  | 'Overleveraged' 
  | 'Impulsive';

export interface Portfolio {
  id: string;
  user_id?: string;
  name: string;
  initial_balance: number;
  currency: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

export interface Strategy {
  id: string;
  portfolio_id: string;
  user_id?: string;
  name: string;
  description?: string;
  color: string;
  created_at: string;
}

export interface TradeImage {
  id: string;
  trade_id: string;
  image_url: string;
  type: ImageType;
  caption?: string;
  uploaded_at: string;
}

export interface Trade {
  id: string;
  portfolio_id: string;
  user_id?: string;
  ticket?: number | string;
  asset: string;
  side: TradeSide;
  entry_price: number;
  current_price?: number;
  sl?: number;
  tp?: number;
  exit_price?: number;
  size: number; // lot or units
  fee: number;
  entry_time: string;
  exit_time?: string;
  strategy_id?: string;
  emotion_tag?: EmotionTag;
  notes?: string;
  lessons_learned?: string;
  status: TradeStatus;
  pnl: number;
  pnl_percentage: number;
  r_multiple: number;
  images?: TradeImage[];
  created_at: string;
  updated_at?: string;
}

export interface DashboardStats {
  currentBalance: number;
  netPnL: number;
  totalPnLPercentage: number;
  winRate: number; // percentage (0 - 100)
  totalTrades: number;
  openTradesCount: number;
  closedTradesCount: number;
  winningTradesCount: number;
  losingTradesCount: number;
  breakevenTradesCount: number;
  profitFactor: number;
  avgRR: number;
  maxDrawdown: number; // percentage (0 - 100)
  maxDrawdownAmount: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
}

export interface EquityPoint {
  date: string;
  balance: number;
  tradeNumber: number;
  pnl: number;
  asset?: string;
}

export interface StrategyPerformance {
  strategyId: string;
  strategyName: string;
  color: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  netPnL: number;
  profitFactor: number;
}

export interface AssetPerformance {
  asset: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  netPnL: number;
}

export interface DayOfWeekPerformance {
  day: string;
  dayIndex: number;
  totalTrades: number;
  netPnL: number;
  winRate: number;
}

export interface TradeFilters {
  search: string;
  status: 'all' | 'open' | 'closed' | 'win' | 'loss';
  side: 'all' | 'long' | 'short';
  strategyId: string;
  asset: string;
  timeRange: 'all' | 'today' | 'this_week' | 'this_month' | 'last_30_days' | 'this_year';
}

export interface ParsedTradeCandidate {
  id?: string;
  ticket?: number | string;
  asset: string;
  side: TradeSide;
  size: number;
  entry_price: number;
  exit_price?: number;
  sl?: number;
  tp?: number;
  pnl: number;
  pnl_percentage?: number;
  fee?: number;
  entry_time: string;
  exit_time?: string;
  notes?: string;
  isDuplicate?: boolean;
  duplicateReason?: string;
  sourceImageIndex?: number;
}

export interface AIParseResponse {
  success: boolean;
  totalParsed: number;
  newCount: number;
  duplicateCount: number;
  trades: ParsedTradeCandidate[];
  error?: string;
}

