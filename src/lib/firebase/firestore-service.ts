import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './config';
import { Portfolio, Strategy, Trade, TradeImage } from '../types';

const COLLECTIONS = {
  PORTFOLIOS: 'portfolios',
  STRATEGIES: 'strategies',
  TRADES: 'trades',
};

// Helper: Remove all undefined values before passing to Firestore
function cleanForFirestore<T extends Record<string, any>>(obj: T): any {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = cleanForFirestore(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

export class FirestoreService {
  // -------------------------------------------------------------
  // Portfolios
  // -------------------------------------------------------------
  static async getPortfolios(): Promise<Portfolio[]> {
    if (!db) return [];
    try {
      const q = query(collection(db, COLLECTIONS.PORTFOLIOS), orderBy('created_at', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Portfolio));
    } catch (error) {
      console.error('Firestore getPortfolios error:', error);
      return [];
    }
  }

  static async savePortfolio(portfolio: Portfolio): Promise<Portfolio> {
    if (!db) throw new Error('Firestore not initialized');
    const docRef = doc(db, COLLECTIONS.PORTFOLIOS, portfolio.id);
    await setDoc(docRef, cleanForFirestore(portfolio), { merge: true });
    return portfolio;
  }

  static async deletePortfolio(id: string): Promise<void> {
    if (!db) return;
    await deleteDoc(doc(db, COLLECTIONS.PORTFOLIOS, id));
  }

  static subscribeToPortfolios(callback: (portfolios: Portfolio[]) => void): Unsubscribe {
    if (!db) return () => {};
    try {
      const q = query(collection(db, COLLECTIONS.PORTFOLIOS), orderBy('created_at', 'asc'));
      return onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Portfolio));
        callback(list);
      }, (error) => {
        console.error('Firestore subscribeToPortfolios error:', error);
      });
    } catch (err) {
      console.error('Failed to setup Firestore portfolios subscription:', err);
      return () => {};
    }
  }

  // -------------------------------------------------------------
  // Strategies
  // -------------------------------------------------------------
  static async getStrategies(portfolioId?: string): Promise<Strategy[]> {
    if (!db) return [];
    try {
      let q = collection(db, COLLECTIONS.STRATEGIES);
      let queryRef = query(q, orderBy('name', 'asc'));
      if (portfolioId) {
        queryRef = query(q, where('portfolio_id', '==', portfolioId));
      }
      const snapshot = await getDocs(queryRef);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Strategy));
    } catch (error) {
      console.error('Firestore getStrategies error:', error);
      return [];
    }
  }

  static async saveStrategy(strategy: Strategy): Promise<Strategy> {
    if (!db) throw new Error('Firestore not initialized');
    const docRef = doc(db, COLLECTIONS.STRATEGIES, strategy.id);
    await setDoc(docRef, cleanForFirestore(strategy), { merge: true });
    return strategy;
  }

  static async deleteStrategy(id: string): Promise<void> {
    if (!db) return;
    await deleteDoc(doc(db, COLLECTIONS.STRATEGIES, id));
  }

  // -------------------------------------------------------------
  // Trades
  // -------------------------------------------------------------
  static async getTrades(portfolioId?: string): Promise<Trade[]> {
    if (!db) return [];
    try {
      let q = collection(db, COLLECTIONS.TRADES);
      let queryRef = query(q, orderBy('entry_time', 'desc'));
      if (portfolioId) {
        queryRef = query(q, where('portfolio_id', '==', portfolioId));
      }
      const snapshot = await getDocs(queryRef);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trade));
    } catch (error) {
      console.error('Firestore getTrades error:', error);
      return [];
    }
  }

  static async saveTrade(trade: Trade): Promise<Trade> {
    if (!db) throw new Error('Firestore not initialized');
    const docRef = doc(db, COLLECTIONS.TRADES, trade.id);
    const cleaned = cleanForFirestore(trade);
    await setDoc(docRef, cleaned, { merge: true });
    return trade;
  }

  static async deleteTrade(id: string): Promise<void> {
    if (!db) return;
    await deleteDoc(doc(db, COLLECTIONS.TRADES, id));
  }

  // Real-time Subscriptions (onSnapshot)
  static subscribeToTrades(portfolioId: string | undefined, callback: (trades: Trade[]) => void): Unsubscribe {
    if (!db) {
      return () => {};
    }
    try {
      let q = collection(db, COLLECTIONS.TRADES);
      let queryRef = query(q, orderBy('entry_time', 'desc'));
      if (portfolioId) {
        queryRef = query(q, where('portfolio_id', '==', portfolioId));
      }

      return onSnapshot(queryRef, (snapshot) => {
        const trades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trade));
        callback(trades);
      }, (error) => {
        console.error('Firestore subscribeToTrades error:', error);
      });
    } catch (err) {
      console.error('Failed to setup Firestore subscription:', err);
      return () => {};
    }
  }

  // -------------------------------------------------------------
  // Image Upload to Firebase Storage
  // -------------------------------------------------------------
  static async uploadImage(file: File, tradeId: string, type: 'setup' | 'result'): Promise<string> {
    if (!storage) {
      // Base64 fallback if storage not configured
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `trades/${tradeId}/${type}_${Date.now()}.${fileExt}`;
    const storageRef = ref(storage, fileName);

    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type || 'image/png',
    });

    return await getDownloadURL(snapshot.ref);
  }
}
