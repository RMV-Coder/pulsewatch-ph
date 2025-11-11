-- PulseWatch PH Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table 1: Political Posts (Raw scraped data)
CREATE TABLE political_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL CHECK (source IN ('reddit', 'twitter', 'news', 'facebook')),
  source_url TEXT,
  content TEXT NOT NULL,
  author TEXT,
  post_date TIMESTAMP WITH TIME ZONE,
  topic TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  CONSTRAINT content_not_empty CHECK (LENGTH(content) > 0)
);

-- Table 2: Sentiment Analysis Results
CREATE TABLE sentiment_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES political_posts(id) ON DELETE CASCADE,
  sentiment TEXT NOT NULL CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  sentiment_score FLOAT CHECK (sentiment_score >= -1.0 AND sentiment_score <= 1.0),
  key_topics JSONB DEFAULT '[]'::jsonb,
  summary TEXT,
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one analysis per post
  CONSTRAINT unique_post_analysis UNIQUE (post_id)
);

-- Table 3: System Health Tracking
CREATE TABLE system_health (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_name TEXT NOT NULL,
  metric_value JSONB NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial health record
INSERT INTO system_health (metric_name, metric_value) VALUES 
('initialization', '{"status": "healthy", "message": "Database initialized"}'::jsonb);

-- Create indexes for better query performance
CREATE INDEX idx_posts_source ON political_posts(source);
CREATE INDEX idx_posts_created_at ON political_posts(created_at DESC);
CREATE INDEX idx_posts_topic ON political_posts(topic);
CREATE INDEX idx_analysis_sentiment ON sentiment_analysis(sentiment);
CREATE INDEX idx_analysis_post_id ON sentiment_analysis(post_id);
CREATE INDEX idx_health_recorded_at ON system_health(recorded_at DESC);

-- Create a view for easy querying of posts with analysis
CREATE OR REPLACE VIEW posts_with_analysis AS
SELECT 
  pp.id,
  pp.source,
  pp.source_url,
  pp.content,
  pp.author,
  pp.post_date,
  pp.topic,
  pp.created_at,
  sa.sentiment,
  sa.sentiment_score,
  sa.key_topics,
  sa.summary,
  sa.analyzed_at
FROM political_posts pp
LEFT JOIN sentiment_analysis sa ON pp.id = sa.post_id
ORDER BY pp.created_at DESC;

-- Function to get system statistics
CREATE OR REPLACE FUNCTION get_system_stats()
RETURNS TABLE (
  total_posts BIGINT,
  total_analyzed BIGINT,
  posts_today BIGINT,
  avg_sentiment_score FLOAT,
  last_post_time TIMESTAMP WITH TIME ZONE,
  last_analysis_time TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_posts,
    COUNT(sa.id)::BIGINT as total_analyzed,
    COUNT(*) FILTER (WHERE pp.created_at > NOW() - INTERVAL '1 day')::BIGINT as posts_today,
    AVG(sa.sentiment_score)::FLOAT as avg_sentiment_score,
    MAX(pp.created_at) as last_post_time,
    MAX(sa.analyzed_at) as last_analysis_time
  FROM political_posts pp
  LEFT JOIN sentiment_analysis sa ON pp.id = sa.post_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get sentiment distribution
CREATE OR REPLACE FUNCTION get_sentiment_distribution()
RETURNS TABLE (
  sentiment TEXT,
  count BIGINT,
  percentage FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sa.sentiment,
    COUNT(*)::BIGINT as count,
    ROUND((COUNT(*)::FLOAT / NULLIF((SELECT COUNT(*) FROM sentiment_analysis), 0) * 100)::NUMERIC, 2)::FLOAT as percentage
  FROM sentiment_analysis sa
  GROUP BY sa.sentiment
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (RLS) - Optional for now, required for production
ALTER TABLE political_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentiment_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for development, restrict in production)
CREATE POLICY "Allow public read access" ON political_posts FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON sentiment_analysis FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON system_health FOR SELECT USING (true);

-- For now, allow insert/update/delete (in production, restrict to service role)
CREATE POLICY "Allow all operations" ON political_posts FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON sentiment_analysis FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON system_health FOR ALL USING (true);

-- Sample data for testing (optional)
-- Uncomment to insert test data
/*
INSERT INTO political_posts (source, source_url, content, author, post_date, topic) VALUES
('reddit', 'https://reddit.com/r/Philippines/sample1', 'The new infrastructure projects are looking promising for economic growth.', 'user123', NOW() - INTERVAL '2 hours', 'infrastructure'),
('twitter', 'https://twitter.com/sample/status/123', 'Disappointed with the lack of transparency in government spending.', 'twitter_user', NOW() - INTERVAL '5 hours', 'corruption'),
('reddit', 'https://reddit.com/r/Philippines/sample2', 'Education reform is exactly what we need right now!', 'student_ph', NOW() - INTERVAL '1 day', 'education');
*/