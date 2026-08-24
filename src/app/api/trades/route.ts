import { NextRequest, NextResponse } from 'next/server';
import { ServerTradingRepository } from '@/lib/storage/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const portfolioId = searchParams.get('portfolio_id') || undefined;
    const trades = await ServerTradingRepository.getTrades(portfolioId);
    return NextResponse.json({ success: true, trades });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error fetching trades' }, { status: 500 });
  }
}
