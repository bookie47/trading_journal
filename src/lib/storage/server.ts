import { Portfolio, Strategy, Trade, TradeImage } from '../types';
import { INITIAL_PORTFOLIO, INITIAL_STRATEGIES, INITIAL_TRADES } from '../demo-data';
import { isFirebaseConfigured } from '../firebase/config';
import { FirestoreService } from '../firebase/firestore-service';
import fs from 'fs';
import path from 'path';

// Server-side local file paths
const DATA_DIR = path.join(process.cwd(), '.data');
const FILE_PORTFOLIOS = path.join(DATA_DIR, 'portfolios.json');
const FILE_STRATEGIES = path.join(DATA_DIR, 'strategies.json');
const FILE_TRADES = path.join(DATA_DIR, 'trades.json');
const FILE_ACTIVE_PORTFOLIO = path.join(DATA_DIR, 'active_portfolio.txt');

function ensureServerDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(FILE_PORTFOLIOS)) {
      fs.writeFileSync(FILE_PORTFOLIOS, JSON.stringify([INITIAL_PORTFOLIO], null, 2), 'utf-8');
    }
    if (!fs.existsSync(FILE_ACTIVE_PORTFOLIO)) {
      fs.writeFileSync(FILE_ACTIVE_PORTFOLIO, INITIAL_PORTFOLIO.id, 'utf-8');
    }
    if (!fs.existsSync(FILE_STRATEGIES)) {
      fs.writeFileSync(FILE_STRATEGIES, JSON.stringify(INITIAL_STRATEGIES, null, 2), 'utf-8');
    }
    if (!fs.existsSync(FILE_TRADES)) {
      fs.writeFileSync(FILE_TRADES, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch (e) {
    console.error('Error initializing server data dir:', e);
  }
}

export class ServerTradingRepository {
  // -------------------------------------------------------------
  // Portfolios
  // -------------------------------------------------------------
  static async getPortfolios(): Promise<Portfolio[]> {
    if (isFirebaseConfigured()) {
      try {
        const list = await FirestoreService.getPortfolios();
        if (list.length > 0) return list;
      } catch (err) {
        console.error('Error getting portfolios from Firestore:', err);
      }
    }

    ensureServerDataDir();
    try {
      const content = fs.readFileSync(FILE_PORTFOLIOS, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [INITIAL_PORTFOLIO];
    }
  }

  static async savePortfolio(portfolio: Portfolio): Promise<Portfolio> {
    if (isFirebaseConfigured()) {
      try {
        await FirestoreService.savePortfolio(portfolio);
      } catch (err) {
        console.error('Error saving portfolio to Firestore:', err);
      }
    }

    ensureServerDataDir();
    const list = await this.getPortfolios();
    const idx = list.findIndex(p => p.id === portfolio.id);
    if (idx >= 0) {
      list[idx] = { ...portfolio, updated_at: new Date().toISOString() };
    } else {
      list.push(portfolio);
    }
    fs.writeFileSync(FILE_PORTFOLIOS, JSON.stringify(list, null, 2), 'utf-8');
    return portfolio;
  }

  // -------------------------------------------------------------
  // Trades
  // -------------------------------------------------------------
  static async getTrades(portfolioId?: string): Promise<Trade[]> {
    if (isFirebaseConfigured()) {
      try {
        return await FirestoreService.getTrades(portfolioId);
      } catch (err) {
        console.error('Error getting trades from Firestore:', err);
      }
    }

    ensureServerDataDir();
    try {
      const content = fs.readFileSync(FILE_TRADES, 'utf-8');
      const list: Trade[] = JSON.parse(content);
      return portfolioId ? list.filter(t => t.portfolio_id === portfolioId) : list;
    } catch {
      return [];
    }
  }

  static async saveTrade(trade: Trade): Promise<Trade> {
    if (isFirebaseConfigured()) {
      try {
        await FirestoreService.saveTrade(trade);
      } catch (err) {
        console.error('Error saving trade to Firestore:', err);
      }
    }

    // Always also persist to local server file for local backup
    ensureServerDataDir();
    const list = await this.getLocalTrades();
    const idx = list.findIndex(t => t.id === trade.id);
    if (idx >= 0) {
      list[idx] = { ...trade, updated_at: new Date().toISOString() };
    } else {
      list.unshift(trade);
    }
    fs.writeFileSync(FILE_TRADES, JSON.stringify(list, null, 2), 'utf-8');
    return trade;
  }

  private static getLocalTrades(): Trade[] {
    ensureServerDataDir();
    try {
      const content = fs.readFileSync(FILE_TRADES, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  static getActivePortfolioId(): string {
    ensureServerDataDir();
    try {
      return fs.readFileSync(FILE_ACTIVE_PORTFOLIO, 'utf-8').trim() || INITIAL_PORTFOLIO.id;
    } catch {
      return INITIAL_PORTFOLIO.id;
    }
  }
}
