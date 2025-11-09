// components/PortfolioRiskMeter.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import type { RuntimeWatchlistItem } from '@/lib/risk-calculator';

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

const RISK_COLORS = {
  LOW: 'text-green-500',
  MEDIUM: 'text-yellow-500',
  HIGH: 'text-red-500'
};

const RISK_MESSAGES = {
  LOW: 'Your portfolio is well-diversified with low volatility',
  MEDIUM: 'Moderate risk detected - consider rebalancing',
  HIGH: 'High concentration risk - immediate attention recommended'
};

const DonutChart = ({ score, size = 120 }: { score: number; size?: number }) => {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(0,0,0,0.06)"
          strokeWidth="8"
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-in-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-foreground">{score}</span>
        <span className="text-xs text-muted-foreground">/100</span>
      </div>
    </div>
  );
};

// Helper function to format time ago
const formatTimeAgo = (timestamp: number) => {
  const now = Date.now();
  const diffInSeconds = Math.floor((now - timestamp) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} min ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hr ago`;
  }
  const days = Math.floor(diffInSeconds / 86400);
  return `${days} day ago`;
};

// Helper function to format exact timestamp
const formatExactTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

export default function PortfolioRiskMeter({ watchlist }: { watchlist: RuntimeWatchlistItem[]}) {
  const [riskData, setRiskData] = useState({
    score: 0,
    level: 'LOW' as RiskLevel,
    volatility: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchTime = useRef<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/risk-score');
      if (!response.ok) throw new Error('Failed to fetch risk data');
      
      const data = await response.json();
      setRiskData(data);
      lastFetchTime.current = Date.now();
      setError(null);
    } catch (err) {
      setError('Unable to calculate risk score');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 300_000); // 2 minutes
    return () => clearInterval(interval);
  }, []);

  // Real-time clock for dynamic updates
  const [currentTime, setCurrentTime] = useState(Date.now());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-6 border rounded-lg bg-card shadow-sm w-full max-w-xs animate-pulse">
        <div className="h-6 bg-muted rounded w-3/4"></div>
        <div className="flex justify-center">
          <div className="h-32 w-32 rounded-full bg-muted"></div>
        </div>
        <div className="h-4 bg-muted rounded w-full"></div>
        <div className="h-4 bg-muted rounded w-2/3"></div>
        <div className="h-3 bg-muted rounded w-1/2"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-lg max-w-xs">
      {error}
    </div>
    );
  }

  const colorClass = RISK_COLORS[riskData.level];
  const timeAgo = lastFetchTime.current ? formatTimeAgo(lastFetchTime.current) : null;
  const exactTime = lastFetchTime.current ? formatExactTime(lastFetchTime.current) : null;

  return (
    <div className="border rounded-lg p-6 shadow-sm bg-card max-w-xs">
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-medium text-foreground">Portfolio Health Score</h3>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorClass.replace('text-', 'bg-')} text-white`}>
          {riskData.level} RISK
        </span>
      </div>
      
      <div className={`flex justify-center mb-4 ${colorClass}`}>
        <DonutChart score={riskData.score} size={120} />
      </div>
      
      <p className="text-sm text-muted-foreground mb-3 text-center">
        {RISK_MESSAGES[riskData.level]}
      </p>
      
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Volatility Index:</span>
        <span className="font-medium">{(riskData.volatility * 100).toFixed(1)}%</span>
      </div>
      
      {/* ✅ Both relative time AND exact timestamp */}
      {timeAgo && exactTime && (
        <div className="mt-3 pt-3 border-t border-gray-200/20">
          <p className="text-xs text-muted-foreground text-center">
            Last updated: {timeAgo} ({exactTime})
          </p>
        </div>
      )}
    </div>
  );
}