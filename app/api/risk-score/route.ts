
import { NextResponse } from 'next/server';
import { getWatchlistWithData } from '@/lib/actions/watchlist.actions';
import { calculatePortfolioRisk } from '@/lib/risk-calculator';

export async function GET() {
  try {
    const watchlist = await getWatchlistWithData();
    
    
    const riskWatchlist = watchlist.map(item => ({
      symbol: item.symbol,
      company: item.company,
      stock: {
        sector: item.stock.sector || 'Unknown'
      },
      currentData: item.currentData 
    }));

    console.log("=== RISK CALCULATOR INPUT ===");
    console.log(JSON.stringify(riskWatchlist, null, 2));
    
    const riskScore = calculatePortfolioRisk(riskWatchlist);
    console.log("=== CALCULATED RISK ===");
    console.log(JSON.stringify(riskScore, null, 2));

    return NextResponse.json(riskScore);
  } catch (error) {
    console.error('Risk calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate risk score' },
      { status: 500 }
    );
  }
}