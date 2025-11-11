// components/Filters.tsx
'use client';

import { Search, Filter } from 'lucide-react';

interface FiltersProps {
  sentiment: string;
  source: string;
  searchQuery: string;
  onSentimentChange: (value: string) => void;
  onSourceChange: (value: string) => void;
  onSearchChange: (value: string) => void;
}

export default function Filters({
  sentiment,
  source,
  searchQuery,
  onSentimentChange,
  onSourceChange,
  onSearchChange,
}: FiltersProps) {
  return (
    <div className="card p-4 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter size={20} style={{ color: 'var(--text-secondary)' }} />
        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Filters</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sentiment Filter */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            Sentiment
          </label>
          <select
            value={sentiment}
            onChange={(e) => onSentimentChange(e.target.value)}
            className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 transition-all"
            style={{
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          >
            <option value="all">All Sentiments</option>
            <option value="positive">😊 Positive</option>
            <option value="neutral">😐 Neutral</option>
            <option value="negative">😞 Negative</option>
          </select>
        </div>

        {/* Source Filter */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            Source
          </label>
          <select
            value={source}
            onChange={(e) => onSourceChange(e.target.value)}
            className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 transition-all"
            style={{
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          >
            <option value="all">All Sources</option>
            <option value="reddit">Reddit</option>
            <option value="twitter">Twitter</option>
            <option value="news">News</option>
            <option value="facebook">Facebook</option>
          </select>
        </div>

        {/* Search */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            Search Content
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search posts..."
              className="w-full px-3 py-2 pl-10 rounded-md focus:outline-none focus:ring-2 transition-all"
              style={{
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
              }}
            />
            <Search 
              size={18} 
              className="absolute left-3 top-1/2 transform -translate-y-1/2"
              style={{ color: 'var(--text-secondary)' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}