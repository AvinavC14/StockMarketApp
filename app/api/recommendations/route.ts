import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { getWatchlistSymbolsByEmail } from "@/lib/actions/watchlist.actions";

export async function GET(req: NextRequest) {
  try {
    const { api } = await auth();
    const session = await api.getSession({ headers: await headers() });
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { riskTolerance, preferredIndustry } = user as any;
    
    if (!riskTolerance || !preferredIndustry) {
      return NextResponse.json({ 
        recommendations: []
      }, { status: 200 });
    }

    // ✅ Get user's watchlist
    const watchlistSymbols = await getWatchlistSymbolsByEmail(user.email);
    const hasWatchlist = watchlistSymbols && watchlistSymbols.length > 0;

    const geminiApiKey = process.env.GEMINI_API_KEY;
    
    if (!geminiApiKey) {
      console.error("GEMINI_API_KEY not found");
      return NextResponse.json({ 
        error: "API configuration error",
        recommendations: []
      }, { status: 500 });
    }

    const currentDate = new Date().toISOString().split('T')[0];

    // ✅ Diverse stock universes by industry
    const stockUniverses: Record<string, string[]> = {
      Technology: [
        'AAPL', 'MSFT', 'GOOGL', 'META', 'NVDA', 'AMD', 'INTC', 'ORCL', 
        'CRM', 'ADBE', 'SNOW', 'PLTR', 'NET', 'CRWD', 'ZS', 'DDOG',
        'SHOP', 'SQ', 'PYPL', 'COIN', 'RBLX', 'U', 'TEAM', 'OKTA',
        'NOW', 'WDAY', 'ZM', 'DOCU', 'TWLO', 'MDB', 'ESTC'
      ],
      Healthcare: [
        'JNJ', 'UNH', 'PFE', 'ABBV', 'TMO', 'ABT', 'DHR', 'LLY',
        'MRK', 'BMY', 'AMGN', 'GILD', 'CVS', 'CI', 'HUM', 'ISRG',
        'VRTX', 'REGN', 'BIIB', 'ZTS', 'ILMN', 'DXCM', 'ALGN',
        'TDOC', 'VEEV', 'IQV', 'EW', 'HOLX'
      ],
      Finance: [
        'JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'V', 'MA', 'AXP',
        'SCHW', 'BLK', 'SPGI', 'CME', 'ICE', 'CB', 'PGR', 'TRV',
        'AIG', 'MET', 'PRU', 'AFL', 'ALL', 'TROW', 'BK', 'STT',
        'USB', 'PNC', 'TFC', 'COF', 'DFS'
      ],
      Energy: [
        'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'PXD', 'MPC', 'PSX',
        'VLO', 'OXY', 'HAL', 'BKR', 'DVN', 'FANG', 'HES', 'MRO',
        'APA', 'CTRA', 'OVV', 'NEE', 'DUK', 'SO', 'D', 'AEP',
        'XEL', 'SRE', 'ES', 'AWK', 'ED'
      ],
      'Consumer Goods': [
        'PG', 'KO', 'PEP', 'WMT', 'COST', 'HD', 'LOW', 'TGT',
        'NKE', 'SBUX', 'MCD', 'DIS', 'NFLX', 'CMCSA', 'VZ', 'T',
        'PM', 'MO', 'CL', 'KMB', 'GIS', 'K', 'CAG', 'HSY', 'MDLZ',
        'EL', 'CLX', 'CHD', 'SJM', 'CPB'
      ]
    };

    const relevantStocks = stockUniverses[preferredIndustry] || stockUniverses.Technology;

    // ✅ Build context-aware prompt
    let watchlistContext = '';
    let exclusionNote = '';
    let diversificationNote = '';
    
    if (hasWatchlist) {
      watchlistContext = `\n\nUser's Current Watchlist:\n${watchlistSymbols.join(', ')}`;
      exclusionNote = `\n4. CRITICAL: DO NOT recommend ANY stocks that are already in the user's watchlist (${watchlistSymbols.join(', ')}). Only recommend NEW stocks.`;
      
      // Analyze watchlist for diversification suggestions
      const techStocksInWatchlist = watchlistSymbols.filter(s => 
        stockUniverses.Technology?.includes(s)
      ).length;
      
      if (techStocksInWatchlist >= 3 && preferredIndustry === 'Technology') {
        diversificationNote = `\n5. The user already has ${techStocksInWatchlist} tech stocks. Consider recommending some from related sectors for diversification.`;
      }
    }

    const prompt = `You are a stock advisor AI providing personalized recommendations. Today's date is ${currentDate}.

User Profile:
- Risk Tolerance: ${riskTolerance}
- Preferred Industry: ${preferredIndustry}${watchlistContext}

Stock Universe (choose from these): ${relevantStocks.join(', ')}

Requirements:
1. Recommend exactly 5 stocks that match the user's ${riskTolerance} risk tolerance
2. Focus on ${preferredIndustry} sector stocks
3. Provide diverse picks - mix of large-cap, mid-cap, and growth stocks${exclusionNote}${diversificationNote}
6. Each recommendation must include:
   - symbol: Stock ticker
   - reason: One compelling sentence explaining why this stock fits their profile (mention specific strengths, growth prospects, or stability factors)
   - risk: Must match or be compatible with user's ${riskTolerance} risk tolerance

${hasWatchlist ? `\nIMPORTANT CONTEXT:
The user is already tracking: ${watchlistSymbols.join(', ')}
Your recommendations should:
- Add NEW stocks they don't have yet
- Complement their existing portfolio
- Fill gaps in their watchlist coverage` : '\nThe user has an empty watchlist. Recommend foundational stocks for their portfolio.'}

Return ONLY a valid JSON array with NO markdown or extra text:
[
  { "symbol": "NVDA", "reason": "AI chip leader dominating datacenter market with 150% YoY growth and strong moat", "risk": "Medium" },
  { "symbol": "CRWD", "reason": "Cybersecurity innovator with 60%+ revenue growth and expanding enterprise adoption", "risk": "High" }
]`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.8, // Balanced creativity
            maxOutputTokens: 1500,
            topP: 0.9,
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API Error:", errorText);
      return NextResponse.json({ 
        error: "Failed to generate recommendations",
        recommendations: []
      }, { status: 500 });
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiResponse) {
      return NextResponse.json({ 
        error: "No response from AI",
        recommendations: []
      }, { status: 500 });
    }

    let parsedRecommendations: { symbol: string; reason: string; risk: string }[] = [];

    try {
      let cleanedResponse = aiResponse.trim();
      cleanedResponse = cleanedResponse.replace(/```json\s*/g, '');
      cleanedResponse = cleanedResponse.replace(/```\s*/g, '');
      cleanedResponse = cleanedResponse.trim();

      parsedRecommendations = JSON.parse(cleanedResponse);

      if (!Array.isArray(parsedRecommendations)) {
        throw new Error("Response is not an array");
      }

      // ✅ Double-check: Filter out any stocks already in watchlist
      if (hasWatchlist) {
        const watchlistSet = new Set(watchlistSymbols.map(s => s.toUpperCase()));
        parsedRecommendations = parsedRecommendations.filter(rec => 
          !watchlistSet.has(rec.symbol.toUpperCase())
        );
      }

      parsedRecommendations = parsedRecommendations.filter(rec => 
        rec.symbol && rec.reason && rec.risk
      ).slice(0, 5);

    } catch (e) {
      console.error("Failed to parse AI response:", aiResponse);
      console.error("Parse error:", e);
      
      return NextResponse.json({ 
        error: "Failed to parse recommendations",
        recommendations: []
      }, { status: 200 });
    }

    return NextResponse.json({ 
      recommendations: parsedRecommendations,
      generatedAt: currentDate,
      watchlistCount: watchlistSymbols?.length || 0,
      basedOn: {
        riskTolerance,
        preferredIndustry,
        hasWatchlist
      },
      refreshNote: hasWatchlist 
        ? "Recommendations update dynamically as you modify your watchlist" 
        : "Add stocks to your watchlist for more personalized recommendations"
    });

  } catch (error: any) {
    console.error("❌ Error fetching recommendations:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to fetch recommendations",
      recommendations: []
    }, { status: 500 });
  }
}
