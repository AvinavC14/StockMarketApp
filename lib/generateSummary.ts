import Groq from 'groq-sdk';
import { NEWS_SUMMARY_EMAIL_PROMPT } from "@/lib/inngest/prompts";


function htmlToPlainText(html: string): string {
  if (!html) return "";
  const withoutScripts = html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");
  const withLineBreaks = withoutScripts.replace(/<(br|p|div|li)[^>]*>/gi, "\n");
  const withoutTags = withLineBreaks.replace(/<[^>]+>/g, "");
  const decoded = withoutTags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return decoded.replace(/\n\s*\n+/g, "\n\n").trim();
}


const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function generateUnifiedSummary(newsData: any) {
  const prompt = NEWS_SUMMARY_EMAIL_PROMPT.replace(
    "{{newsData}}",
    JSON.stringify(newsData, null, 2)
  );

  // Send prompt to Groq
  const response = await groq.chat.completions.create({
    model: "moonshotai/kimi-k2-instruct-0905",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
    max_tokens: 2048,
  });

  // Extract Groq response text
  const htmlSummary = response.choices[0]?.message?.content || "No market news.";
  const plainSummary = htmlToPlainText(htmlSummary);

  return { htmlSummary, plainSummary };
}