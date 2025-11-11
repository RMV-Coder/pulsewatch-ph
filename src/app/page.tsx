// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { PlayCircle, Brain, RefreshCw, AlertCircle, Trash2 } from 'lucide-react';
import Navigation from '@/components/Navigation';
import SentimentCard from '@/components/SentimentCard';
import Filters from '@/components/Filters';
import StatsDashboard from '@/components/StatsDashboard';
import type { PostWithAnalysis, SystemStats } from '@/types';

export default function Home() {
  const [posts, setPosts] = useState<PostWithAnalysis[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScraping, setIsScraping] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [sentiment, setSentiment] = useState('all');
  const [source, setSource] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [postsPerPage, setPostsPerPage] = useState(20);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);

  // Fetch posts and stats
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query params
      const offset = (currentPage - 1) * postsPerPage;
      const params = new URLSearchParams({
        sentiment,
        source,
        ...(searchQuery && { search: searchQuery }),
        limit: postsPerPage.toString(),
        offset: offset.toString()
      });

      // Fetch posts
      const postsRes = await fetch(`/api/posts?${params}`);
      const postsData = await postsRes.json();

      if (postsData.success) {
        setPosts(postsData.data.posts);
        setTotalPosts(postsData.data.total);
      } else {
        setError(postsData.error || 'Failed to fetch posts');
      }

      // Fetch health/stats
      const healthRes = await fetch('/api/health');
      const healthData = await healthRes.json();

      if (healthData.success) {
        setStats(healthData.data.statistics);
      }

    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentiment, source, searchQuery, postsPerPage, currentPage]);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [sentiment, source, searchQuery, postsPerPage]);

  const handleScrape = async () => {
    try {
      setIsScraping(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch('/api/scrape', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        setSuccessMessage(data.data.message);
        // Refresh data after scraping
        setTimeout(() => fetchData(), 2000);
      } else {
        setError(data.error || 'Scraping failed');
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to start scraping');
    } finally {
      setIsScraping(false);
    }
  };

  const handleCleanup = async () => {
    if (!window.confirm('This will remove all duplicate posts from the database. Continue?')) {
      return;
    }

    try {
      setIsCleaning(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch('/api/cleanup', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        setSuccessMessage(data.data.message);
        // Refresh data after cleanup
        setTimeout(() => fetchData(), 1000);
      } else {
        setError(data.error || 'Cleanup failed');
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to clean up duplicates');
    } finally {
      setIsCleaning(false);
    }
  };

  const handleAnalyze = async () => {
    try {
      setIsAnalyzing(true);
      setError(null);
      setSuccessMessage(null);
      setAnalyzeProgress({ current: 0, total: 0 });

      // Start analysis run and get runId
      const res = await fetch('/api/analyze', { method: 'POST' });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Analysis failed');
        setIsAnalyzing(false);
        return;
      }

      const runId = data.data?.runId;
      const total = data.data?.analyzed + data.data?.failed || 0;

      if (!runId || total === 0) {
        // Nothing to analyze
        setSuccessMessage(data.data?.message || 'No unanalyzed posts found.');
        setIsAnalyzing(false);
        return;
      }

      setAnalyzeProgress({ current: 0, total });

      // Poll progress endpoint
      const pollInterval = 500;
      const timer = setInterval(async () => {
        try {
          const pRes = await fetch(`/api/analyze/progress?runId=${runId}`);
          if (pRes.status === 200) {
            const pData = await pRes.json();
            const prog = pData.data?.progress;
            if (prog) {
              setAnalyzeProgress({ current: prog.processed || 0, total: prog.total || total });
              if ((prog.processed || 0) >= (prog.total || total)) {
                clearInterval(timer);
                setIsAnalyzing(false);
                setSuccessMessage(data.data?.message || `Analyzed ${prog.processed} posts successfully!`);
                setTimeout(() => fetchData(), 800);
              }
            }
          } else if (pRes.status === 404) {
            // progress not found - assume finished
            clearInterval(timer);
            setAnalyzeProgress({ current: total, total });
            setIsAnalyzing(false);
            setSuccessMessage(data.data?.message || `Analysis completed!`);
            setTimeout(() => fetchData(), 800);
          }
        } catch (pollErr) {
          console.error('Progress poll failed', pollErr);
        }
      }, pollInterval);
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to start analysis');
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "PulseWatch PH",
            "url": "https://pulsewatch-ph.vercel.app",
            "description": "Real-time AI-powered sentiment analysis of Philippine political discourse",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Any",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "featureList": [
              "Real-time political sentiment analysis",
              "Social media monitoring",
              "AI-powered topic extraction",
              "Interactive data visualization",
              "Philippine political discourse tracking"
            ],
            "aggregateRating": stats ? {
              "@type": "AggregateRating",
              "ratingValue": "4.5",
              "reviewCount": stats.total_analyzed || 0
            } : undefined
          })
        }}
      />

      <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <Navigation />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-12">
          <button
            onClick={handleScrape}
            disabled={isScraping}
            className="px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 disabled:opacity-50"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'white'
            }}
          >
            {isScraping ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Scraping...
              </>
            ) : (
              <>
                <PlayCircle size={18} />
                Scrape New Posts
              </>
            )}
          </button>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="relative overflow-hidden px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 disabled:opacity-90"
            style={{
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)'
            }}
          >
            {/* Progress bar background */}
            {isAnalyzing && analyzeProgress.total > 0 && (
              <div 
                className="absolute inset-0 transition-all duration-300 ease-out"
                style={{
                  background: `linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-primary) ${(analyzeProgress.current / analyzeProgress.total) * 100}%, transparent ${(analyzeProgress.current / analyzeProgress.total) * 100}%)`,
                  opacity: 0.2,
                }}
              />
            )}
            
            {/* Button content */}
            <span className="relative z-10 flex items-center gap-2">
              {isAnalyzing ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  {analyzeProgress.total > 0 
                    ? `Analyzing... ${analyzeProgress.current}/${analyzeProgress.total}` 
                    : 'Analyzing...'}
                </>
              ) : (
                <>
                  <Brain size={18} />
                  Analyze Posts
                </>
              )}
            </span>
          </button>

          <button
            onClick={fetchData}
            disabled={isLoading}
            className="px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
            style={{
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)'
            }}
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={handleCleanup}
            disabled={isCleaning}
            className="px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
            style={{
              backgroundColor: 'var(--bg-card)',
              color: 'var(--warning)',
              border: '1px solid var(--warning)'
            }}
          >
            <Trash2 size={18} className={isCleaning ? 'animate-spin' : ''} />
            {isCleaning ? 'Cleaning...' : 'Remove Duplicates'}
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div 
            className="mb-8 card p-4 flex items-start gap-3"
            style={{
              borderLeft: '4px solid var(--sentiment-negative)'
            }}
          >
            <AlertCircle size={20} style={{ color: 'var(--sentiment-negative)' }} className="mt-0.5" />
            <p className="text-sm leading-relaxed" style={{ color: 'var(--sentiment-negative)' }}>{error}</p>
          </div>
        )}

        {successMessage && (
          <div 
            className="mb-8 card p-4"
            style={{
              borderLeft: '4px solid var(--sentiment-positive)'
            }}
          >
            <p className="text-sm leading-relaxed" style={{ color: 'var(--sentiment-positive)' }}>{successMessage}</p>
          </div>
        )}

        {/* Stats Dashboard */}
        <StatsDashboard stats={stats} isLoading={isLoading && !stats} />

        {/* Filters */}
        <Filters
          sentiment={sentiment}
          source={source}
          searchQuery={searchQuery}
          onSentimentChange={setSentiment}
          onSourceChange={setSource}
          onSearchChange={setSearchQuery}
        />

        {/* Posts Grid */}
        {isLoading ? (
          <div className="text-center py-16">
            <RefreshCw size={48} className="animate-spin mx-auto mb-4" style={{ color: 'var(--accent-primary)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-lg mb-2" style={{ color: 'var(--text-primary)' }}>No posts found</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Try scraping new posts or adjusting your filters
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Showing {posts.length} post{posts.length !== 1 ? 's' : ''}
              </div>
              
              {/* Posts per page selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Posts per page:
                </label>
                <select
                  value={postsPerPage}
                  onChange={(e) => setPostsPerPage(Number(e.target.value))}
                  className="px-3 py-1 rounded-md text-sm focus:outline-none focus:ring-2 transition-all"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={40}>40</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-5">
              {posts.map((post) => (
                <SentimentCard key={post.id} post={post} />
              ))}
            </div>
            
            {/* Pagination Controls */}
            {totalPosts > postsPerPage && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-6 py-2.5 rounded-lg font-medium transition-smooth disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'white',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  &lt;
                </button>
                
                <div className="flex items-center gap-2 px-6 py-2.5 rounded-lg" style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Page
                  </span>
                  <span className="font-bold text-lg" style={{ color: 'var(--accent-primary)' }}>
                    {currentPage}
                  </span>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    of {Math.ceil(totalPosts / postsPerPage)}
                  </span>
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={currentPage >= Math.ceil(totalPosts / postsPerPage)}
                  className="px-6 py-2.5 rounded-lg font-medium transition-smooth disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'white',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  &gt;
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer style={{ backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--border)' }} className="mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            PulseWatch PH - Built with Next.js, Supabase, OpenAI & Apify
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            A sentiment analysis tool for Philippine political discourse
          </p>
        </div>
      </footer>
    </div>
    </>
  );
}