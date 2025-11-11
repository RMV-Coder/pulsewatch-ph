// app/api/posts/[id]/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { rateLimiters, getClientIp } from '@/lib/rate-limit';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  // Rate limiting
  const clientIp = getClientIp(request);
  const rateLimitResult = rateLimiters.posts.check(clientIp);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Rate limit exceeded',
      },
      { status: 429 }
    );
  }

  try {
    const supabase = await createClient();

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid post ID format',
        },
        { status: 400 }
      );
    }

    // Fetch post with analysis
    const { data: post, error } = await supabase
      .from('posts_with_analysis')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          {
            success: false,
            error: 'Post not found',
          },
          { status: 404 }
        );
      }
      throw new Error(`Failed to fetch post: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      data: post,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch post';
    console.error('Fetch post error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
