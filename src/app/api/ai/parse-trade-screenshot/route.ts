import { NextRequest, NextResponse } from 'next/server';
import { ServerTradingRepository } from '@/lib/storage/server';
import { ParsedTradeCandidate, TradeSide } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for multi-image vision analysis

// Per-Gemini-call budget. Images are processed concurrently and each image
// tries at most MODELS_TO_TRY.length models, so worst-case wall time for the
// whole request is bounded by GEMINI_CALL_TIMEOUT_MS * MODELS_TO_TRY.length
// regardless of how many images are in the batch — otherwise a large batch
// (or a single hung upstream call) blows past maxDuration and Vercel returns
// a 504 before we ever get a response back.
const GEMINI_CALL_TIMEOUT_MS = 15000;

// Active Google AI Studio models. The Gemini 2.5 line is being sunset for
// new API keys/projects — Google's own 404 response for gemini-2.5-flash-lite
// pointed us at gemini-3.5-flash-lite as the replacement — so this leads with
// the 3.5 generation, pinned explicitly since even "-latest" aliases can
// still resolve to a model that's blocked for a given key. Kept as a list
// (not a single model) so a transient outage or a future retirement of one
// model still falls through to a working one instead of failing outright.
const MODELS_TO_TRY = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-flash-latest'];

const OCR_SYSTEM_PROMPT = `
You are an expert OCR parser for MetaTrader 5 (MT5) mobile trade history screenshots.
Analyze the provided MT5 screenshot image and extract ONLY the closed trading deals/positions.

STRICT INSTRUCTIONS:
1. IGNORE all balance / deposit / withdrawal / credit rows (e.g. "Balance", "Credit", "EXP01", "EXP06", "CD-...", "CW-...").
2. DO NOT extract half-visible or cut-off rows at the very top (under the header bar) or very bottom edge. Only extract fully visible trade rows.
3. For each trade row, carefully align the open price on the left and profit on the right along the same horizontal line.
4. Extract the following fields:
   - symbol: Asset name without broker suffixes (e.g. "GOLD" from "GOLD", "GOLD.raw", "XAUUSD")
   - side: "BUY" or "SELL" (from "buy 0.01" or "sell 0.01")
   - lots: Lot size / volume (e.g. 0.01)
   - open_price: The entry price on the left before the arrow (e.g. in "4656.59 -> 4650.71", open_price is 4656.59)
   - close_price: The exit price on the right after the arrow (e.g. in "4656.59 -> 4650.71", close_price is 4650.71)
   - profit: Net profit/loss number on the right (e.g. -5.88, 21.11, 23.09). Red with minus is negative.
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

async function processImage(
  rawImage: string,
  imgIdx: number,
  apiKey: string
): Promise<{ candidates: ParsedTradeCandidate[]; errorText: string }> {
  let base64Data = rawImage;
  let mimeType = 'image/jpeg';

  if (rawImage.includes(';base64,')) {
    const parts = rawImage.split(';base64,');
    mimeType = parts[0].replace('data:', '') || 'image/jpeg';
    base64Data = parts[1];
  }
  base64Data = base64Data.replace(/[\r\n\s]/g, '');

  let parsed: any = null;
  let lastErrorText = '';

  for (const modelName of MODELS_TO_TRY) {
    try {
      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`;
      const response = await fetch(geminiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(GEMINI_CALL_TIMEOUT_MS),
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: PROMPT_TEXT },
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
      if (parsed && Array.isArray(parsed.trades)) {
        break; // Successfully parsed!
      }
    } catch (mErr: any) {
      lastErrorText = mErr.name === 'TimeoutError' ? `${modelName} timed out` : mErr.message || String(mErr);
    }
  }

  if (!parsed || !Array.isArray(parsed.trades)) {
    console.error(`Failed to parse image #${imgIdx + 1}:`, lastErrorText);
    return { candidates: [], errorText: lastErrorText };
  }

  const candidates: ParsedTradeCandidate[] = parsed.trades.map((item: any) => {
    const side: TradeSide = String(item.side).toUpperCase().includes('BUY') ? 'long' : 'short';

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

    return {
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
    };
  });

  return { candidates, errorText: '' };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { images, apiKey: customApiKey, portfolioId } = body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    const rawKey = customApiKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
    const apiKey = rawKey.trim().replace(/^["']|["']$/g, '');

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

    // Process every image concurrently — sequential processing multiplies
    // per-image latency by the batch size and was the cause of 504 Gateway
    // Timeout on multi-screenshot uploads.
    const results = await Promise.all(
      images.map((rawImage: string, imgIdx: number) => processImage(rawImage, imgIdx, apiKey))
    );

    const allParsedCandidates: ParsedTradeCandidate[] = results.flatMap((r) => r.candidates);
    const lastErrorSummary = results.find((r) => r.errorText)?.errorText || '';

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

    // -------------------------------------------------------------
    // Occurrence-Aware Cross-Image Deduplication Engine
    // -------------------------------------------------------------
    // Fingerprint: asset_side_entryPrice_exitPrice
    // Tracks maximum occurrence per image to perfectly handle screenshot scroll overlap
    const getPriceSignature = (t: ParsedTradeCandidate) => {
      const entryP = Number(t.entry_price || 0).toFixed(2);
      const exitP = Number(t.exit_price || 0).toFixed(2);
      if (exitP !== '0.00') {
        return `${t.asset}_${t.side}_${entryP}_${exitP}`;
      }
      const pnlVal = Number(t.pnl || 0).toFixed(2);
      return `${t.asset}_${t.side}_${entryP}_${pnlVal}`;
    };

    // Track seen occurrences across images: Map<signature, countAccepted>
    const globalSeenOccurrences = new Map<string, number>();
    // Track per-image occurrence count: Map<`${imgIdx}_${signature}`, occurrenceNum>
    const imageOccurrences = new Map<string, number>();

    const deduplicatedResults: ParsedTradeCandidate[] = [];
    let newCount = 0;
    let duplicateCount = 0;

    for (const candidate of allParsedCandidates) {
      const sig = getPriceSignature(candidate);
      const imgIdx = candidate.sourceImageIndex || 1;

      const imgKey = `${imgIdx}_${sig}`;
      const occurrenceInThisImage = (imageOccurrences.get(imgKey) || 0) + 1;
      imageOccurrences.set(imgKey, occurrenceInThisImage);

      const alreadyAcceptedCount = globalSeenOccurrences.get(sig) || 0;

      // If this occurrence index for this signature was already seen in a prior image, it's a scroll overlap!
      if (occurrenceInThisImage <= alreadyAcceptedCount) {
        duplicateCount++;
        deduplicatedResults.push({
          ...candidate,
          isDuplicate: true,
          duplicateReason: 'ตรวจพบซ้ำจากขอบภาพที่เลื่อนต่อเนื่องกัน (Overlap)',
        });
        continue;
      }

      // Check against Database trades
      const dbMatch = existingTrades.find((dbTrade) => {
        if (candidate.ticket && (dbTrade.id === `mt5_${candidate.ticket}` || dbTrade.ticket == candidate.ticket)) {
          return true;
        }
        return getPriceSignature(dbTrade) === sig;
      });

      if (dbMatch) {
        duplicateCount++;
        deduplicatedResults.push({
          ...candidate,
          isDuplicate: true,
          duplicateReason: `มีอยู่ในระบบแล้ว (${dbMatch.asset} PnL: ${dbMatch.pnl})`,
        });
      } else {
        // Accept as new trade and increment global accepted count
        globalSeenOccurrences.set(sig, alreadyAcceptedCount + 1);
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
