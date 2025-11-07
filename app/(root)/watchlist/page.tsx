import { Star } from 'lucide-react';
import { searchStocks } from '@/lib/actions/finnhub.actions';
import SearchCommand from '@/components/SearchCommand';
import { getWatchlistWithData } from '@/lib/actions/watchlist.actions';
import { WatchlistTable } from '@/components/WatchlistTable';
import PortfolioRiskMeter from '@/components/PortfolioRiskMeter';

const Watchlist = async () => {
   const watchlist = await getWatchlistWithData(); 
  
  //  Fetch minimal data for Risk Calculator
  const riskWatchlist = watchlist.map(item => ({
    symbol: item.symbol,
    company: item.company,
    stock: { sector: item.stock.sector },
    currentData: item.currentData
  }));

  const initialStocks = await searchStocks();

  if (watchlist.length === 0) {
    // ... empty state
  }

  return (
    <section className="watchlist">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="watchlist-title">Watchlist</h2>
          <SearchCommand initialStocks={initialStocks} />
        </div>
        
        <PortfolioRiskMeter watchlist={riskWatchlist} />
        
        <WatchlistTable watchlist={watchlist} />
      </div>
    </section>
  );
};

export default Watchlist;