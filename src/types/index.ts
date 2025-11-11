// types/index.ts
// Core TypeScript types for PulseWatch PH

export interface PoliticalPost {
  id: string;
  source: 'reddit' | 'twitter' | 'news' | 'facebook';
  source_url: string | null;
  content: string;
  author: string | null;
  post_date: string | null;
  topic: string | null;
  created_at: string;
}

export interface SentimentAnalysis {
  id: string;
  post_id: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentiment_score: number;
  key_topics: string[];
  summary: string | null;
  analyzed_at: string;
}

export interface PostWithAnalysis extends PoliticalPost {
  sentiment: 'positive' | 'negative' | 'neutral' | null;
  sentiment_score: number | null;
  key_topics: string[] | null;
  summary: string | null;
  analyzed_at: string | null;
}

export interface SystemHealth {
  id: string;
  metric_name: string;
  metric_value: Record<string, unknown>;
  recorded_at: string;
}

export interface SystemStats {
  total_posts: number;
  total_analyzed: number;
  posts_today: number;
  avg_sentiment_score: number | null;
  last_post_time: string | null;
  last_analysis_time: string | null;
}

export interface SentimentDistribution {
  sentiment: 'positive' | 'negative' | 'neutral';
  count: number;
  percentage: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ScrapeResponse {
  scraped: number;
  stored: number;
  message: string;
}

export interface AnalyzeResponse {
  analyzed: number;
  failed: number;
  message: string;
}

// Apify types
export interface ApifyPost {
  // Common fields
  text?: string;
  body?: string;
  title?: string;
  author?: string;
  username?: string;
  url?: string;
  createdAt?: string;
  // Reddit-specific fields
  subreddit?: string;
  communityName?: string;
  parsedCommunityName?: string;
  // Twitter-specific fields
  tweet_id?: string;
  [key: string]: unknown; // Allow additional properties from Apify
}

// OpenAI Analysis Result
export interface OpenAIAnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  sentiment_score: number;
  key_topics: string[];
  summary: string;
}

// Filter types
export interface PostFilters {
  sentiment?: 'positive' | 'negative' | 'neutral' | 'all';
  source?: 'reddit' | 'twitter' | 'news' | 'facebook' | 'all';
  topic?: string | 'all';
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Environment variables type (for type safety)
export interface Env {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  OPENAI_API_KEY: string;
  APIFY_API_TOKEN: string;
  APIFY_ACTOR_ID: string;
}