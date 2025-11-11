// components/StatsDashboard.tsx
'use client';

import { Activity, Database, TrendingUp, Clock } from 'lucide-react';
import type { SystemStats } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface StatsDashboardProps {
  stats: SystemStats | null;
  isLoading?: boolean;
}

export default function StatsDashboard({ stats, isLoading }: StatsDashboardProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-5 animate-pulse">
            <div className="h-4 rounded w-1/2 mb-2" style={{ backgroundColor: 'var(--bg-secondary)' }}></div>
            <div className="h-8 rounded w-3/4" style={{ backgroundColor: 'var(--bg-secondary)' }}></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const statCards = [
    {
      label: 'Total Posts',
      value: stats.total_posts.toLocaleString(),
      icon: Database,
      color: 'var(--accent-primary)',
      bgColor: 'var(--bg-secondary)',
    },
    {
      label: 'Analyzed Posts',
      value: stats.total_analyzed.toLocaleString(),
      icon: Activity,
      color: 'var(--sentiment-positive)',
      bgColor: 'var(--sentiment-positive-bg)',
    },
    {
      label: 'Posts Today',
      value: stats.posts_today.toLocaleString(),
      icon: TrendingUp,
      color: 'var(--accent-primary)',
      bgColor: 'var(--bg-secondary)',
    },
    {
      label: 'Avg Sentiment',
      value: stats.avg_sentiment_score !== null 
        ? stats.avg_sentiment_score.toFixed(2)
        : 'N/A',
      icon: TrendingUp,
      color: stats.avg_sentiment_score && stats.avg_sentiment_score > 0 
        ? 'var(--sentiment-positive)' 
        : stats.avg_sentiment_score && stats.avg_sentiment_score < 0
        ? 'var(--sentiment-negative)'
        : 'var(--text-secondary)',
      bgColor: stats.avg_sentiment_score && stats.avg_sentiment_score > 0
        ? 'var(--sentiment-positive-bg)'
        : stats.avg_sentiment_score && stats.avg_sentiment_score < 0
        ? 'var(--sentiment-negative-bg)'
        : 'var(--bg-secondary)',
    },
  ];

  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        {statCards.map((stat, index) => (
          <div 
            key={index}
            className="card card-hover transition-all p-5"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {stat.label}
              </span>
              <div className="p-2 rounded-lg" style={{ backgroundColor: stat.bgColor }}>
                <stat.icon size={20} style={{ color: stat.color }} />
              </div>
            </div>
            <div className="text-2xl font-bold" style={{ color: stat.color }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Last Update Times */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={18} style={{ color: 'var(--text-secondary)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>System Activity</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm" style={{ color: 'var(--text-primary)' }}>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Last Post Scraped:</span>
            <span className="ml-2 font-medium">
              {stats.last_post_time 
                ? formatDistanceToNow(new Date(stats.last_post_time), { addSuffix: true })
                : 'Never'}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Last Analysis Run:</span>
            <span className="ml-2 font-medium">
              {stats.last_analysis_time 
                ? formatDistanceToNow(new Date(stats.last_analysis_time), { addSuffix: true })
                : 'Never'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}