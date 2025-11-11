-- Migration: Add get_unanalyzed_posts function
-- Date: 2025-11-12
-- Description: Creates a PostgreSQL function to efficiently fetch unanalyzed posts
--              using NOT EXISTS instead of fetching all records and filtering in JavaScript

-- Function to get unanalyzed posts efficiently
-- This uses NOT EXISTS which is more efficient than fetching all and filtering in JS
CREATE OR REPLACE FUNCTION get_unanalyzed_posts(batch_limit INT DEFAULT 50)
RETURNS TABLE (id UUID, content TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT pp.id, pp.content
  FROM political_posts pp
  WHERE NOT EXISTS (
    SELECT 1 
    FROM sentiment_analysis sa 
    WHERE sa.post_id = pp.id
  )
  ORDER BY pp.created_at DESC
  LIMIT batch_limit;
END;
$$ LANGUAGE plpgsql;

-- Test the function (optional - comment out in production)
-- SELECT * FROM get_unanalyzed_posts(10);
