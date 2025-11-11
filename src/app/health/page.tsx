// app/health/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Activity, Database, Brain, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { formatDistanceToNow } from 'date-fns';

interface SystemStats {
  total_posts?: number;
  total_analyzed?: number;
  posts_today?: number;
  avg_sentiment_score?: number;
  last_post_time?: string;
  last_analysis_time?: string;
}

interface HealthEvent {
  id: string;
  metric_name: string;
  metric_value: Record<string, unknown>;
  recorded_at: string;
}

interface HealthData {
  status: 'healthy' | 'warning' | 'error';
  statistics: SystemStats;
  recentEvents: HealthEvent[];
  timestamp: string;
}

export default function HealthPage() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      setError(null);
      const res = await fetch('/api/health');
      const data = await res.json();

      if (data.success) {
        setHealthData(data.data);
      } else {
        setError(data.error || 'Failed to fetch health data');
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to load health data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'var(--success)';
      case 'warning':
        return 'var(--warning)';
      case 'error':
        return 'var(--error)';
      default:
        return 'var(--text-secondary)';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-8 h-8" style={{ color: 'var(--success)' }} />;
      case 'warning':
        return <AlertCircle className="w-8 h-8" style={{ color: 'var(--warning)' }} />;
      case 'error':
        return <AlertCircle className="w-8 h-8" style={{ color: 'var(--error)' }} />;
      default:
        return <Activity className="w-8 h-8" style={{ color: 'var(--text-secondary)' }} />;
    }
  };

  const stats = healthData?.statistics;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Navigation />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            System Health
          </h1>
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            Real-time monitoring of PulseWatch PH services
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg" style={{
            backgroundColor: 'var(--bg-card)',
            border: '2px solid var(--error)',
          }}>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5" style={{ color: 'var(--error)' }} />
              <p style={{ color: 'var(--error)' }}>{error}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-t-transparent" 
                 style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }}>
            </div>
            <p className="mt-4" style={{ color: 'var(--text-secondary)' }}>Loading health data...</p>
          </div>
        ) : healthData ? (
          <>
            {/* System Status Card */}
            <div className="card mb-8 p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {getStatusIcon(healthData.status)}
                  <div>
                    <h2 className="text-2xl font-bold" style={{ color: getStatusColor(healthData.status) }}>
                      {healthData.status.charAt(0).toUpperCase() + healthData.status.slice(1)}
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      System Status
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <Clock className="w-4 h-4" />
                    <span>Last updated: {formatDistanceToNow(new Date(healthData.timestamp), { addSuffix: true })}</span>
                  </div>
                  <button
                    onClick={fetchHealth}
                    className="mt-2 text-sm px-4 py-2 rounded-lg transition-smooth hover:scale-105"
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    Refresh Now
                  </button>
                </div>
              </div>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Posts */}
              <div className="card p-6">
                <div className="flex items-start justify-between mb-4">
                  <Database className="w-8 h-8" style={{ color: 'var(--accent-primary)' }} />
                </div>
                <h3 className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                  {stats?.total_posts?.toLocaleString() ?? 0}
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Posts</p>
              </div>

              {/* Total Analyzed */}
              <div className="card p-6">
                <div className="flex items-start justify-between mb-4">
                  <Brain className="w-8 h-8" style={{ color: 'var(--accent-primary)' }} />
                </div>
                <h3 className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                  {stats?.total_analyzed?.toLocaleString() ?? 0}
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Posts Analyzed</p>
                {stats && stats.total_posts && stats.total_analyzed && (
                  <div className="mt-2">
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-off)' }}>
                      <div
                        className="h-full transition-all duration-500"
                        style={{
                          width: `${(stats.total_analyzed / stats.total_posts) * 100}%`,
                          backgroundColor: 'var(--accent-primary)',
                        }}
                      />
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      {Math.round((stats.total_analyzed / stats.total_posts) * 100)}% coverage
                    </p>
                  </div>
                )}
              </div>

              {/* Posts Today */}
              <div className="card p-6">
                <div className="flex items-start justify-between mb-4">
                  <TrendingUp className="w-8 h-8" style={{ color: 'var(--accent-primary)' }} />
                </div>
                <h3 className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                  {stats?.posts_today?.toLocaleString() ?? 0}
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Posts Today</p>
              </div>

              {/* Average Sentiment */}
              <div className="card p-6">
                <div className="flex items-start justify-between mb-4">
                  <Activity className="w-8 h-8" style={{ color: 'var(--accent-primary)' }} />
                </div>
                <h3 className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                  {stats?.avg_sentiment_score?.toFixed(2) ?? '0.00'}
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Avg Sentiment Score</p>
              </div>
            </div>

            {/* Last Activity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  Last Scrape
                </h3>
                {stats?.last_post_time ? (
                  <>
                    <p className="text-2xl font-bold mb-2" style={{ color: 'var(--accent-primary)' }}>
                      {formatDistanceToNow(new Date(stats.last_post_time), { addSuffix: true })}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(stats.last_post_time).toLocaleString()}
                    </p>
                  </>
                ) : (
                  <p style={{ color: 'var(--text-secondary)' }}>No scraping activity yet</p>
                )}
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                  Last Analysis
                </h3>
                {stats?.last_analysis_time ? (
                  <>
                    <p className="text-2xl font-bold mb-2" style={{ color: 'var(--accent-primary)' }}>
                      {formatDistanceToNow(new Date(stats.last_analysis_time), { addSuffix: true })}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(stats.last_analysis_time).toLocaleString()}
                    </p>
                  </>
                ) : (
                  <p style={{ color: 'var(--text-secondary)' }}>No analysis activity yet</p>
                )}
              </div>
            </div>

            {/* Recent Events */}
            <div className="card p-6">
              <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                Recent System Events
              </h3>
              {healthData.recentEvents && healthData.recentEvents.length > 0 ? (
                <div className="space-y-3">
                  {healthData.recentEvents.slice(0, 10).map((event) => (
                    <div
                      key={event.id}
                      className="p-4 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--bg-off)',
                        borderColor: event.metric_name.includes('error') ? 'var(--error)' : 'var(--border)',
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium mb-1" style={{ 
                            color: event.metric_name.includes('error') ? 'var(--error)' : 'var(--text-primary)' 
                          }}>
                            {event.metric_name.replace(/_/g, ' ').toUpperCase()}
                          </p>
                          {event.metric_value && Object.keys(event.metric_value).length > 0 && (
                            <pre className="text-xs mt-2 p-2 rounded overflow-x-auto" style={{
                              backgroundColor: 'var(--bg-primary)',
                              color: 'var(--text-secondary)',
                            }}>
                              {JSON.stringify(event.metric_value, null, 2)}
                            </pre>
                          )}
                        </div>
                        <span className="text-xs whitespace-nowrap ml-4" style={{ color: 'var(--text-secondary)' }}>
                          {formatDistanceToNow(new Date(event.recorded_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-secondary)' }}>No recent events</p>
              )}
            </div>
          </>
        ) : null}
      </main>

      {/* Footer */}
      <footer style={{ backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--border)' }} className="mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Auto-refreshes every 30 seconds
          </p>
        </div>
      </footer>
    </div>
  );
}
