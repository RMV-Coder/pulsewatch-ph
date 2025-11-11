// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = createServiceClient();

    // Get system statistics
    const { data: stats, error: statsError } = await supabase
      .rpc('get_system_stats');

    if (statsError) {
      throw new Error(`Failed to get stats: ${statsError.message}`);
    }

    const systemStats = stats?.[0] || {
      total_posts: 0,
      total_analyzed: 0,
      posts_today: 0,
      avg_sentiment_score: null,
      last_post_time: null,
      last_analysis_time: null
    };

    // Get recent health events
    const { data: healthEvents, error: healthError } = await supabase
      .from('system_health')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(10);

    if (healthError) {
      throw new Error(`Failed to get health events: ${healthError.message}`);
    }

    // Determine system status
    const status = determineSystemStatus(systemStats, healthEvents || []);

    // Get sentiment distribution
    const { data: sentimentDist } = await supabase
      .rpc('get_sentiment_distribution');

    return NextResponse.json({
      success: true,
      data: {
        status,
        statistics: systemStats,
        sentiment_distribution: sentimentDist || [],
        recent_events: healthEvents?.slice(0, 5) || [],
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Health check failed';
    console.error('Health check error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        status: 'error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

interface SystemStatsRow {
  total_posts?: number;
  total_analyzed?: number;
  posts_today?: number;
  avg_sentiment_score?: number;
  last_post_time?: string;
  last_analysis_time?: string;
}

interface SystemHealthEvent {
  metric_name: string;
  recorded_at: string;
}

function determineSystemStatus(
  stats: SystemStatsRow | null,
  events: SystemHealthEvent[]
): 'healthy' | 'warning' | 'error' {
  // Check for recent errors
  const recentErrors = events.filter(e => 
    e.metric_name.includes('error') && 
    new Date(e.recorded_at) > new Date(Date.now() - 3600000) // Last hour
  );

  if (recentErrors.length > 3) {
    return 'error';
  }

  // Check if stats is null
  if (!stats) {
    return 'warning';
  }

  // Check if data is stale
  const lastPostTime = stats.last_post_time ? new Date(stats.last_post_time) : null;
  const lastAnalysisTime = stats.last_analysis_time ? new Date(stats.last_analysis_time) : null;
  
  const oneHourAgo = new Date(Date.now() - 3600000);
  
  if (stats.total_posts === 0 || stats.total_analyzed === 0) {
    return 'warning';
  }

  if (lastPostTime && lastPostTime < oneHourAgo && (stats.total_posts ?? 0) > 0) {
    return 'warning';
  }

  if (lastAnalysisTime && lastAnalysisTime < oneHourAgo && (stats.total_analyzed ?? 0) < (stats.total_posts ?? 0)) {
    return 'warning';
  }

  return 'healthy';
}