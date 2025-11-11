// lib/constants.ts
// Application-wide constants

// API Configuration
export const API_LIMITS = {
  POSTS_PER_PAGE: 50,
  ANALYSIS_BATCH_SIZE: 20,
  SCRAPE_BATCH_SIZE: 50,
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 500,
  MIN_POST_LENGTH: 20, // Minimum post length to store
} as const;

// Rate Limiting
export const RATE_LIMITS = {
  SCRAPE_REQUESTS_PER_HOUR: 10,
  ANALYZE_REQUESTS_PER_HOUR: 20,
  POSTS_REQUESTS_PER_MINUTE: 60,
} as const;

// Sentiment Thresholds
export const SENTIMENT = {
  POSITIVE_THRESHOLD: 0.3,
  NEGATIVE_THRESHOLD: -0.3,
  MIN_SCORE: -1.0,
  MAX_SCORE: 1.0,
} as const;

// Timeouts
export const TIMEOUTS = {
  APIFY_WAIT_SECONDS: 60,
  OPENAI_TIMEOUT_MS: 30000,
  API_REQUEST_TIMEOUT_MS: 10000,
} as const;

// Content Limits
export const CONTENT = {
  MIN_POST_LENGTH: 20,
  MAX_SUMMARY_LENGTH: 500,
  TRUNCATE_CONTENT_LENGTH: 200,
} as const;

// Cache Duration (in seconds)
export const CACHE_DURATION = {
  STATS: 60,
  POSTS: 30,
  ANALYTICS: 300,
} as const;

// Apify Configuration
export const APIFY_DEFAULTS = {
  REDDIT_LIMIT: 50,
  TWITTER_LIMIT: 50,
  REDDIT_SORT: 'new' as const,
  REDDIT_TIME: 'week' as const,
} as const;

// Philippine Political Keywords
export const POLITICAL_KEYWORDS = [
  'politics',
  'election',
  'government',
  'duterte',
  'marcos',
  'robredo',
  'senate',
  'congress',
  'legislation',
  'bill',
  'law',
] as const;

// Topics
export const TOPICS = {
  ELECTIONS: 'elections',
  CORRUPTION: 'corruption',
  INFRASTRUCTURE: 'infrastructure',
  EDUCATION: 'education',
  HEALTHCARE: 'healthcare',
  ECONOMY: 'economy',
  LEGISLATION: 'legislation',
  GENERAL: 'general',
} as const;

// Topic Keywords Mapping
export const TOPIC_KEYWORDS = {
  [TOPICS.ELECTIONS]: ['election', 'vote', 'campaign', 'candidate'],
  [TOPICS.CORRUPTION]: ['corruption', 'scandal', 'bribery', 'graft'],
  [TOPICS.INFRASTRUCTURE]: ['infrastructure', 'build', 'project', 'construction'],
  [TOPICS.EDUCATION]: ['education', 'school', 'student', 'teacher', 'university'],
  [TOPICS.HEALTHCARE]: ['health', 'hospital', 'medical', 'doctor', 'vaccine'],
  [TOPICS.ECONOMY]: ['economy', 'jobs', 'unemployment', 'business', 'inflation'],
  [TOPICS.LEGISLATION]: ['law', 'bill', 'legislation', 'policy', 'regulation'],
} as const;

// System Health Status
export const HEALTH_STATUS = {
  HEALTHY: 'healthy' as const,
  WARNING: 'warning' as const,
  ERROR: 'error' as const,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  MISSING_ENV_VARS: 'Missing required environment variables',
  SCRAPE_FAILED: 'Failed to scrape data',
  ANALYSIS_FAILED: 'Failed to analyze posts',
  DB_ERROR: 'Database operation failed',
  API_ERROR: 'API request failed',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
  INVALID_INPUT: 'Invalid input provided',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  SCRAPE_COMPLETE: 'Successfully scraped posts',
  ANALYSIS_COMPLETE: 'Successfully analyzed posts',
  DATA_REFRESHED: 'Data refreshed successfully',
} as const;

// Data Sources
export const SOURCES = {
  REDDIT: 'reddit' as const,
  TWITTER: 'twitter' as const,
  NEWS: 'news' as const,
  FACEBOOK: 'facebook' as const,
} as const;

// Sentiment Types
export const SENTIMENT_TYPES = {
  POSITIVE: 'positive' as const,
  NEGATIVE: 'negative' as const,
  NEUTRAL: 'neutral' as const,
} as const;
