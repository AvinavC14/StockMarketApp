'use client';

import { useEffect, useState } from 'react';

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

// Donut chart component
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

export default function PortfolioRiskMeter() {
  const [riskData, setRiskData] = useState({
    score: 0,
    level: 'LOW' as RiskLevel,
    volatility: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/risk-score');
      if (!response.ok) throw new Error('Failed to fetch risk data');
      
      const data = await response.json();
      setRiskData(data);
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
    //const interval = setInterval(fetchData, 120000); // Every 2 minutes
    //return () => clearInterval(interval);
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

  return (
    <div className="border rounded-lg p-6 shadow-sm bg-card max-w-xs">
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-medium text-foreground">Portfolio Health Score</h3>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorClass.replace('text-', 'bg-')} text-white`}>
          {riskData.level} RISK
        </span>
      </div>
      
      {/* Donut Chart */}
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
    </div>
  );
}