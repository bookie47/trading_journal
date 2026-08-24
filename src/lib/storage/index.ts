import { Portfolio, Strategy, Trade, TradeImage } from '../types';
import { INITIAL_PORTFOLIO, INITIAL_STRATEGIES, INITIAL_TRADES } from '../demo-data';
import { isFirebaseConfigured } from '../firebase/config';
import { FirestoreService } from '../firebase/firestore-service';

const STORAGE_KEYS = {
  PORTFOLIOS: 'trading_journal_portfolios_v1',
  ACTIVE_PORTFOLIO_ID: 'trading_journal_active_portfolio_id_v1',
  STRATEGIES: 'trading_journal_strategies_v1',
  TRADES: 'trading_journal_trades_v1',
  IS_DEMO: 'trading_journal_is_demo_v1',
};

const isBrowser = typeof window !== 'undefined';

export class TradingRepository {
  // -------------------------------------------------------------
  // Mode Check
  // -------------------------------------------------------------
  static isUsingFirestore(): boolean {
    return isFirebaseConfigured() && !this.isDemoMode();
  }

  static isDemoMode(): boolean {
    if (!isBrowser) return true;
    const item = localStorage.getItem(STORAGE_KEYS.IS_DEMO);
    if (!isFirebaseConfigured()) return true;
    return item === 'true';
  }

  static setDemoMode(enable: boolean) {
    if (!isBrowser) return;
    localStorage.setItem(STORAGE_KEYS.IS_DEMO, enable ? 'true' : 'false');
  }

  // -------------------------------------------------------------
  // Initial Data Seeding for LocalStorage
  // -------------------------------------------------------------
  static initLocalStorageIfEmpty() {
    if (!isBrowser) return;
    if (!localStorage.getItem(STORAGE_KEYS.PORTFOLIOS)) {
      localStorage.setItem(STORAGE_KEYS.PORTFOLIOS, JSON.stringify([INITIAL_PORTFOLIO]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ACTIVE_PORTFOLIO_ID)) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PORTFOLIO_ID, INITIAL_PORTFOLIO.id);
    }
    if (!localStorage.getItem(STORAGE_KEYS.STRATEGIES)) {
      localStorage.setItem(STORAGE_KEYS.STRATEGIES, JSON.stringify(INITIAL_STRATEGIES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TRADES)) {
      localStorage.setItem(STORAGE_KEYS.TRADES, JSON.stringify(INITIAL_TRADES));
    }
  }

  // -------------------------------------------------------------
  // Portfolios
  // -------------------------------------------------------------
  static async getPortfolios(): Promise<Portfolio[]> {
    if (this.isUsingFirestore()) {
      try {
        const list = await FirestoreService.getPortfolios();
        if (list.length > 0) return list;
        // Auto-seed initial portfolio in Firestore
        await FirestoreService.savePortfolio(INITIAL_PORTFOLIO);
        return [INITIAL_PORTFOLIO];
      } catch (err) {
        console.error('Error fetching portfolios from Firestore:', err);
        return [INITIAL_PORTFOLIO];
      }
    }

    this.initLocalStorageIfEmpty();
    if (!isBrowser) return [INITIAL_PORTFOLIO];
    const data = localStorage.getItem(STORAGE_KEYS.PORTFOLIOS);
    return data ? JSON.parse(data) : [INITIAL_PORTFOLIO];
  }

  static async savePortfolio(portfolio: Portfolio): Promise<Portfolio> {
    if (this.isUsingFirestore()) {
      return await FirestoreService.savePortfolio(portfolio);
    }

    this.initLocalStorageIfEmpty();
    if (!isBrowser) return portfolio;
    const portfolios = await this.getPortfolios();
    const existingIdx = portfolios.findIndex(p => p.id === portfolio.id);
    if (existingIdx >= 0) {
      portfolios[existingIdx] = { ...portfolio, updated_at: new Date().toISOString() };
    } else {
      portfolios.push(portfolio);
    }
    localStorage.setItem(STORAGE_KEYS.PORTFOLIOS, JSON.stringify(portfolios));
    return portfolio;
  }

  static async deletePortfolio(portfolioId: string): Promise<void> {
    if (this.isUsingFirestore()) {
      await FirestoreService.deletePortfolio(portfolioId);
      return;
    }

    this.initLocalStorageIfEmpty();
    if (!isBrowser) return;
    const portfolios = (await this.getPortfolios()).filter(p => p.id !== portfolioId);
    localStorage.setItem(STORAGE_KEYS.PORTFOLIOS, JSON.stringify(portfolios));

    const trades = (await this.getTrades()).filter(t => t.portfolio_id !== portfolioId);
    localStorage.setItem(STORAGE_KEYS.TRADES, JSON.stringify(trades));

    const strategies = (await this.getStrategies()).filter(s => s.portfolio_id !== portfolioId);
    localStorage.setItem(STORAGE_KEYS.STRATEGIES, JSON.stringify(strategies));
  }

