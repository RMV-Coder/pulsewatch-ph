// app/api/posts/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { rateLimiters, getClientIp } from '@/lib/rate-limit';

export async function GET(request: Request) {
  // Rate limiting
  const clientIp = getClientIp(request);
  const rateLimitResult = rateLimiters.posts.check(clientIp);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again later.`,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        },
      }
    );
  }

  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const sentiment = searchParams.get('sentiment');
    const source = searchParams.get('source');
    const topic = searchParams.get('topic');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('posts_with_analysis')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (sentiment && sentiment !== 'all') {
      query = query.eq('sentiment', sentiment);
    }

    if (source && source !== 'all') {
      query = query.eq('source', source);
    }

    if (topic && topic !== 'all') {
      query = query.eq('topic', topic);
    }

    if (search) {
      query = query.ilike('content', `%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch posts: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data: {
        posts: data || [],
        total: count || 0,
        limit,
        offset,
        hasMore: count ? offset + limit < count : false
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch posts';
    console.error('Posts fetch error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        data: {
          posts: [],
          total: 0,
          limit: 0,
          offset: 0,
          hasMore: false
        }
      },
      { status: 500 }
    );
  }
}