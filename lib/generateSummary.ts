import { GoogleGenerativeAI } from "@google/generative-ai";
import { NEWS_SUMMARY_EMAIL_PROMPT } from "@/lib/inngest/prompts";

/**
 * Lightweight HTML -> plain text converter to avoid external import.
 * Handles basic tags and common HTML entities.
 */
function htmlToPlainText(html: string): string {
  if (!html) return "";
  // Remove script/style blocks
  const withoutScripts = html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");
  // Replace block-level tags with newlines
  const withLineBreaks = withoutScripts.replace(/<(br|p|div|li)[^>]*>/gi, "\n");
  // Remove remaining tags
  const withoutTags = withLineBreaks.replace(/<[^>]+>/g, "");
  // Decode a few common HTML entities
  const decoded = withoutTags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  // Collapse multiple blank lines and trim
  return decoded.replace(/\n\s*\n+/g, "\n\n").trim();
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateUnifiedSummary(newsData: any) {
  const prompt = NEWS_SUMMARY_EMAIL_PROMPT.replace("{{newsData}}", JSON.stringify(newsData, null, 2));

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
  const response = await model.generateContent(prompt);

  const htmlSummary = response.response.text();
  const plainSummary = htmlToPlainText(htmlSummary);

  return { htmlSummary, plainSummary };
}
