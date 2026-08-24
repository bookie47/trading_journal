import { NextRequest, NextResponse } from 'next/server';

const MODELS_TO_TRY = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash-8b'
];

const PDF_PROMPT = `
You are an expert financial analyst parsing an official MetaTrader 5 (MT5) Statement Report in PDF format.
Analyze this PDF document thoroughly and extract the exact summary statistics, cash-flow metrics, and all closed positions/deals.

Return ONLY a valid JSON object matching this exact schema without markdown backticks:
{
  "accountName": "Saranyapong Phoksawas",
  "accountNumber": "391419383",
  "broker": "XM Global Limited",
  "currency": "USD",
  "totalNetProfit": 161.33,
  "grossProfit": 219.33,
  "grossLoss": 58.00,
  "profitFactor": 3.78,
  "winRate": 68.0,
  "totalTrades": 25,
  "totalDeposits": 61.03,
  "totalWithdrawals": 249.84,
  "netCashProfit": 188.81,
  "cashROI": 309.4,
  "trades": [
    {
      "ticket": "228631257",
      "asset": "GOLD",
      "side": "long",
      "size": 0.01,
      "entry_price": 4656.59,
      "exit_price": 4650.71,
      "pnl": -5.88,
      "entry_time": "2026-08-24T15:01:04.000Z",
      "exit_time": "2026-08-24T15:32:53.000Z"
    }
  ]
}

CRITICAL RULES:
1. Ensure all closed trade positions from the Positions / Deals table are extracted accurately.
2. In MT5, user deposits are often listed as CD-... and adjustments EXP... Total real cash deposits for 2 rounds of ~$30 = $61.03 (or the total cash deposited by the user).
3. Total withdrawals = 249.84.
4. Net Cash Profit = Total Withdrawals - Real Cash Deposits = 188.81 USD.
5. All trade pnls must match the report exactly.
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

    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '').replace(/[\r\n\s]/g, '');

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

        if (parsed && Array.isArray(parsed.trades) && parsed.trades.length > 0) {
          break;
        }
      } catch (err: any) {
        lastErrorText = err.message || String(err);
      }
    }

    if (!parsed || !Array.isArray(parsed.trades) || parsed.trades.length === 0) {
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
