'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Portfolio, Strategy, Trade, DashboardStats, TradeFilters } from '../types';
import { TradingRepository } from '../storage';
import { calculateDashboardStats } from '../calculations';
import { isFirebaseConfigured } from '../firebase/config';
import { FirestoreService } from '../firebase/firestore-service';

interface TradingContextType {
  portfolios: Portfolio[];
  activePortfolio: Portfolio | null;
  strategies: Strategy[];
  trades: Trade[];
  filteredTrades: Trade[];
  stats: DashboardStats;
  filters: TradeFilters;
  isLoading: boolean;
  isDemo: boolean;
  isFirestoreConnected: boolean;
  // Actions
  setActivePortfolioId: (id: string) => void;
  createPortfolio: (data: Omit<Portfolio, 'id' | 'created_at'>) => Promise<Portfolio>;
  updatePortfolio: (portfolio: Portfolio) => Promise<void>;
  deletePortfolio: (id: string) => Promise<void>;
  createStrategy: (data: Omit<Strategy, 'id' | 'created_at'>) => Promise<Strategy>;
  deleteStrategy: (id: string) => Promise<void>;
  addTrade: (trade: Trade) => Promise<Trade>;
  updateTrade: (trade: Trade) => Promise<Trade>;
  deleteTrade: (id: string) => Promise<void>;
  closeTrade: (
    tradeId: string,
    exitPrice: number,
    exitTime: string,
    fee?: number,
    emotionTag?: any,
    lessonsLearned?: string,
    resultImage?: string
  ) => Promise<Trade>;
  setFilters: React.Dispatch<React.SetStateAction<TradeFilters>>;
  resetFilters: () => void;
  resetToDemoData: () => void;
  clearAllTrades: () => void;
  startFresh: () => void;
  refreshData: () => Promise<void>;
}

