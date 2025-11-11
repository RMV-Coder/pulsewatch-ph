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

    // Database connectivity check
    const dbConnected = stats !== null && !statsError;

    return NextResponse.json({
      success: true,
      data: {
        status,
        statistics: systemStats,
        sentiment_distribution: sentimentDist || [],
        recent_events: healthEvents?.slice(0, 5) || [],
        database_connected: dbConnected,
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
  // Check if stats is null (database connection issue)
  if (!stats) {
    return 'error';
  }

  // Check for critical errors in the last hour (more than 5 errors = system error)
  const recentCriticalErrors = events.filter(e => {
    const isRecent = new Date(e.recorded_at) > new Date(Date.now() - 3600000); // Last hour
    const isCriticalError = e.metric_name.includes('failed') || 
                           e.metric_name.includes('error') ||
                           e.metric_name === 'scrape_error' ||
                           e.metric_name === 'analysis_error';
    return isRecent && isCriticalError;
  });

  if (recentCriticalErrors.length > 5) {
    return 'error';
  }

  // If there's data in the system, it's operational
  if ((stats.total_posts ?? 0) > 0 || (stats.total_analyzed ?? 0) > 0) {
    // System has data and is functional
    
    // Warning if too many errors (but not critical)
    if (recentCriticalErrors.length > 2) {
      return 'warning';
    }

    // Warning if there are unanalyzed posts and analysis hasn't run in 24 hours
    const hasUnanalyzedPosts = (stats.total_posts ?? 0) > (stats.total_analyzed ?? 0);
    const lastAnalysisTime = stats.last_analysis_time ? new Date(stats.last_analysis_time) : null;
    const oneDayAgo = new Date(Date.now() - 86400000); // 24 hours
    
    if (hasUnanalyzedPosts && lastAnalysisTime && lastAnalysisTime < oneDayAgo) {
      return 'warning';
    }

    return 'healthy';
  }

  // No data yet but system is functional (initial state)
  return 'healthy';
}