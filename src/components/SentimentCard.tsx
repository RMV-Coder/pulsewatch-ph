// components/SentimentCard.tsx
'use client';

import { formatDistanceToNow } from 'date-fns';
import { ExternalLink, User, Calendar, Tag } from 'lucide-react';
import type { PostWithAnalysis } from '@/types';

interface SentimentCardProps {
  post: PostWithAnalysis;
}

export default function SentimentCard({ post }: SentimentCardProps) {
  const sentiment = post.sentiment || 'neutral';
  const truncatedContent = post.content.length > 200 
    ? post.content.substring(0, 200) + '...' 
    : post.content;

  return (
    <div className="card card-hover p-6 transition-all fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <span 
            className="text-xs px-2 py-1 rounded font-medium"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--accent-primary)',
            }}
          >
            {post.source.toUpperCase()}
          </span>
          <span 
            className="text-xs px-2 py-1 rounded font-medium"
            style={{
              backgroundColor: sentiment === 'positive' 
                ? 'var(--sentiment-positive-bg)' 
                : sentiment === 'negative' 
                ? 'var(--sentiment-negative-bg)' 
                : 'var(--bg-secondary)',
              color: sentiment === 'positive' 
                ? 'var(--sentiment-positive)' 
                : sentiment === 'negative' 
                ? 'var(--sentiment-negative)' 
                : 'var(--text-secondary)',
            }}
          >
            {sentiment === 'positive' ? '😊' : sentiment === 'negative' ? '😞' : '😐'} {sentiment.toUpperCase()}
          </span>
        </div>
        {post.source_url && (
          <a 
            href={post.source_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="transition-opacity hover:opacity-70"
            style={{ color: 'var(--accent-primary)' }}
            title="View original post"
          >
            <ExternalLink size={18} />
          </a>
        )}
      </div>

      {/* Content */}
      <div className="mb-4">
        <p className="text-base leading-relaxed" style={{ color: 'var(--text-primary)' }}>
          {truncatedContent}
        </p>
      </div>

      {/* AI Summary */}
      {post.summary && (
        <div 
          className="mb-4 p-4 rounded-lg"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
          }}
        >
          <p className="text-xs font-semibold mb-2 tracking-wide uppercase" style={{ color: 'var(--accent-primary)' }}>
            AI Summary
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
            {post.summary}
          </p>
        </div>
      )}

      {/* Key Topics */}
      {post.key_topics && post.key_topics.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {post.key_topics.map((topic, idx) => (
            <span 
              key={idx}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--accent-primary)',
              }}
            >
              <Tag size={12} />
              {topic}
            </span>
          ))}
        </div>
      )}

      {/* Footer Metadata */}
      <div 
        className="flex items-center justify-between text-xs pt-3"
        style={{
          color: 'var(--text-secondary)',
          borderTop: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-4">
          {post.author && (
            <span className="flex items-center gap-1">
              <User size={14} />
              {post.author}
            </span>
          )}
          {post.topic && (
            <span className="flex items-center gap-1">
              <Tag size={14} />
              {post.topic}
            </span>
          )}
        </div>
        <span className="flex items-center gap-1" title={post.created_at}>
          <Calendar size={14} />
          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
        </span>
      </div>

      {/* Sentiment Score (if available) */}
      {post.sentiment_score !== null && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: 'var(--text-secondary)' }}>Sentiment Score:</span>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <div 
                  className="h-full" 
                  style={{ 
                    width: `${Math.min(100, Math.abs(post.sentiment_score) * 100)}%`,
                    backgroundColor: post.sentiment_score > 0 
                      ? 'var(--sentiment-positive)' 
                      : post.sentiment_score < 0 
                      ? 'var(--sentiment-negative)' 
                      : 'var(--text-secondary)'
                  }}
                />
              </div>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {post.sentiment_score.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}