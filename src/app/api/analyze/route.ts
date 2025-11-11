// app/api/analyze/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServiceClient } from '@/utils/supabase/server';
import type { OpenAIAnalysisResult } from '@/types';
import { rateLimiters, getClientIp } from '@/lib/rate-limit';
import { initProgress, incrementProgress, clearProgress } from '@/lib/analysisProgress';
import { API_LIMITS } from '@/lib/constants';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

if (!process.env.OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY');
}

export async function POST(request: Request) {
  // Rate limiting
  const clientIp = getClientIp(request);
  const rateLimitResult = rateLimiters.analyze.check(clientIp);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Rate limit exceeded',
        message: `Too many analysis requests. Please try again later.`,
        retryAfter: new Date(rateLimitResult.reset).toISOString(),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        },
      }
    );
  }

  try {
    const supabase = createServiceClient();
    
    // First, get all analyzed post IDs
    const { data: analyzedPosts } = await supabase
      .from('sentiment_analysis')
      .select('post_id');

    const analyzedPostIds = new Set(analyzedPosts?.map(p => p.post_id) || []);
    
    console.log(`Found ${analyzedPostIds.size} already analyzed posts`);
    
    // Get all posts
    const { data: allPosts, error: fetchError } = await supabase
      .from('political_posts')
      .select('id, content')
      .order('created_at', { ascending: false })
      .limit(API_LIMITS.ANALYSIS_BATCH_SIZE * 2); // Fetch more to account for already analyzed

    if (fetchError) {
      throw new Error(`Failed to fetch posts: ${fetchError.message}`);
    }

    // Filter out already analyzed posts
    const posts = allPosts?.filter(post => !analyzedPostIds.has(post.id)) || [];
    
    // Limit to batch size
    const postsToAnalyze = posts.slice(0, API_LIMITS.ANALYSIS_BATCH_SIZE);
    
    console.log(`Found ${posts.length} unanalyzed posts, will analyze ${postsToAnalyze.length}`);

    if (postsToAnalyze.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          analyzed: 0,
          failed: 0,
          message: 'No unanalyzed posts found.'
        }
      });
    }

    console.log(`Analyzing ${postsToAnalyze.length} posts...`);

    // Create a runId and initialize progress tracking
    const runId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    initProgress(runId, postsToAnalyze.length);

    let analyzed = 0;
    let failed = 0;
    const errors: string[] = [];
    
    interface AnalysisResultData {
      post_id: string;
      sentiment: 'positive' | 'negative' | 'neutral';
      sentiment_score: number;
      key_topics: string[];
      summary: string;
    }
    
    const analysisResults: AnalysisResultData[] = [];

    // First, analyze all posts
    for (const post of postsToAnalyze) {
      try {
        const result = await analyzeWithRetry(post.content, 3);
        
        console.log(`Analysis result for post ${post.id}:`, {
          sentiment: result.sentiment,
          score: result.sentiment_score,
          topics: result.key_topics,
          summaryLength: result.summary?.length || 0
        });
        
        // Collect successful analysis
        analysisResults.push({
          post_id: post.id,
          sentiment: result.sentiment,
          sentiment_score: result.sentiment_score,
          key_topics: result.key_topics,
          summary: result.summary
        });

        // Small delay to respect OpenAI rate limits
        await sleep(500);

        // Update progress after processing this post
        incrementProgress(runId);
        
        // increment local analyzed counter (we'll adjust after DB insert)
        analyzed++;

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to analyze post ${post.id}:`, errorMessage);
        failed++;
        errors.push(`Post ${post.id}: ${errorMessage}`);

        // Still increment progress to reflect attempted processing
        incrementProgress(runId);
      }
    }

    // Batch insert all successful analyses
    if (analysisResults.length > 0) {
      console.log(`Inserting ${analysisResults.length} analysis results in batch...`);
      
      const { error: batchInsertError, data: insertedData } = await supabase
        .from('sentiment_analysis')
        .insert(analysisResults)
        .select();

      if (batchInsertError) {
        console.error('Batch insert error:', {
          code: batchInsertError.code,
          message: batchInsertError.message,
          details: batchInsertError.details,
          hint: batchInsertError.hint
        });
        
        // If batch insert fails, try one by one as fallback
        console.log('Batch insert failed, trying individual inserts...');
        for (const analysisData of analysisResults) {
          try {
            const { error: singleInsertError } = await supabase
              .from('sentiment_analysis')
              .insert(analysisData);

            if (singleInsertError) {
              console.error(`Failed to insert analysis for post ${analysisData.post_id}:`, singleInsertError.message);
              failed++;
              errors.push(`Post ${analysisData.post_id}: ${singleInsertError.message}`);
            } else {
              // already counted in the loop above when creating analysisResults
            }
          } catch (singleError) {
            const errorMsg = singleError instanceof Error ? singleError.message : 'Unknown error';
            console.error(`Exception inserting analysis for post ${analysisData.post_id}:`, errorMsg);
            failed++;
            errors.push(`Post ${analysisData.post_id}: ${errorMsg}`);
          }
        }
      } else {
        console.log(`Successfully inserted ${insertedData?.length || 0} analysis results`);
        // analyzed already tracked per-item; ensure consistency
        analyzed = Math.min(analyzed, insertedData?.length || analyzed);
      }
    }

    // Finalize progress
    setTimeout(() => {
      try { clearProgress(runId); } catch { /* ignore */ }
    }, 30_000); // keep progress for 30s then clear

    // Log health metric
    await supabase.from('system_health').insert({
      metric_name: 'openai_analysis',
      metric_value: {
        total_processed: postsToAnalyze.length,
        successful: analyzed,
        failed: failed,
        status: failed === 0 ? 'success' : 'partial_success'
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        runId,
        analyzed,
        failed,
        message: `Analyzed ${analyzed} posts successfully. ${failed} failed.`,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to analyze posts';
    console.error('Analysis error:', error);
    
    // Log error
    try {
      const supabase = createServiceClient();
      await supabase.from('system_health').insert({
        metric_name: 'openai_analysis_error',
        metric_value: {
          error: errorMessage,
          status: 'failed'
        }
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        message: 'Analysis failed. Please check API credentials and try again.'
      },
      { status: 500 }
    );
  }
}

// Analyze text with OpenAI
async function analyzeSentiment(content: string): Promise<OpenAIAnalysisResult> {
  const prompt = `Analyze the following social media post about Philippine politics. Provide:
1. Overall sentiment (positive, negative, or neutral)
2. Sentiment score from -1.0 (very negative) to +1.0 (very positive)
3. Key topics or themes (max 5, as array)
4. Brief summary (2-3 sentences)

Post: "${content}"

Respond ONLY with valid JSON in this exact format:
{
  "sentiment": "positive|negative|neutral",
  "sentiment_score": 0.5,
  "key_topics": ["topic1", "topic2"],
  "summary": "Brief summary here"
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a political sentiment analyst specializing in Philippine politics. Always respond with valid JSON only, no markdown formatting.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.3,
    max_tokens: 500
  });

  const responseText = completion.choices[0]?.message?.content || '{}';
  
  // Clean up response (remove markdown code blocks if present)
  const cleanedResponse = responseText
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  try {
    const parsed = JSON.parse(cleanedResponse);
    
    // Validate and normalize
    return {
      sentiment: normalizesentiment(parsed.sentiment),
      sentiment_score: clamp(parsed.sentiment_score, -1, 1),
      key_topics: Array.isArray(parsed.key_topics) ? parsed.key_topics.slice(0, 5) : [],
      summary: parsed.summary || 'No summary available'
    };
  } catch {
    console.error('Failed to parse OpenAI response:', cleanedResponse);
    throw new Error('Invalid response format from OpenAI');
  }
}

// Retry wrapper with exponential backoff
async function analyzeWithRetry(
  content: string, 
  maxRetries: number
): Promise<OpenAIAnalysisResult> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await analyzeSentiment(content);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Attempt ${attempt}/${maxRetries} failed:`, errorMessage);
      
      // Don't retry on certain errors
      if (errorMessage.includes('Invalid API key') || 
          errorMessage.includes('context_length_exceeded')) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        // Exponential backoff: 2s, 4s, 8s...
        const delay = Math.pow(2, attempt) * 1000;
        await sleep(delay);
      }
    }
  }
  
  throw lastError || new Error('Analysis failed after retries');
}

// Helpers
function normalizesentiment(sentiment: string): 'positive' | 'negative' | 'neutral' {
  const normalized = sentiment?.toLowerCase();
  if (normalized === 'positive') return 'positive';
  if (normalized === 'negative') return 'negative';
  return 'neutral';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}