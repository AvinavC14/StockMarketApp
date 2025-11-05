'use client';

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TrendingUp, AlertCircle, Loader2, RefreshCw, List } from "lucide-react";
import Link from "next/link";

interface Recommendation {
  symbol: string;
  reason: string;
  risk: string;
}

interface RecommendationResponse {
  recommendations: Recommendation[];
  strategy?: string;
  generatedAt?: string;
  watchlistCount?: number;
  refreshNote?: string;
}

const Recommendations = () => {
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/recommendations");
      const responseData = await res.json();
      
      if (res.ok) {
        setData(responseData);
      } else {
        toast.error(responseData.error || "Failed to fetch recommendations");
      }
    } catch (e) {
      console.error(e);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'low':
        return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'medium':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'high':
        return 'text-red-400 bg-red-400/10 border-red-400/20';
      default:
        return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-yellow-500" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-100">
              AI-Powered Stock Recommendations
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {data?.strategy ? `Strategy: ${data.strategy}` : 'Personalized picks based on your profile'}
            </p>
          </div>
        </div>

        
      </div>

      {/* ✅ Watchlist Context Banner */}
      {data?.watchlistCount !== undefined && data.watchlistCount > 0 && (
        <div className="p-4 border border-blue-500/20 rounded-lg bg-blue-500/5 flex items-center gap-3">
          <List className="w-5 h-5 text-blue-400" />
          <p className="text-sm text-gray-300">
            Based on your watchlist of <strong className="text-blue-400">{data.watchlistCount} stocks</strong> - 
            recommendations exclude stocks you're already tracking
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
        </div>
      )}

      {/* Empty State */}
      {!loading && (!data?.recommendations || data.recommendations.length === 0) && (
        <div className="flex flex-col items-center justify-center py-12 px-4 border border-gray-800 rounded-lg bg-gray-900/50">
          <AlertCircle className="w-12 h-12 text-gray-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">
            No recommendations available
          </h3>
          <p className="text-sm text-gray-500 text-center max-w-md mb-4">
            Complete your profile with risk tolerance and preferred industry to get personalized stock recommendations.
          </p>
          {data?.watchlistCount === 0 && (
            <Link 
              href="/watchlist"
              className="text-sm text-yellow-500 hover:text-yellow-400 underline"
            >
              Add stocks to your watchlist for better recommendations
            </Link>
          )}
        </div>
      )}

      {/* Recommendations Grid */}
      {!loading && data?.recommendations && data.recommendations.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4">
            {data.recommendations.map((rec, idx) => (
              <Link
                key={idx}
                href={`/stocks/${rec.symbol}`}
                className="group p-6 border border-gray-800 rounded-lg bg-gray-900/50 hover:bg-gray-900 hover:border-yellow-500/50 transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-gray-100 group-hover:text-yellow-500 transition-colors">
                        {rec.symbol}
                      </h3>
                      <span
                        className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getRiskColor(
                          rec.risk
                        )}`}
                      >
                        {rec.risk} Risk
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      {rec.reason}
                    </p>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center group-hover:bg-yellow-500/20 transition-colors">
                      <TrendingUp className="w-5 h-5 text-yellow-500" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Info Banner */}
          {data.refreshNote && (
            <div className="p-4 border border-purple-500/20 rounded-lg bg-purple-500/5">
              <p className="text-xs text-gray-400">
                💡 <strong className="text-purple-400">Tip:</strong> {data.refreshNote}
              </p>
            </div>
          )}
        </>
      )}

      {/* Disclaimer */}
      {!loading && data?.recommendations && data.recommendations.length > 0 && (
        <div className="p-4 border border-yellow-500/20 rounded-lg bg-yellow-500/5">
          <p className="text-xs text-gray-400">
            <strong className="text-yellow-500">Disclaimer:</strong> These recommendations are AI-generated based on your profile and watchlist. They are for informational purposes only. Always conduct your own research before making investment decisions.
          </p>
        </div>
      )}
    </div>
  );
};

export default Recommendations;