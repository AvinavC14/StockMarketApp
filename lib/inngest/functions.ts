import { inngest } from "@/lib/inngest/client";
import {
  NEWS_SUMMARY_EMAIL_PROMPT,
  PERSONALIZED_WELCOME_EMAIL_PROMPT,
} from "@/lib/inngest/prompts";
import { sendNewsSummaryEmail, sendWelcomeEmail } from "@/lib/nodemailer";
import { getAllUsersForNewsEmail } from "@/lib/actions/user.actions";
import { getWatchlistSymbolsByEmail } from "@/lib/actions/watchlist.actions"; // 👈 Changed this
import { getNews } from "@/lib/actions/finnhub.actions";
import { getFormattedTodayDate } from "@/lib/utils";

// Basic types used in this file
type UserForNewsEmail = {
  email: string;
  userId: string;
  name?: string;
  country?: string;
  investmentGoals?: string;
  riskTolerance?: string;
  preferredIndustry?: string;
};

type MarketNewsArticle = {
  id?: string | number;
  symbol?: string;
  datetime?: number | string;
  headline?: string;
  summary?: string;
  url?: string;
  source?: string;
  image?: string;
};

export const sendSignUpEmail = inngest.createFunction(
  { id: "sign-up-email" },
  { event: "app/user.created" },
  async ({ event, step }) => {
    const userProfile = `
            - Country: ${event.data.country}
            - Investment goals: ${event.data.investmentGoals}
            - Risk tolerance: ${event.data.riskTolerance}
            - Preferred industry: ${event.data.preferredIndustry}
        `;

    const prompt = PERSONALIZED_WELCOME_EMAIL_PROMPT.replace(
      "{{userProfile}}",
      userProfile
    );

    const response = await step.ai.infer("generate-welcome-intro", {
      model: step.ai.models.gemini({ model: "gemini-2.5-flash-lite" }),
      body: {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      },
    });

    await step.run("send-welcome-email", async () => {
      const part = response.candidates?.[0]?.content?.parts?.[0];
      const introText =
        (part && "text" in part ? part.text : null) ||
        "Thanks for joining Signalist. You now have the tools to track markets and make smarter moves.";

      const {
        data: { email, name },
      } = event;

      return await sendWelcomeEmail({ email, name, intro: introText });
    });

    return {
      success: true,
      message: "Welcome email sent successfully",
    };
  }
);

