export interface RateLimiter { limit(input: { key: string }): Promise<{ success: boolean }> }
export interface Env { GROQ_API_KEY?: string; GEMINI_API_KEY?: string; AI_PROVIDER?: string; ALLOWED_ORIGINS?: string; RSS_ALLOWED_HOSTS?: string; RATE_LIMITER?: RateLimiter }
export type Speaker = 'A' | 'B'
export interface HistoryLine { speaker: Speaker; text: string; segmentTitle?: string }
export interface RssItem { title: string; summary?: string; url?: string; publishedAt?: string }
export interface GenerateInput { topic: string; mode: string; mood: string; history: HistoryLine[]; segmentIndex: number; talkBalance: number; rssItems: RssItem[]; direction: 'continue' | 'next' | 'fresh' }
export interface Segment { programTitle: string; segmentTitle: string; mood: string; lines: Array<{ speaker: Speaker; text: string }> }
