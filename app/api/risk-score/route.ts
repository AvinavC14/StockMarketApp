import { NextResponse } from 'next/server';
import { getWatchlistWithData } from '@/lib/actions/watchlist.actions';
import { calculatePortfolioRisk } from '@/lib/risk-calculator';
import { getStocksDetails } from '@/lib/actions/finnhub.actions';

export async function GET() {
  try {
    const watchlist = await getWatchlistWithData();

    const enrichedWatchlist = await Promise.all(
      watchlist.map(async (item:any) => {
        try {
          const details = await getStocksDetails(item.symbol);
          return {
            ...item,
            currentData: {
              c: details.currentPrice,
              h: details.currentPrice * 1.02, // optional: intraday high proxy
              l: details.currentPrice * 0.98, // optional: intraday low proxy
            },
            stock: {
              sector: 'Technology', // or fetch actual sector if you have it
            }
          };
        } catch (err) {
          console.error(`Failed to fetch details for ${item.symbol}`, err);
          return {
            ...item,
            currentData: null
          };
        }
      })
    );

    const riskScore = calculatePortfolioRisk(enrichedWatchlist);
    return NextResponse.json(riskScore);

  } catch (error) {
    console.error('Risk calculation error:', error);
    return NextResponse.json({ error: 'Failed to calculate risk score' }, { status: 500 });
  }
}
