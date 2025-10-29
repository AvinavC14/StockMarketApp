// utils/symbolMapper.ts
export function mapSymbolToTradingView(symbol: string) {
  if (symbol.endsWith(".NS")) return `NSE:${symbol.replace(".NS", "")}`;
  if (symbol.endsWith(".BO")) return `BSE:${symbol.replace(".BO", "")}`;
  return symbol; // fallback for NASDAQ etc.
}
