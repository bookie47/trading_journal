import { NextRequest, NextResponse } from 'next/server';
import { ServerTradingRepository } from '@/lib/storage/server';
import { ParsedTradeCandidate, TradeSide } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for multi-image vision analysis

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { images, apiKey: customApiKey, portfolioId } = body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    const apiKey = customApiKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { 
          error: 'Gemini API Key is required. Please add GEMINI_API_KEY in Vercel Environment Variables.' 
        }, 
        { status: 401 }
      );
    }

    const targetPortfolioId = portfolioId || ServerTradingRepository.getActivePortfolioId() || 'portfolio-demo-1';
    const existingTrades = await ServerTradingRepository.getTrades(targetPortfolioId);

    const allParsedCandidates: ParsedTradeCandidate[] = [];

    // Process each image with Gemini Vision
    let lastErrorSummary = '';
    for (let imgIdx = 0; imgIdx < images.length; imgIdx++) {
      const rawImage = images[imgIdx];
      let base64Data = rawImage;
      let mimeType = 'image/jpeg';

      if (rawImage.includes(';base64,')) {
        const parts = rawImage.split(';base64,');
        mimeType = parts[0].replace('data:', '') || 'image/jpeg';
        base64Data = parts[1];
      }

      const promptText = `
You are an expert financial OCR assistant specializing in MetaTrader 5 (MT5) mobile app (iOS and Android) trade history screenshots.
Analyze this screenshot carefully and extract ALL completed trading deals (BUY / SELL trades).

CRITICAL RULES:
1. DO NOT include Balance transactions, Deposits, Withdrawals, Credits, or Broker fees (e.g. ignore rows with "Balance", "Credit", "Credit Out", "Credit-In", "CD-SC-BWR", "EXP01", "CW-PTD-BWR").
2. ONLY extract actual trading deals (e.g. "GOLD buy 0.01", "EURUSD sell 0.10", "XAUUSD buy 0.05").
3. For each trade row:
   - symbol: Standard symbol name (e.g. "GOLD", "XAUUSD", "EURUSD")
   - side: "BUY" or "SELL"
   - lots: Lot size / volume (e.g. 0.01)
   - open_price: The entry price on the left before the arrow (e.g. in "4656.59 -> 4650.71", open_price is 4656.59)
   - close_price: The exit price on the right after the arrow (e.g. in "4656.59 -> 4650.71", close_price is 4650.71)
   - profit: Net profit/loss number on the right. If colored red with a minus sign (e.g. -5.88), profit is negative -5.88. If colored blue/white without minus (e.g. 21.11), profit is positive 21.11.
   - close_time: The timestamp under the price (e.g. "2026.08.24 15:32:53")
   - ticket: Deal ticket number if visible, otherwise null.

Respond ONLY with valid JSON in this exact structure without markdown backticks:
{
  "trades": [
    {
      "symbol": "GOLD",
      "side": "BUY",
      "lots": 0.01,
      "open_price": 4656.59,
      "close_price": 4650.71,
      "sl": null,
      "tp": null,
      "profit": -5.88,
      "open_time": "2026-08-24 15:32:53",
      "close_time": "2026-08-24 15:32:53",
      "fee": 0
    }
  ]
}
`;

      let parsed: any = null;
      let lastErrorText = '';

      // Try gemini-1.5-flash first, fallback to gemini-2.0-flash, gemini-1.5-pro
      const modelsToTry = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];

      for (const modelName of modelsToTry) {
        try {
          const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`;
          const response = await fetch(geminiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: promptText },
                    {
                      inlineData: {
                        mimeType: mimeType,
                        data: base64Data,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.1,
                responseMimeType: 'application/json',
              },
            }),
          });

          if (!response.ok) {
            lastErrorText = await response.text();
            console.warn(`Gemini model ${modelName} returned status ${response.status}:`, lastErrorText);
            continue;
          }

          const data = await response.json();
          let rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
          
          // Strip potential markdown ```json ... ``` blocks
          rawContent = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
          parsed = JSON.parse(rawContent);
          if (parsed && Array.isArray(parsed.trades) && parsed.trades.length > 0) {
            break; // Successfully parsed!
          }
        } catch (mErr: any) {
          lastErrorText = mErr.message || String(mErr);
        }
      }

      if (!parsed || !Array.isArray(parsed.trades)) {
        lastErrorSummary = lastErrorText;
        console.error(`Failed to parse image #${imgIdx + 1}:`, lastErrorText);
        continue;
      }

      for (const item of parsed.trades) {
        const side: TradeSide = 
          String(item.side).toUpperCase().includes('BUY') ? 'long' : 'short';

        let entryTimeISO = new Date().toISOString();
        if (item.open_time) {
          const parsedDate = new Date(String(item.open_time).replace(/\./g, '-'));
          if (!isNaN(parsedDate.getTime())) {
            entryTimeISO = parsedDate.toISOString();
          }
        }

        let exitTimeISO = entryTimeISO;
        if (item.close_time) {
          const parsedDate = new Date(String(item.close_time).replace(/\./g, '-'));
          if (!isNaN(parsedDate.getTime())) {
            exitTimeISO = parsedDate.toISOString();
          }
        }

        allParsedCandidates.push({
          ticket: item.ticket || undefined,
          asset: String(item.symbol || 'GOLD').replace(/\.raw|\.pro|\.m|\.a|\.s/gi, '').toUpperCase(),
          side,
          size: Number(item.lots || 0.01),
          entry_price: Number(item.open_price || item.price || 0),
          exit_price: item.close_price ? Number(item.close_price) : undefined,
          sl: item.sl ? Number(item.sl) : undefined,
          tp: item.tp ? Number(item.tp) : undefined,
          pnl: Number(item.profit || 0),
          fee: Number(item.fee || 0),
          entry_time: entryTimeISO,
          exit_time: exitTimeISO,
          sourceImageIndex: imgIdx + 1,
          notes: `AI Scanned from Screenshot #${imgIdx + 1}${item.ticket ? ` | Ticket #${item.ticket}` : ''}`,
        });
      }
    }

    // -------------------------------------------------------------
    // Smart Deduplication Engine
    // -------------------------------------------------------------
    if (allParsedCandidates.length === 0) {
      return NextResponse.json(
        { 
          error: lastErrorSummary 
            ? `Gemini Error: ${lastErrorSummary.slice(0, 200)}` 
            : 'AI ไม่สามารถอ่านรายการเทรดจากรูปภาพได้ โปรดตรวจสอบ GEMINI_API_KEY ใน Vercel Environment Variables' 
        }, 
        { status: 400 }
      );
    }

    const seenBatchKeys = new Set<string>();
    const deduplicatedResults: ParsedTradeCandidate[] = [];

    // Fingerprint helper
    const getFingerprint = (t: { ticket?: any; asset: string; entry_price: number; size: number; pnl: number; entry_time: string }) => {
      if (t.ticket) return `ticket_${t.ticket}`;
      // Normalized signature: asset_price_size_pnl_timeMinute
      const timeMinute = t.entry_time.slice(0, 16);
      return `${t.asset}_${t.entry_price}_${t.size}_${t.pnl}_${timeMinute}`;
    };

    let newCount = 0;
    let duplicateCount = 0;

    for (const candidate of allParsedCandidates) {
      const fingerprint = getFingerprint(candidate);

      // Check 1: Duplicate inside current batch (e.g. image 1 and image 2 overlap)
      if (seenBatchKeys.has(fingerprint)) {
        duplicateCount++;
        deduplicatedResults.push({
          ...candidate,
          isDuplicate: true,
          duplicateReason: 'ซ้ำกับภาพอื่นในชุดเดียวกัน (Batch overlap)',
        });
        continue;
      }
      seenBatchKeys.add(fingerprint);

      // Check 2: Duplicate with existing database trades
      const dbMatch = existingTrades.find((dbTrade) => {
        if (candidate.ticket && (dbTrade.id === `mt5_${candidate.ticket}` || dbTrade.ticket == candidate.ticket)) {
          return true;
        }
        const dbFingerprint = getFingerprint(dbTrade);
        return dbFingerprint === fingerprint;
      });

      if (dbMatch) {
        duplicateCount++;
        deduplicatedResults.push({
          ...candidate,
          isDuplicate: true,
          duplicateReason: `มีอยู่ในสมุดบันทึกแล้ว (${dbMatch.asset} #${candidate.ticket || dbMatch.id})`,
        });
      } else {
        newCount++;
        deduplicatedResults.push({
          ...candidate,
          isDuplicate: false,
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalParsed: allParsedCandidates.length,
      newCount,
      duplicateCount,
      trades: deduplicatedResults,
    });
  } catch (error: any) {
    console.error('Error in /api/ai/parse-trade-screenshot:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
