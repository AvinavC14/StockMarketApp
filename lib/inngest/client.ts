import { Inngest} from "inngest";

export const inngest = new Inngest({
    id: 'signalist',
    ai: { groq: { apiKey: process.env.GROQ_API_KEY! }}
})
