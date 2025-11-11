// app/api/analytics/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { rateLimiters, getClientIp } from '@/lib/rate-limit';

export async function GET(request: Request) {
  // Rate limiting
  const clientIp = getClientIp(request);
  const rateLimitResult = rateLimiters.health.check(clientIp);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Rate limit exceeded',
      },
      { status: 429 }
    );
  }

  try {
    const supabase = await createClient();

    // Get sentiment distribution
    const { data: sentimentDist, error: sentError } = await supabase
      .rpc('get_sentiment_distribution');

    if (sentError) {
      throw new Error(`Failed to get sentiment distribution: ${sentError.message}`);
    }

    // Get top topics
    const { data: posts } = await supabase
      .from('posts_with_analysis')
      .select('topic, key_topics')
      .not('sentiment', 'is', null)
      .limit(500);

    // Aggregate topics
    const topicCounts: Record<string, number> = {};
    const keywordCounts: Record<string, number> = {};

    posts?.forEach(post => {
      // Count main topics
      if (post.topic) {
        topicCounts[post.topic] = (topicCounts[post.topic] || 0) + 1;
      }

      // Count keywords from key_topics
      if (post.key_topics && Array.isArray(post.key_topics)) {
        post.key_topics.forEach((keyword: string) => {
          keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
        });
      }
    });

    // Sort and get top 10
    const topTopics = Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, count }));

    const topKeywords = Object.entries(keywordCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([keyword, count]) => ({ keyword, count }));

    // Get sentiment over time (last 7 days)
    const { data: timelineData } = await supabase
      .from('posts_with_analysis')
      .select('created_at, sentiment, sentiment_score')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .not('sentiment', 'is', null)
      .order('created_at', { ascending: true });

    // Group by day
    const dailyStats: Record<string, {
      positive: number;
      negative: number;
      neutral: number;
      avgScore: number;
      total: number;
      scores: number[];
    }> = {};

    timelineData?.forEach(post => {
      const date = new Date(post.created_at).toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = {
          positive: 0,
          negative: 0,
          neutral: 0,
          avgScore: 0,
          total: 0,
          scores: [],
        };
      }

      dailyStats[date][post.sentiment as 'positive' | 'negative' | 'neutral']++;
      dailyStats[date].total++;
      if (post.sentiment_score !== null) {
        dailyStats[date].scores.push(post.sentiment_score);
      }
    });

    // Calculate averages
    const timeline = Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      positive: stats.positive,
      negative: stats.negative,
      neutral: stats.neutral,
      total: stats.total,
      avgScore: stats.scores.length > 0
        ? stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length
        : 0,
    }));

    return NextResponse.json({
      success: true,
      data: {
        sentimentDistribution: sentimentDist || [],
        topTopics,
        topKeywords,
        timeline,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch analytics';
    console.error('Analytics error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
