import { inngest } from "@/lib/inngest/client";
import { sendWhatsAppMessage } from "@/lib/twilio/sendWhatsApp.mjs";

import {
  NEWS_SUMMARY_EMAIL_PROMPT,
  PERSONALIZED_WELCOME_EMAIL_PROMPT,
} from "@/lib/inngest/prompts";
import { sendNewsSummaryEmail, sendWelcomeEmail } from "@/lib/nodemailer";
import { getAllUsersForNewsEmail } from "@/lib/actions/user.actions";
import { getWatchlistSymbolsByEmail } from "@/lib/actions/watchlist.actions";
import { getNews } from "@/lib/actions/finnhub.actions";
import { getFormattedTodayDate } from "@/lib/utils";

// === TYPES ===
type UserForNewsEmail = {
  email: string;
  userId: string;
  name?: string;
  phone?: string; // ✅ added for WhatsApp
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

// === FUNCTION #1: Welcome Email ===
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
      model: step.ai.models.gemini({ model: "gemini-2.5-pro" }),
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

// === FUNCTION #2: Daily News Summary (Email + WhatsApp) ===
export const sendDailyNewsSummary = inngest.createFunction(
  { id: "daily-news-summary" },
  [{ event: "app/send.daily.news" }, { cron: "0 12 * * *" }], // every day at 12:00 PM
  async ({ step }) => {
    // Step #1: Get all users
    const users = await step.run("get-all-users", getAllUsersForNewsEmail);
    if (!users || users.length === 0)
      return { success: false, message: "No users found for news email" };

    // Step #2: Fetch user-specific news
    const results = await step.run("fetch-user-news", async () => {
      const perUser: Array<{
        user: UserForNewsEmail;
        articles: MarketNewsArticle[];
      }> = [];

      for (const user of users as unknown as UserForNewsEmail[]) {
        try {
          const symbols = await getWatchlistSymbolsByEmail(user.email);
          let articles: MarketNewsArticle[] = [];

          if (Array.isArray(symbols) && symbols.length > 0) {
            const articlesBySymbol = await Promise.all(
              symbols.map(async (s) => ({
                symbol: s,
                articles: (await getNews(s)) || [],
              }))
            );

            const targetTotal = 6;
            const minPerSymbol = Math.min(
              2,
              Math.floor(targetTotal / symbols.length)
            );
            const balanced: MarketNewsArticle[] = [];

            for (const { symbol, articles: symbolArticles } of articlesBySymbol) {
              balanced.push(...symbolArticles.slice(0, minPerSymbol));
            }

            const remaining = targetTotal - balanced.length;
            if (remaining > 0) {
              const interleaved: MarketNewsArticle[] = [];
              const maxIndex = Math.max(
                ...articlesBySymbol.map((s) => s.articles.length)
              );
              for (
                let i = minPerSymbol;
                i < maxIndex && interleaved.length < remaining;
                i++
              ) {
                for (const { articles: symbolArticles } of articlesBySymbol) {
                  if (symbolArticles[i] && interleaved.length < remaining)
                    interleaved.push(symbolArticles[i]);
                }
              }
              balanced.push(...interleaved);
            }

            articles = balanced.slice(0, targetTotal);
          } else {
            articles = (await getNews())?.slice(0, 6) || [];
          }

          perUser.push({ user, articles });
        } catch (e) {
          console.error("❌ Error preparing user news", user.email, e);
          perUser.push({ user, articles: [] });
        }
      }

      return perUser;
    });

    // Step #3: Summarize per user (Unified for Email + WhatsApp)
const userNewsSummaries: {
  user: UserForNewsEmail;
  htmlSummary: string | null;
  plainSummary: string | null;
}[] = [];

for (const { user, articles } of results) {
  try {
    const prompt = NEWS_SUMMARY_EMAIL_PROMPT.replace(
      "{{newsData}}",
      JSON.stringify(articles, null, 2)
    );

    const response = await step.ai.infer(`summarize-news-${user.email}`, {
      model: step.ai.models.gemini({ model: "gemini-2.5-pro" }),
      body: { contents: [{ role: "user", parts: [{ text: prompt }] }] },
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    const htmlSummary =
      (part && "text" in part ? part.text : null) || "No market news.";

    // Convert to plain text here itself ✅
    const plainSummary = htmlToPlainText(htmlSummary);

    userNewsSummaries.push({ user, htmlSummary, plainSummary });
  } catch (e) {
    console.error("⚠️ Failed to summarize news for:", user.email);
    userNewsSummaries.push({ user, htmlSummary: null, plainSummary: null });
  }
}


    // Step #4: Send Email Summary
    await step.run("send-news-emails", async () => {
  await Promise.all(
    userNewsSummaries.map(async ({ user, htmlSummary }) => {
      if (!htmlSummary) return false;
      return await sendNewsSummaryEmail({
        email: user.email,
        date: getFormattedTodayDate(),
        newsContent: htmlSummary,
      });
    })
  );
});


    // === Helper functions ===
    function htmlToPlainText(html: string): string {
      return html
        .replace(/<h3[^>]*>(.*?)<\/h3>/g, "\n📊 *$1*\n")
        .replace(/<h4[^>]*>(.*?)<\/h4>/g, "\n🔹 *$1*\n")
        .replace(/<li[^>]*>(.*?)<\/li>/g, "• $1\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }

    function safeTrim(text: string, limit = 1500): string {
      return text.length > limit
        ? text.substring(0, text.lastIndexOf(".", limit) + 1) ||
            text.slice(0, limit)
        : text;
    }
    

    // Step #5: Send WhatsApp Alerts
    await step.run("send-news-whatsapp", async () => {
  await Promise.all(
    userNewsSummaries.map(async ({ user, plainSummary }) => {
      if (!plainSummary) return false;

      const phone = user.phone || process.env.TEST_PHONE_NUMBER;
      if (!phone) return false;

      const shortSummary = safeTrim(plainSummary);

      return await sendWhatsAppMessage(
        phone,
        `📈 *Daily Market Summary (${getFormattedTodayDate()})*\n\n${shortSummary}`
      );
    })
  );
});


    return {
      success: true,
      message:
        "✅ Daily news summary emails and WhatsApp alerts sent successfully",
    };
  }
);