  static getActivePortfolioId(): string {
    if (!isBrowser) return INITIAL_PORTFOLIO.id;
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_PORTFOLIO_ID) || INITIAL_PORTFOLIO.id;
  }

  static setActivePortfolioId(id: string) {
    if (!isBrowser) return;
    localStorage.setItem(STORAGE_KEYS.ACTIVE_PORTFOLIO_ID, id);
  }

  // -------------------------------------------------------------
  // Strategies
  // -------------------------------------------------------------
  static async getStrategies(portfolioId?: string): Promise<Strategy[]> {
    if (this.isUsingFirestore()) {
      try {
        const list = await FirestoreService.getStrategies(portfolioId);
        if (list.length > 0) return list;
        // Auto-seed initial strategies in Firestore
        for (const s of INITIAL_STRATEGIES) {
          await FirestoreService.saveStrategy(s);
        }
        return INITIAL_STRATEGIES;
      } catch (err) {
        console.error('Error fetching strategies from Firestore:', err);
        return INITIAL_STRATEGIES;
      }
    }

    this.initLocalStorageIfEmpty();
    if (!isBrowser) return INITIAL_STRATEGIES;
    const data = localStorage.getItem(STORAGE_KEYS.STRATEGIES);
    const list: Strategy[] = data ? JSON.parse(data) : INITIAL_STRATEGIES;
    if (portfolioId) {
      return list.filter(s => s.portfolio_id === portfolioId);
    }
    return list;
  }

  static async saveStrategy(strategy: Strategy): Promise<Strategy> {
    if (this.isUsingFirestore()) {
      return await FirestoreService.saveStrategy(strategy);
    }

    this.initLocalStorageIfEmpty();
    if (!isBrowser) return strategy;
    const list = await this.getStrategies();
    const idx = list.findIndex(s => s.id === strategy.id);
    if (idx >= 0) {
      list[idx] = strategy;
    } else {
      list.push(strategy);
    }
    localStorage.setItem(STORAGE_KEYS.STRATEGIES, JSON.stringify(list));
    return strategy;
  }

  static async deleteStrategy(strategyId: string): Promise<void> {
    if (this.isUsingFirestore()) {
      await FirestoreService.deleteStrategy(strategyId);
      return;
    }

    this.initLocalStorageIfEmpty();
    if (!isBrowser) return;
    const list = (await this.getStrategies()).filter(s => s.id !== strategyId);
    localStorage.setItem(STORAGE_KEYS.STRATEGIES, JSON.stringify(list));
  }

  // -------------------------------------------------------------
  // Trades
  // -------------------------------------------------------------
  static async getTrades(portfolioId?: string): Promise<Trade[]> {
    if (this.isUsingFirestore()) {
      return await FirestoreService.getTrades(portfolioId);
    }

    this.initLocalStorageIfEmpty();
    if (!isBrowser) return INITIAL_TRADES;
    const data = localStorage.getItem(STORAGE_KEYS.TRADES);
    const list: Trade[] = data ? JSON.parse(data) : [];
    if (portfolioId) {
      return list.filter(t => t.portfolio_id === portfolioId);
    }
    return list;
  }

  static async saveTrade(trade: Trade): Promise<Trade> {
    if (this.isUsingFirestore()) {
      return await FirestoreService.saveTrade(trade);
    }

    this.initLocalStorageIfEmpty();
    if (!isBrowser) return trade;
    const trades = await this.getTrades();
    const idx = trades.findIndex(t => t.id === trade.id);
    if (idx >= 0) {
      trades[idx] = { ...trade, updated_at: new Date().toISOString() };
    } else {
      trades.unshift(trade);
    }
    localStorage.setItem(STORAGE_KEYS.TRADES, JSON.stringify(trades));
    return trade;
  }

  static async deleteTrade(tradeId: string): Promise<void> {
    if (this.isUsingFirestore()) {
      await FirestoreService.deleteTrade(tradeId);
      return;
    }

    this.initLocalStorageIfEmpty();
    if (!isBrowser) return;
    const trades = (await this.getTrades()).filter(t => t.id !== tradeId);
    localStorage.setItem(STORAGE_KEYS.TRADES, JSON.stringify(trades));
  }

  // -------------------------------------------------------------
  // Image Storage (Firebase Storage / Base64 fallback)
  // -------------------------------------------------------------
  static async uploadImage(file: File, tradeId: string, type: 'setup' | 'result'): Promise<string> {
    if (this.isUsingFirestore()) {
      return await FirestoreService.uploadImage(file, tradeId, type);
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

  // Reset to initial demo data
  static resetDemoData() {
    if (!isBrowser) return;
    localStorage.setItem(STORAGE_KEYS.PORTFOLIOS, JSON.stringify([INITIAL_PORTFOLIO]));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_PORTFOLIO_ID, INITIAL_PORTFOLIO.id);
    localStorage.setItem(STORAGE_KEYS.STRATEGIES, JSON.stringify(INITIAL_STRATEGIES));
    localStorage.setItem(STORAGE_KEYS.TRADES, JSON.stringify(INITIAL_TRADES));
  }

  // Clear all trades
  static clearAllTrades(portfolioId?: string) {
    if (!isBrowser) return;
    if (portfolioId) {
      const data = localStorage.getItem(STORAGE_KEYS.TRADES);
      const list: Trade[] = data ? JSON.parse(data) : [];
      const remaining = list.filter(t => t.portfolio_id !== portfolioId);
      localStorage.setItem(STORAGE_KEYS.TRADES, JSON.stringify(remaining));
    } else {
      localStorage.setItem(STORAGE_KEYS.TRADES, JSON.stringify([]));
    }
  }

  // Clear all and start fresh
  static clearAllDataAndStartFresh() {
    if (!isBrowser) return;
    const cleanPortfolio: Portfolio = {
      id: 'portfolio-live-1',
      name: 'Live MT5 Trading Portfolio',
      initial_balance: 1000,
      currency: 'USD',
      description: 'พอร์ตบันทึกการเทรดจริงจาก MT5',
      created_at: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.PORTFOLIOS, JSON.stringify([cleanPortfolio]));
    localStorage.setItem(STORAGE_KEYS.ACTIVE_PORTFOLIO_ID, cleanPortfolio.id);
    localStorage.setItem(STORAGE_KEYS.STRATEGIES, JSON.stringify(INITIAL_STRATEGIES));
    localStorage.setItem(STORAGE_KEYS.TRADES, JSON.stringify([]));
  }
}
