import { NextRequest, NextResponse } from 'next/server';
import { Trade, TradeSide, TradeStatus } from '@/lib/types';
import { ServerTradingRepository } from '@/lib/storage/server';
import { calculatePnL, calculateRMultiple } from '@/lib/calculations';

export const dynamic = 'force-dynamic';

// Secret API Key (can be customized via environment variable or passed in header)
const MT5_WEBHOOK_SECRET = process.env.MT5_WEBHOOK_SECRET || 'tradejournal_mt5_secret_key_2026';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('x-api-key') || req.headers.get('authorization');
    
    let body: any = {};
    try {
      body = await req.json();
    } catch (e1) {
      try {
        const text = await req.text();
        const unescaped = text.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        body = JSON.parse(unescaped);
      } catch (e2) {
        return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
      }
    }

    // Check API Key if provided
    const providedKey = authHeader?.replace('Bearer ', '') || body.api_key;
    if (providedKey && providedKey !== MT5_WEBHOOK_SECRET && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized: Invalid API Key' }, { status: 401 });
    }

    const {
      event, // 'deal_open' | 'deal_close' | 'deal_modify' | 'account_sync'
      ticket,
      position_ticket,
      symbol,
      order_type, // 'BUY' | 'SELL' | 0 | 1
      lots,
      open_price,
      close_price,
      sl,
      tp,
      profit,
      commission,
      swap,
      open_time,
      close_time,
      comment,
      portfolio_id,
      balance,
      equity,
      currency,
      broker,
      login
    } = body;

    // Determine Portfolio
    const targetPortfolioId = portfolio_id || ServerTradingRepository.getActivePortfolioId() || 'portfolio-demo-1';

    // -------------------------------------------------------------
    // Event: Batch Sync (Sync Balance + All Open Positions in 1 shot)
    // -------------------------------------------------------------
    if (event === 'batch_sync') {
      const { positions, balance, equity, currency, broker, login } = body;
      const portfolios = await ServerTradingRepository.getPortfolios();
      
      // Smart find portfolio by ID or by login number
      let existing = portfolios.find(p => 
        (login && p.id === `portfolio-${login}`) ||
        (login && p.description?.includes(String(login))) ||
        p.id === targetPortfolioId
      );

      if (!existing && login) {
        // Auto-create new portfolio for this MT5 Account!
        const newPortfolio: Portfolio = {
          id: `portfolio-${login}`,
          name: `${broker ? broker.split(' ')[0] : 'MT5'} #${login}`,
          initial_balance: Number(balance || 1000),
          currency: currency || 'USD',
          description: `MT5 Account: #${login} (${broker || 'MetaTrader 5'})`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await ServerTradingRepository.savePortfolio(newPortfolio);
        existing = newPortfolio;
      } else if (existing && balance !== undefined) {
        const updatedPortfolio = {
          ...existing,
          initial_balance: Number(balance),
          currency: currency || existing.currency || 'USD',
          description: `MT5 Account: #${login || ''} (${broker || 'MetaTrader 5'})`,
          updated_at: new Date().toISOString(),
        };
        await ServerTradingRepository.savePortfolio(updatedPortfolio);
        existing = updatedPortfolio;
      }

      const activeId = existing?.id || targetPortfolioId;
      const existingTrades = await ServerTradingRepository.getTrades(activeId);
      const savedTrades: Trade[] = [];

      if (Array.isArray(positions)) {
        const currentOpenTicketIds = new Set(positions.map(p => `mt5_${p.ticket}`));

        // 1. Auto-close trades that are no longer in MT5 open positions
        for (const prevTrade of existingTrades) {
          if (prevTrade.status === 'open' && prevTrade.id.startsWith('mt5_') && !currentOpenTicketIds.has(prevTrade.id)) {
            const closedTrade: Trade = {
              ...prevTrade,
              status: 'closed',
              exit_price: prevTrade.current_price || prevTrade.entry_price,
              exit_time: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            await ServerTradingRepository.saveTrade(closedTrade);
          }
        }

        // 2. Sync / update all currently open positions
        for (const pos of positions) {
          const tradeTicketId = `mt5_${pos.ticket}`;
          const existingTrade = existingTrades.find(t => t.id === tradeTicketId);
          const side: TradeSide = 
            pos.order_type === 'BUY' || pos.order_type === 0 || String(pos.order_type).toLowerCase().includes('buy')
              ? 'long'
              : 'short';

          const openTrade: Trade = {
            id: tradeTicketId,
            portfolio_id: activeId,
            ticket: pos.ticket,
            asset: String(pos.symbol || 'UNKNOWN').replace(/\.raw|\.pro|\.m|\.a|\.s/gi, '').toUpperCase(),
            side,
            entry_price: Number(pos.open_price || 0),
            current_price: pos.current_price ? Number(pos.current_price) : undefined,
            sl: pos.sl ? Number(pos.sl) : undefined,
            tp: pos.tp ? Number(pos.tp) : undefined,
            size: Number(pos.lots || 0.01),
            fee: Math.abs(Number(pos.commission || 0)) + Math.abs(Number(pos.swap || 0)),
            entry_time: pos.open_time ? new Date(pos.open_time).toISOString() : (existingTrade?.entry_time || new Date().toISOString()),
            notes: `Auto-synced from MT5 (Ticket: #${pos.ticket})${pos.comment ? ` | Comment: ${pos.comment}` : ''}`,
            status: 'open',
            pnl: Number(pos.profit || 0),
            pnl_percentage: 0,
            r_multiple: 0,
            created_at: existingTrade?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          await ServerTradingRepository.saveTrade(openTrade);
          savedTrades.push(openTrade);
        }
      }

      return NextResponse.json({
        success: true,
        action: 'batch_synced',
        balance: Number(balance),
        equity: Number(equity || balance),
        synced_positions_count: savedTrades.length,
        positions: savedTrades
      });
    }

    // -------------------------------------------------------------
    // Event: Account Sync (Sync Live Balance, Equity, Currency)
    // -------------------------------------------------------------
    if (event === 'account_sync') {
      const portfolios = await ServerTradingRepository.getPortfolios();
      const existing = portfolios.find(p => p.id === targetPortfolioId) || portfolios[0];
      
      if (existing && balance !== undefined) {
        const updatedPortfolio = {
          ...existing,
          initial_balance: Number(balance),
          currency: currency || existing.currency || 'USD',
          description: `MT5 Live Account: #${login || ''} (${broker || 'MetaTrader 5'})`,
          updated_at: new Date().toISOString(),
        };
        await ServerTradingRepository.savePortfolio(updatedPortfolio);
        return NextResponse.json({
          success: true,
          action: 'account_synced',
          balance: Number(balance),
          equity: Number(equity || balance),
          portfolio: updatedPortfolio
        });
      }
      return NextResponse.json({ success: true, action: 'account_sync_acknowledged' });
    }

    if (!symbol || !ticket) {
      return NextResponse.json(
        { error: 'Missing required fields (symbol, ticket)' },
        { status: 400 }
      );
    }

    // Normalize side
    const side: TradeSide = 
      order_type === 'BUY' || order_type === 0 || String(order_type).toLowerCase().includes('buy')
        ? 'long'
        : 'short';

    const tradeTicketId = `mt5_${position_ticket || ticket}`;
    const totalFee = Math.abs(Number(commission || 0)) + Math.abs(Number(swap || 0));

    const existingTrades = await ServerTradingRepository.getTrades(targetPortfolioId);
    const existingTrade = existingTrades.find((t) => t.id === tradeTicketId);

    // -------------------------------------------------------------
    // Event: Deal Open
    // -------------------------------------------------------------
    if (event === 'deal_open' || (!existingTrade && !close_price)) {
      const newTrade: Trade = {
        id: tradeTicketId,
        portfolio_id: targetPortfolioId,
        asset: symbol.replace(/\.raw|\.pro|\.m|\.a|\.s/gi, '').toUpperCase(),
        side,
        entry_price: Number(open_price || 0),
        sl: sl ? Number(sl) : undefined,
        tp: tp ? Number(tp) : undefined,
        size: Number(lots || 1.0),
        fee: totalFee,
        entry_time: open_time ? new Date(open_time).toISOString() : new Date().toISOString(),
        notes: `Auto-synced from MT5 (Ticket: #${ticket})${comment ? ` | Comment: ${comment}` : ''}`,
        status: 'open',
        pnl: 0,
        pnl_percentage: 0,
        r_multiple: 0,
        created_at: new Date().toISOString(),
      };

      await ServerTradingRepository.saveTrade(newTrade);
      return NextResponse.json({
        success: true,
        action: 'created_open_trade',
        trade: newTrade,
      });
    }

    // -------------------------------------------------------------
    // Event: Deal Close
    // -------------------------------------------------------------
    if (event === 'deal_close' || close_price || profit !== undefined) {
      const entryPrice = existingTrade ? existingTrade.entry_price : Number(open_price || close_price);
      const exitPrice = Number(close_price || open_price);
      const size = existingTrade ? existingTrade.size : Number(lots || 1.0);
      const fee = (existingTrade ? existingTrade.fee : 0) + totalFee;
      
      const pnlCalc = calculatePnL(
        existingTrade ? existingTrade.side : side,
        entryPrice,
        exitPrice,
        size,
        fee,
        symbol
      );

      // Use MT5 profit if provided or calculate formula
      const netPnL = profit !== undefined ? Number((Number(profit) - fee).toFixed(2)) : pnlCalc.pnl;
      const rMultiple = existingTrade?.sl ? calculateRMultiple(existingTrade.side, entryPrice, exitPrice, existingTrade.sl) : 0;

      const closedTrade: Trade = {
        id: tradeTicketId,
        portfolio_id: targetPortfolioId,
        asset: (existingTrade ? existingTrade.asset : symbol).replace(/\.raw|\.pro|\.m|\.a|\.s/gi, '').toUpperCase(),
        side: existingTrade ? existingTrade.side : side,
        entry_price: entryPrice,
        sl: existingTrade?.sl || (sl ? Number(sl) : undefined),
        tp: existingTrade?.tp || (tp ? Number(tp) : undefined),
        exit_price: exitPrice,
        size,
        fee,
        entry_time: existingTrade ? existingTrade.entry_time : (open_time ? new Date(open_time).toISOString() : new Date().toISOString()),
        exit_time: close_time ? new Date(close_time).toISOString() : new Date().toISOString(),
        notes: existingTrade?.notes || `Auto-synced from MT5 (Ticket: #${ticket})`,
        lessons_learned: profit && Number(profit) > 0 ? 'ไม้กำไรตามระบบ MT5' : 'ไม้ขาดทุนบันทึกจาก MT5',
        status: 'closed',
        pnl: netPnL,
        pnl_percentage: pnlCalc.pnlPercentage,
        r_multiple: rMultiple,
        created_at: existingTrade ? existingTrade.created_at : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await ServerTradingRepository.saveTrade(closedTrade);
      return NextResponse.json({
        success: true,
        action: 'closed_trade',
        trade: closedTrade,
      });
    }

    return NextResponse.json({ success: true, message: 'Event ignored or trade unmodified' });
  } catch (error: any) {
    console.error('MT5 Webhook error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    service: 'Trading Journal MT5 Sync Webhook',
    timestamp: new Date().toISOString(),
    guide: 'Send POST requests with trade JSON payload',
  });
}
