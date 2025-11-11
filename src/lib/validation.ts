// lib/validation.ts
// Zod schemas for API input validation

import { z } from 'zod';

// Scrape endpoint validation
export const scrapeInputSchema = z.object({
  input: z.object({
    startUrls: z.array(z.object({
      url: z.string().url()
    })).optional(),
    searches: z.array(z.string()).optional(),
    sort: z.enum(['hot', 'new', 'top', 'controversial', 'rising']).optional(),
    time: z.enum(['hour', 'day', 'week', 'month', 'year', 'all']).optional(),
    maxItems: z.number().int().min(1).max(200).optional(),
    skipComments: z.boolean().optional(),
    skipCommunity: z.boolean().optional(),
    searchPosts: z.boolean().optional(),
    // Twitter-specific fields
    maxTweets: z.number().int().min(1).max(100).optional(),
    language: z.string().optional(),
  }).optional(),
});

export type ScrapeInput = z.infer<typeof scrapeInputSchema>;

// Posts query parameters validation
export const postsQuerySchema = z.object({
  sentiment: z.enum(['positive', 'negative', 'neutral', 'all']).optional(),
  source: z.enum(['reddit', 'twitter', 'news', 'facebook', 'all']).optional(),
  topic: z.string().optional(),
  search: z.string().optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  offset: z.string().transform(Number).pipe(z.number().int().min(0)).optional(),
});

export type PostsQuery = z.infer<typeof postsQuerySchema>;

// Analyze endpoint validation (currently no input needed, but prepared for future)
export const analyzeInputSchema = z.object({
  postIds: z.array(z.string().uuid()).optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

export type AnalyzeInput = z.infer<typeof analyzeInputSchema>;

// Helper function to safely parse and validate
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`);
      return {
        success: false,
        error: `Validation failed: ${messages.join(', ')}`,
      };
    }
    return {
      success: false,
      error: 'Invalid input',
    };
  }
}
