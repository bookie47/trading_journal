import { NextRequest, NextResponse } from 'next/server';

// Active Google AI Studio models. Kept as a list (not a single model) so a
// transient outage or future retirement of one model falls through to a
// working one instead of failing outright. See parse-trade-screenshot/route.ts.
const MODELS_TO_TRY = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-flash-latest'];

const PDF_PROMPT = `
You are an expert financial OCR parser for MetaTrader 5 (MT5) Statement Reports in PDF format.
Analyze the provided PDF document thoroughly and extract ONLY real numbers and closed trades actually found in this document.

Return ONLY a valid JSON object matching this schema without markdown backticks:
{
  "accountName": null,
  "accountNumber": null,
  "broker": null,
  "currency": "USD",
  "totalNetProfit": 0,
  "grossProfit": 0,
  "grossLoss": 0,
  "profitFactor": 0,
  "winRate": 0,
  "totalTrades": 0,
  "totalDeposits": 0,
  "totalWithdrawals": 0,
  "netCashProfit": 0,
  "cashROI": 0,
  "trades": []
}

CRITICAL RULES:
1. STRICTLY DO NOT fabricate, guess, or output any placeholder or example trades.
2. If the document has a Positions/Deals table with individual trade rows across its pages, extract ALL of them into "trades" array:
   - ticket: string deal/position ticket number
   - asset: string symbol (e.g. "GOLD")
   - side: "long" or "short"
   - size: lot size (e.g. 0.01)
   - entry_price: open price number
   - exit_price: close price number
   - pnl: realized profit/loss number
   - entry_time: ISO timestamp string
   - exit_time: ISO timestamp string
3. If the uploaded PDF is only a summary/chart page without individual trade rows, "trades" MUST remain an empty array [].
4. Extract the exact summary statistics from the document text:
   - totalNetProfit, grossProfit, grossLoss, profitFactor, winRate, totalTrades, totalDeposits, totalWithdrawals.
   - netCashProfit = totalWithdrawals - totalDeposits.
   - cashROI = (netCashProfit / totalDeposits) * 100.
`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pdfBase64, apiKey: customApiKey } = body;

    if (!pdfBase64) {
      return NextResponse.json({ error: 'No PDF data provided' }, { status: 400 });
    }

    const apiKey = (customApiKey || process.env.GEMINI_API_KEY || '').trim().replace(/^["']|["']$/g, '');
    if (!apiKey) {
      return NextResponse.json(
        { error: 'โปรดระบุ Gemini API Key ใน Vercel Environment Variables หรือในช่องใส่คีย์' },
        { status: 401 }
      );
    }

    let cleanBase64 = pdfBase64;
    if (pdfBase64.includes(';base64,')) {
      cleanBase64 = pdfBase64.split(';base64,')[1];
    }
    cleanBase64 = cleanBase64.replace(/[\r\n\s]/g, '');

    let parsed: any = null;
    let lastErrorText = '';

    for (const modelName of MODELS_TO_TRY) {
      try {
        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const response = await fetch(geminiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: PDF_PROMPT },
                  {
                    inlineData: {
                      mimeType: 'application/pdf',
                      data: cleanBase64,
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
          console.warn(`PDF parse model ${modelName} returned status ${response.status}:`, lastErrorText);
          continue;
        }

        const data = await response.json();
        let rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        rawContent = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
        parsed = JSON.parse(rawContent);

        if (parsed?.report?.trades) {
          parsed = parsed.report;
        }

        if (parsed && (Array.isArray(parsed.trades) || typeof parsed.totalNetProfit === 'number')) {
          if (!Array.isArray(parsed.trades)) parsed.trades = [];
          break;
        }
      } catch (err: any) {
        lastErrorText = err.message || String(err);
      }
    }

    if (!parsed) {
      return NextResponse.json(
        { error: `ไม่สามารถอ่านข้อมูลจาก PDF ได้: ${lastErrorText.slice(0, 200)}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ report: parsed });
  } catch (error: any) {
    console.error('Error in /api/ai/parse-mt5-pdf:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