const defaultFilters: TradeFilters = {
  search: '',
  status: 'all',
  side: 'all',
  strategyId: 'all',
  asset: 'all',
  timeRange: 'all',
};

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export function TradingProvider({ children }: { children: React.ReactNode }) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [activePortfolioId, setActivePortfolioIdState] = useState<string>('');
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filters, setFilters] = useState<TradeFilters>(defaultFilters);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDemo, setIsDemo] = useState<boolean>(true);

  // Load all initial data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      setIsDemo(TradingRepository.isDemoMode());
      const loadedPortfolios = await TradingRepository.getPortfolios();
      setPortfolios(loadedPortfolios);

      const savedActiveId = TradingRepository.getActivePortfolioId();
      const currentActiveId = loadedPortfolios.some(p => p.id === savedActiveId)
        ? savedActiveId
        : (loadedPortfolios[0]?.id || '');
      
      setActivePortfolioIdState(currentActiveId);

      if (currentActiveId) {
        let [loadedStrategies, loadedTrades] = await Promise.all([
          TradingRepository.getStrategies(currentActiveId),
          TradingRepository.getTrades(currentActiveId),
        ]);

        // Also check if server API has new MT5 trades
        try {
          const apiRes = await fetch(`/api/trades?portfolio_id=${currentActiveId}`).then(r => r.json());
          if (apiRes.success && Array.isArray(apiRes.trades) && apiRes.trades.length > 0) {
            // Merge unique trades
            const map = new Map<string, Trade>();
            loadedTrades.forEach(t => map.set(t.id, t));
            apiRes.trades.forEach((t: Trade) => map.set(t.id, t));
            loadedTrades = Array.from(map.values()).sort((a, b) => 
              new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime()
            );
          }
        } catch {}

        setStrategies(loadedStrategies);
        setTrades(loadedTrades);
      }
    } catch (err) {
      console.error('Failed to load trading data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // 1. If Firebase Firestore is configured, use real-time onSnapshot listener!
    if (isFirebaseConfigured()) {
      const unsubTrades = FirestoreService.subscribeToTrades(activePortfolioId, (liveTrades) => {
        if (liveTrades && Array.isArray(liveTrades)) {
          setTrades(liveTrades);
        }
      });

      const unsubPortfolios = FirestoreService.subscribeToPortfolios((livePortfolios) => {
        if (livePortfolios && Array.isArray(livePortfolios)) {
          setPortfolios(livePortfolios);
        }
      });

      return () => {
        unsubTrades();
        unsubPortfolios();
      };
    }

    // 2. Fallback: Auto-poll for incoming trades and balance every 1 second
    const interval = setInterval(async () => {
      if (!activePortfolioId) return;
      try {
        const res = await fetch(`/api/trades?portfolio_id=${activePortfolioId}`).then(r => r.json());
        if (res.success && Array.isArray(res.trades)) {
          setTrades(prev => {
            const map = new Map<string, Trade>();
            prev.forEach(t => map.set(t.id, t));
            let hasChanged = false;
            if (prev.length !== res.trades.length) hasChanged = true;
            res.trades.forEach((t: Trade) => {
              const existing = map.get(t.id);
              if (
                !existing || 
                existing.status !== t.status || 
                existing.pnl !== t.pnl ||
                existing.current_price !== t.current_price ||
                existing.exit_price !== t.exit_price ||
                existing.sl !== t.sl ||
                existing.tp !== t.tp
              ) {
                hasChanged = true;
                map.set(t.id, t);
              }
            });
            if (!hasChanged) return prev;
            return Array.from(map.values()).sort((a, b) => 
              new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime()
            );
          });
        }
      } catch {}
    }, 1000);

    return () => clearInterval(interval);
  }, [loadData, activePortfolioId]);

  // When active portfolio changes
  const setActivePortfolioId = useCallback(async (id: string) => {
    setActivePortfolioIdState(id);
    TradingRepository.setActivePortfolioId(id);
    setIsLoading(true);
    try {
      const [loadedStrategies, loadedTrades] = await Promise.all([
        TradingRepository.getStrategies(id),
        TradingRepository.getTrades(id),
      ]);
      setStrategies(loadedStrategies);
      setTrades(loadedTrades);
    } catch (err) {
      console.error('Error switching portfolio:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const activePortfolio = useMemo(() => {
    return portfolios.find(p => p.id === activePortfolioId) || portfolios[0] || null;
  }, [portfolios, activePortfolioId]);

  // Filtered trades computation
  const filteredTrades = useMemo(() => {
    return trades.filter(t => {
      // Search
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const matchesAsset = t.asset.toLowerCase().includes(query);
        const matchesNotes = t.notes?.toLowerCase().includes(query);
        const matchesLessons = t.lessons_learned?.toLowerCase().includes(query);
        const matchesEmotion = t.emotion_tag?.toLowerCase().includes(query);
        if (!matchesAsset && !matchesNotes && !matchesLessons && !matchesEmotion) {
          return false;
        }
      }

      // Status
      if (filters.status === 'open' && t.status !== 'open') return false;
      if (filters.status === 'closed' && t.status !== 'closed') return false;
      if (filters.status === 'win' && (t.status !== 'closed' || t.pnl <= 0)) return false;
      if (filters.status === 'loss' && (t.status !== 'closed' || t.pnl >= 0)) return false;

      // Side
      if (filters.side !== 'all' && t.side !== filters.side) return false;

      // Strategy
      if (filters.strategyId !== 'all' && t.strategy_id !== filters.strategyId) return false;

      // Asset
      if (filters.asset !== 'all' && t.asset.toUpperCase() !== filters.asset.toUpperCase()) return false;

      // Time Range
      if (filters.timeRange !== 'all') {
        const tradeDate = new Date(t.entry_time).getTime();
        const now = Date.now();
        const oneDay = 86400000;
        if (filters.timeRange === 'today' && now - tradeDate > oneDay) return false;
        if (filters.timeRange === 'this_week' && now - tradeDate > 7 * oneDay) return false;
        if (filters.timeRange === 'this_month' && now - tradeDate > 30 * oneDay) return false;
        if (filters.timeRange === 'last_30_days' && now - tradeDate > 30 * oneDay) return false;
        if (filters.timeRange === 'this_year' && now - tradeDate > 365 * oneDay) return false;
      }

      return true;
    });
  }, [trades, filters]);

  // Overall stats
  const stats = useMemo(() => {
    return calculateDashboardStats(trades, activePortfolio?.initial_balance || 10000);
  }, [trades, activePortfolio]);

  // Reset Filters
  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  // Portfolio actions
  const createPortfolio = useCallback(async (data: Omit<Portfolio, 'id' | 'created_at'>) => {
    const newPort: Portfolio = {
      ...data,
      id: 'port_' + Date.now(),
      created_at: new Date().toISOString(),
    };
    const saved = await TradingRepository.savePortfolio(newPort);
    setPortfolios(prev => [...prev, saved]);
    await setActivePortfolioId(saved.id);
    return saved;
  }, [setActivePortfolioId]);

  const updatePortfolio = useCallback(async (portfolio: Portfolio) => {
    const saved = await TradingRepository.savePortfolio(portfolio);
    setPortfolios(prev => prev.map(p => p.id === saved.id ? saved : p));
  }, []);

  const deletePortfolio = useCallback(async (id: string) => {
    await TradingRepository.deletePortfolio(id);
    const remaining = portfolios.filter(p => p.id !== id);
    setPortfolios(remaining);
    if (activePortfolioId === id && remaining.length > 0) {
      await setActivePortfolioId(remaining[0].id);
    }
  }, [portfolios, activePortfolioId, setActivePortfolioId]);

  // Strategy actions
  const createStrategy = useCallback(async (data: Omit<Strategy, 'id' | 'created_at'>) => {
    const newStrat: Strategy = {
      ...data,
      id: 'strat_' + Date.now(),
      created_at: new Date().toISOString(),
    };
    const saved = await TradingRepository.saveStrategy(newStrat);
    setStrategies(prev => [...prev, saved]);
    return saved;
  }, []);

  const deleteStrategy = useCallback(async (id: string) => {
    await TradingRepository.deleteStrategy(id);
    setStrategies(prev => prev.filter(s => s.id !== id));
  }, []);

  // Trade actions
  const addTrade = useCallback(async (trade: Trade) => {
    const saved = await TradingRepository.saveTrade(trade);
    setTrades(prev => [saved, ...prev]);
    return saved;
  }, []);

  const updateTrade = useCallback(async (trade: Trade) => {
    const saved = await TradingRepository.saveTrade(trade);
    setTrades(prev => prev.map(t => t.id === saved.id ? saved : t));
    return saved;
  }, []);

  const deleteTrade = useCallback(async (id: string) => {
    await TradingRepository.deleteTrade(id);
    setTrades(prev => prev.filter(t => t.id !== id));
  }, []);

  const closeTrade = useCallback(async (
    tradeId: string,
    exitPrice: number,
    exitTime: string,
    fee: number = 0,
    emotionTag?: any,
    lessonsLearned?: string,
    resultImage?: string
  ) => {
    const target = trades.find(t => t.id === tradeId);
    if (!target) throw new Error('Trade not found');

    const totalFee = (target.fee || 0) + (fee || 0);
    const diff = target.side === 'long' ? exitPrice - target.entry_price : target.entry_price - exitPrice;
    const netPnL = Number((diff * target.size - totalFee).toFixed(2));
    const pnlPercentage = Number(((diff / target.entry_price) * 100).toFixed(2));

    // Calculate R-Multiple if SL exists
    let rMultiple = 0;
    if (target.sl && target.sl !== target.entry_price) {
      const risk = target.side === 'long' ? target.entry_price - target.sl : target.sl - target.entry_price;
      if (risk > 0) {
        rMultiple = Number((diff / risk).toFixed(2));
      }
    }

    const updatedImages = [...(target.images || [])];
    if (resultImage) {
      updatedImages.push({
        id: 'img_' + Date.now(),
        trade_id: target.id,
        image_url: resultImage,
        type: 'result',
        caption: 'Result Chart & Exit Confirmation',
        uploaded_at: new Date().toISOString(),
      });
    }

    const closedTrade: Trade = {
      ...target,
      exit_price: exitPrice,
      exit_time: exitTime || new Date().toISOString(),
      fee: totalFee,
      emotion_tag: emotionTag || target.emotion_tag,
      lessons_learned: lessonsLearned || target.lessons_learned,
      status: 'closed',
      pnl: netPnL,
      pnl_percentage: pnlPercentage,
      r_multiple: rMultiple,
      images: updatedImages,
      updated_at: new Date().toISOString(),
    };

    const saved = await TradingRepository.saveTrade(closedTrade);
    setTrades(prev => prev.map(t => t.id === saved.id ? saved : t));
    return saved;
  }, [trades]);

  const resetToDemoData = useCallback(() => {
    TradingRepository.resetDemoData();
    loadData();
  }, [loadData]);

  const clearAllTrades = useCallback(() => {
    TradingRepository.clearAllTrades(activePortfolioId);
    setTrades([]);
  }, [activePortfolioId]);

  const startFresh = useCallback(() => {
    TradingRepository.clearAllDataAndStartFresh();
    loadData();
  }, [loadData]);

  return (
    <TradingContext.Provider
      value={{
        portfolios,
        activePortfolio,
        strategies,
        trades,
        filteredTrades,
        stats,
        filters,
        isLoading,
        isDemo,
        isFirestoreConnected: isFirebaseConfigured(),
        setActivePortfolioId,
        createPortfolio,
        updatePortfolio,
        deletePortfolio,
        createStrategy,
        deleteStrategy,
        addTrade,
        updateTrade,
        deleteTrade,
        closeTrade,
        setFilters,
        resetFilters,
        resetToDemoData,
        clearAllTrades,
        startFresh,
        refreshData: loadData,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
}

export function useTrading() {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error('useTrading must be used within a TradingProvider');
  }
  return context;
}