export const sendDailyNewsSummary = inngest.createFunction(
  { id: "daily-news-summary" },
  [{ event: "app/send.daily.news" }, { cron: "0 12 * * *" }],
  async ({ step }) => {
    // Step #1: Get all users for news delivery
    const users = await step.run("get-all-users", getAllUsersForNewsEmail);

    if (!users || users.length === 0)
      return { success: false, message: "No users found for news email" };

    // Step #2: For each user, get watchlist symbols -> fetch news (fallback to general)
    const results = await step.run("fetch-user-news", async () => {
      const perUser: Array<{
        user: UserForNewsEmail;
        articles: MarketNewsArticle[];
      }> = [];
      for (const user of users as unknown as UserForNewsEmail[]) {
        try {
          
          const symbols = await getWatchlistSymbolsByEmail(user.email);
          
          console.log(`\n=== DEBUG for user ${user.email} ===`);
          console.log('Symbols returned:', symbols);
          console.log('Symbols type:', typeof symbols);
          console.log('Is Array?:', Array.isArray(symbols));
          console.log('Array length:', symbols?.length);
          console.log('First symbol:', symbols?.[0]);
          console.log('Second symbol:', symbols?.[1]);
          
          let articles: MarketNewsArticle[] = [];

          // If symbols is an array, fetch for each symbol and merge results.
          if (Array.isArray(symbols) && symbols.length > 0) {
            console.log(`✅ CONDITION MET: Array with ${symbols.length} symbols`);
            console.log('Fetching news for symbols:', symbols);
            
            const articlesBySymbol = await Promise.all(
              symbols.map(async (s) => {
                console.log(`  → Fetching news for: ${s}`);
                const news = await getNews(s);
                console.log(`  → Got ${news?.length || 0} articles for ${s}`);
                return { symbol: s, articles: news || [] };
              })
            );
            
            console.log('Articles per symbol:', articlesBySymbol.map(a => a.articles.length));
            
            // ✅ Distribute articles evenly: minimum 2 per symbol, up to 6 total
            const targetTotal = 6;
            const minPerSymbol = Math.min(2, Math.floor(targetTotal / symbols.length));
            const balanced: MarketNewsArticle[] = [];
            
            // First pass: Take minimum articles from each symbol
            for (const { symbol, articles: symbolArticles } of articlesBySymbol) {
              const taken = symbolArticles.slice(0, minPerSymbol);
              balanced.push(...taken);
              console.log(`  → Took ${taken.length} articles from ${symbol}`);
            }
            
            // Second pass: Fill remaining slots by interleaving
            const remaining = targetTotal - balanced.length;
            if (remaining > 0) {
              const interleaved: MarketNewsArticle[] = [];
              const maxIndex = Math.max(...articlesBySymbol.map(s => s.articles.length));
              
              for (let i = minPerSymbol; i < maxIndex && interleaved.length < remaining; i++) {
                for (const { symbol, articles: symbolArticles } of articlesBySymbol) {
                  if (symbolArticles[i] && interleaved.length < remaining) {
                    interleaved.push(symbolArticles[i]);
                    console.log(`  → Added extra article from ${symbol}`);
                  }
                }
              }
              
              balanced.push(...interleaved);
            }
            
            articles = balanced.slice(0, targetTotal);
            console.log(`✅ Total watchlist articles: ${articles.length}`);
          } else if (typeof symbols === "string" && symbols) {
            console.log(`⚠️ CONDITION: Single string symbol`);
            articles = (await getNews(symbols)) || [];
            articles = articles.slice(0, 6);
          } else {
            console.log(`❌ CONDITION: No symbols, fetching general news`);
            console.log('Reason: Array check failed or length is 0');
            articles = (await getNews()) || [];
            articles = articles.slice(0, 6);
          }

          // Ensure fallback to general news if still empty
          if (!articles || articles.length === 0) {
            console.log("⚠️ FALLBACK: No articles from watchlist, fetching general");
            articles = (await getNews()) || [];
            articles = articles.slice(0, 6);
          }

          console.log(`📊 Final article count: ${articles.length}`);
          console.log('=== END DEBUG ===\n');

          perUser.push({ user, articles });
        } catch (e) {
          console.error("❌ ERROR preparing user news", user.email, e);
          perUser.push({ user, articles: [] });
        }
      }
      return perUser;
    });

    // Rest remains the same...
    const userNewsSummaries: {
      user: UserForNewsEmail;
      newsContent: string | null;
    }[] = [];

    for (const { user, articles } of results) {
      try {
        const prompt = NEWS_SUMMARY_EMAIL_PROMPT.replace(
          "{{newsData}}",
          JSON.stringify(articles, null, 2)
        );

        const response = await step.ai.infer(`summarize-news-${user.email}`, {
          model: step.ai.models.gemini({ model: "gemini-2.5-flash-lite" }),
          body: {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
          },
        });

        const part = response.candidates?.[0]?.content?.parts?.[0];
        const newsContent =
          (part && "text" in part ? part.text : null) || "No market news.";

        userNewsSummaries.push({ user, newsContent });
      } catch (e) {
        console.error("Failed to summarize news for : ", user.email);
        userNewsSummaries.push({ user, newsContent: null });
      }
    }

    await step.run("send-news-emails", async () => {
      await Promise.all(
        userNewsSummaries.map(async ({ user, newsContent }) => {
          if (!newsContent) return false;

          return await sendNewsSummaryEmail({
            email: user.email,
            date: getFormattedTodayDate(),
            newsContent,
          });
        })
      );
    });

    return {
      success: true,
      message: "Daily news summary emails sent successfully",
    };
  }
);