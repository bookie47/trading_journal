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
          error: 'Gemini API Key is required. Please provide an API key or configure GEMINI_API_KEY in settings.' 
        }, 
        { status: 401 }
      );
    }

    const targetPortfolioId = portfolioId || ServerTradingRepository.getActivePortfolioId() || 'portfolio-demo-1';
    const existingTrades = await ServerTradingRepository.getTrades(targetPortfolioId);

    const allParsedCandidates: ParsedTradeCandidate[] = [];

    // Process each image with Gemini Vision
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
You are an expert financial OCR assistant specializing in MetaTrader 5 (MT5) and MetaTrader 4 (MT4) trade history screenshots.
Analyze this screenshot carefully and extract ALL completed closed trades / deals shown in the table.

For each trade row, extract:
- ticket: string or number (e.g. 228658079 or deal ID if shown, otherwise null)
- symbol: string (e.g. "GOLD", "XAUUSD", "EURUSD", convert lowercase "gold" to "GOLD")
- side: "BUY" or "SELL"
- lots: number (e.g. 0.01, 0.5, 1.0)
- open_price: number (entry price, e.g. 4658.07)
- close_price: number (exit price, e.g. 4675.18)
- sl: number or null (Stop Loss if shown)
- tp: number or null (Take Profit if shown)
- profit: number (net profit in currency, e.g. 19.08 or -10.50)
- open_time: string (e.g. "2026.08.24 15:43:14" or "2026-08-24T15:43:14Z")
- close_time: string (e.g. "2026.08.24 16:15:00" or same as open_time if single timestamp)
- fee: number (sum of commission + swap, default 0)

Respond ONLY with valid JSON in this exact structure without markdown backticks:
{
  "trades": [
    {
      "ticket": "228658079",
      "symbol": "GOLD",
      "side": "BUY",
      "lots": 0.01,
      "open_price": 4658.07,
      "close_price": 4675.18,
      "sl": null,
      "tp": null,
      "profit": 19.08,
      "open_time": "2026-08-24 15:43:14",
      "close_time": "2026-08-24 16:00:00",
      "fee": 0
    }
  ]
}
`;

      try {
        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const response = await fetch(geminiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: promptText },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              response_mime_type: 'application/json',
            },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`Gemini API error on image ${imgIdx + 1}:`, errText);
          continue;
        }

        const data = await response.json();
        const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const parsed = JSON.parse(rawContent.trim());

        if (Array.isArray(parsed.trades)) {
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
      } catch (geminiErr) {
        console.error(`Error parsing image ${imgIdx + 1} with Gemini:`, geminiErr);
      }
    }

    // -------------------------------------------------------------
    // Smart Deduplication Engine
    // -------------------------------------------------------------
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
