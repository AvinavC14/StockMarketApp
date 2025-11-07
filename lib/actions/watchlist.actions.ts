'use server';
import {
  formatPrice,
  formatChangePercent,
  formatMarketCapValue
} from '@/lib/utils';

import { revalidatePath } from 'next/cache';
import { auth } from '../better-auth/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {Watchlist} from '@/database/models/watchlist.model';
import { getStocksDetails } from './finnhub.actions';


// Add stock to watchlist
export const addToWatchlist = async (symbol: string, company: string) => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) redirect('/sign-in');


    const existingItem = await Watchlist.findOne({
      userId: session.user.id,
      symbol: symbol.toUpperCase(),
    });

    if (existingItem) return { success: false, error: 'Stock already in watchlist' };

    const newItem = new Watchlist({
      userId: session.user.id,
      email: session.user.email,
      symbol: symbol.toUpperCase(),
      company: company.trim(),
    });

    await newItem.save();
    revalidatePath('/watchlist');
  console.log(`Added ${symbol} to watchlist for mail: ${session.user.email}`);
    return { success: true, message: `Stock added in watchlist for  ${session.user.email}`};
  } catch (error) {
    console.error('Error adding to watchlist:', error);
    throw new Error('Failed to add stock to watchlist');
  }
};

// Remove stock from watchlist
export const removeFromWatchlist = async (symbol: string) => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) redirect('/sign-in');

    await Watchlist.deleteOne({
      userId: session.user.id,
      symbol: symbol.toUpperCase(),
    });

    revalidatePath('/watchlist');
    return { success: true, message: 'Stock removed from watchlist' };
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    throw new Error('Failed to remove stock from watchlist');
  }
};

//  Get user’s watchlist
export const getUserWatchlist = async () => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) redirect('/sign-in');

    const watchlist = await Watchlist.find({ userId: session.user.id })
      .sort({ addedAt: -1 })
      .lean();

    return JSON.parse(JSON.stringify(watchlist));
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    throw new Error('Failed to fetch watchlist');
  }
};

// Get watchlist with live data

export const getWatchlistWithData = async () => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) redirect('/sign-in');

    const watchlist = await Watchlist.find({ userId: session.user.id })
      .sort({ addedAt: -1 })
      .lean();

    if (watchlist.length === 0) return [];

    const enrichedWatchlist = await Promise.all(
      watchlist.map(async (item) => {
        try {
          const stockData = await getStocksDetails(item.symbol);
          
          
          return {
            // Fields for WatchlistTable
            _id: item._id.toString(),
            userId: session.user.id,
            symbol: item.symbol,
            company: item.company,
            addedAt: item.addedAt,
            currentPrice: stockData?.currentPrice || 0,
            changePercent: stockData?.changePercent || 0,
            priceFormatted: stockData?.currentPrice ? formatPrice(stockData.currentPrice) : '—',
            changeFormatted: stockData?.changePercent ? formatChangePercent(stockData.changePercent) : '—',
            marketCap: stockData?.marketCap ? formatMarketCapValue(stockData.marketCap * 1e6) : '—',
            peRatio: stockData?.peRatio?.toFixed(1) || '—',
            
            // Fields for Risk Calculator (nested structure)
            stock: {
              sector: stockData?.sector || 'Unknown'
            },
            currentData: stockData?.currentPrice ? {
              c: stockData.currentPrice,
              h: stockData.dayHigh || stockData.currentPrice * 1.02,
              l: stockData.dayLow || stockData.currentPrice * 0.98
            } : null
          };
        } catch (error) {
          console.warn(`Failed to fetch ${item.symbol}`);
          return {
            _id: item._id.toString(),
            userId: session.user.id,
            symbol: item.symbol,
            company: item.company,
            addedAt: item.addedAt,
            currentPrice: 0,
            changePercent: 0,
            priceFormatted: '—',
            changeFormatted: '—',
            marketCap: '—',
            peRatio: '—',
            stock: { sector: 'Unknown' },
            currentData: null
          };
        }
      })
    );

    return enrichedWatchlist;
  } catch (error) {
    console.error('Error loading watchlist:', error);
    return [];
  }
};



export const getWatchlistSymbolsByEmail = async (email: string) => {
  try {
    const items = await Watchlist.find({ email }).lean();
    console.log(`Found ${items.length} watchlist items for email: ${email}`);
    
    return items.map((i) => i.symbol.toUpperCase());
  } catch (error) {
    console.error('Error fetching watchlist symbols:', error);
    return [];
  }
};
