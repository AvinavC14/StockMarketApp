interface RuntimeWatchlistItem {
  symbol: string;
  company: string;
  stock: {
    sector: string;
  };
  currentData: {
    c: number;
    h: number;
    l: number;
  } | null;
}


const RISK_THRESHOLDS = {
  LOW: 30,      
  MEDIUM: 60,   
  HIGH: 100     
};

export const calculatePortfolioRisk = (watchlist: RuntimeWatchlistItem[]) => {
  if (watchlist.length === 0) {
    return { score: 0, level: 'LOW', volatility: 0 };
  }

  const volatilityScores = watchlist.map(item => {
    const quote = item.currentData;
    if (!quote?.h || !quote?.l || !quote?.c) return 0;

    const intradayRange = quote.h - quote.l;
    const normalizedVol = intradayRange / Math.abs(quote.c || 1);
    const sectorVolatility = getSectorVolatility(item.stock.sector);
    
    return normalizedVol * sectorVolatility;
  });

  const avgVolatility = volatilityScores.reduce((a, b) => a + b, 0) / watchlist.length;
  const concentrationRisk = calculateConcentrationRisk(watchlist);
  
  // Keep internal math in 0–1, then scale to 0–100 at the end
  const rawScore01 = (avgVolatility * 0.7) + (concentrationRisk * 0.3);
  const clamped01 = Math.min(Math.max(rawScore01, 0), 1);
  const score = Math.round(clamped01 * 100);

  return {
    score,
    level: getRiskLevel(score), 
    volatility: avgVolatility
  };
};

const getSectorVolatility = (sector: string) => {
  const sectorVols: Record<string, number> = {
    'Technology': 1.3,
    'Healthcare': 1.1,
    'Energy': 1.5,
    'Finance': 1.2,
    'Consumer': 0.9,
    'default': 1.0
  };
  return sectorVols[sector] || sectorVols.default;
};

const calculateConcentrationRisk = (watchlist: RuntimeWatchlistItem[]) => {
  if (watchlist.length < 3) return 0.8;
  if (watchlist.length > 10) return 0.2;

  const sectorCounts = watchlist.reduce((acc, item) => {
    const sector = item.stock?.sector || 'Unknown';
    acc[sector] = (acc[sector] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const total = watchlist.length;
  const hhi = Object.values(sectorCounts).reduce((sum, count) => 
    sum + Math.pow(count / total, 2), 0
  );

  return Math.min(hhi * 2, 1);
};


const getRiskLevel = (score: number): 'LOW' | 'MEDIUM' | 'HIGH' => {
  if (score < RISK_THRESHOLDS.LOW) return 'LOW';
  if (score < RISK_THRESHOLDS.MEDIUM) return 'MEDIUM';
  return 'HIGH';
};