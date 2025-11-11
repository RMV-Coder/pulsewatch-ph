// app/api/cleanup/route.ts
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/server';

export async function POST() {
  try {
    const supabase = createServiceClient();

    // Find duplicates by content
    const { data: allPosts, error: fetchError } = await supabase
      .from('political_posts')
      .select('id, content, created_at')
      .order('created_at', { ascending: true });

    if (fetchError) {
      throw new Error(`Failed to fetch posts: ${fetchError.message}`);
    }

    if (!allPosts || allPosts.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          duplicatesRemoved: 0,
          message: 'No posts found in database.'
        }
      });
    }

    // Group by content, keep oldest post (first created)
    const contentMap = new Map<string, { id: string; created_at: string }>();
    const duplicateIds: string[] = [];

    for (const post of allPosts) {
      const existing = contentMap.get(post.content);
      
      if (!existing) {
        // First occurrence - keep it
        contentMap.set(post.content, { id: post.id, created_at: post.created_at });
      } else {
        // Duplicate found - mark for deletion
        // Keep the older post (earlier created_at)
        if (new Date(post.created_at) > new Date(existing.created_at)) {
          duplicateIds.push(post.id);
        } else {
          duplicateIds.push(existing.id);
          contentMap.set(post.content, { id: post.id, created_at: post.created_at });
        }
      }
    }

    console.log(`Found ${duplicateIds.length} duplicate posts to remove`);

    if (duplicateIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          duplicatesRemoved: 0,
          message: 'No duplicates found.'
        }
      });
    }

    // First, delete associated sentiment analysis records
    const { error: analysisDeleteError } = await supabase
      .from('sentiment_analysis')
      .delete()
      .in('post_id', duplicateIds);

    if (analysisDeleteError) {
      console.error('Failed to delete analysis records:', analysisDeleteError);
      // Continue anyway - we still want to delete the posts
    }

    // Delete duplicate posts in batches
    let deletedCount = 0;
    const batchSize = 100;

    for (let i = 0; i < duplicateIds.length; i += batchSize) {
      const batch = duplicateIds.slice(i, i + batchSize);
      const { error: deleteError, count } = await supabase
        .from('political_posts')
        .delete({ count: 'exact' })
        .in('id', batch);

      if (deleteError) {
        console.error('Batch delete error:', deleteError);
        continue;
      }

      deletedCount += count || 0;
    }

    // Log cleanup activity
    await supabase.from('system_health').insert({
      metric_name: 'database_cleanup',
      metric_value: {
        duplicates_removed: deletedCount,
        total_posts_before: allPosts.length,
        total_posts_after: allPosts.length - deletedCount,
        status: 'success'
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        duplicatesRemoved: deletedCount,
        totalPostsBefore: allPosts.length,
        totalPostsAfter: allPosts.length - deletedCount,
        message: `Successfully removed ${deletedCount} duplicate posts.`
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Cleanup failed';
    console.error('Cleanup error:', error);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        message: 'Failed to clean up duplicates.'
      },
      { status: 500 }
    );
  }
}
