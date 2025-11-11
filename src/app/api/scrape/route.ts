// app/api/scrape/route.ts
import { NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';
import { createServiceClient } from '@/utils/supabase/server';
import type { ApifyPost } from '@/types';
import { rateLimiters, getClientIp } from '@/lib/rate-limit';
import { API_LIMITS, TIMEOUTS } from '@/lib/constants';
import { validateInput, scrapeInputSchema } from '@/lib/validation';

const apifyToken = process.env.APIFY_API_TOKEN!;
const apifyActorId = process.env.APIFY_ACTOR_ID || 'apify/reddit-scraper';

if (!apifyToken) {
  console.error('Missing APIFY_API_TOKEN');
}

const client = new ApifyClient({ token: apifyToken });

export async function POST(request: Request) {
  // Rate limiting
  const clientIp = getClientIp(request);
  const rateLimitResult = rateLimiters.scrape.check(clientIp);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Rate limit exceeded',
        message: `Too many scraping requests. Please try again later.`,
        retryAfter: new Date(rateLimitResult.reset).toISOString(),
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
    const supabase = createServiceClient();
    
    // Parse and validate custom input from request body (optional)
    let runInput;
    try {
      const body = await request.json();
      const validation = validateInput(scrapeInputSchema, body);
      
      if (!validation.success) {
        return NextResponse.json(
          {
            success: false,
            error: validation.error,
            message: 'Invalid scraping parameters provided.',
          },
          { status: 400 }
        );
      }
      
      runInput = validation.data.input || getDefaultInput();
    } catch {
      runInput = getDefaultInput();
    }

    console.log('Starting Apify actor run with input:', runInput);

    // Run the Apify actor
    const run = await client.actor(apifyActorId).call(runInput, {
      waitSecs: TIMEOUTS.APIFY_WAIT_SECONDS,
    });

    console.log('Apify run completed:', run.id);

    // Get dataset items
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
    console.log(`Fetched ${items.length} items from Apify`);

    if (items.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          scraped: 0,
          stored: 0,
          message: 'No posts found. Try adjusting search parameters.'
        }
      });
    }

    // Log first item to see structure
    if (items.length > 0) {
      console.log('Sample Apify item structure:', JSON.stringify(items[0], null, 2));
    }

    // Transform and insert posts into Supabase
    const postsToInsert = (items as ApifyPost[]).map((item: ApifyPost) => {
      // The practicaltools/apify-reddit-api returns different field names
      const content = item.body || item.text || item.title || '';
      const author = item.username || item.author || null;
      const url = item.url || null;
      const createdAt = item.createdAt || new Date().toISOString();
      const subreddit = item.parsedCommunityName || item.communityName || item.subreddit || undefined;
      
      return {
        source: determineSource(apifyActorId),
        source_url: url,
        content: content,
        author: author,
        post_date: createdAt,
        topic: extractTopic(content, subreddit)
      };
    }).filter(post => post.content.length > API_LIMITS.MIN_POST_LENGTH); // Filter out very short posts

    console.log(`Transformed ${postsToInsert.length} posts (filtered from ${items.length})`);
    if (postsToInsert.length > 0) {
      console.log('Sample transformed post:', JSON.stringify(postsToInsert[0], null, 2));
    }

    // Check for existing posts to avoid duplicates
    const contentHashes = postsToInsert.map(post => post.content);
    const { data: existingPosts } = await supabase
      .from('political_posts')
      .select('content')
      .in('content', contentHashes);

    const existingContentSet = new Set(existingPosts?.map(p => p.content) || []);
    const newPosts = postsToInsert.filter(post => !existingContentSet.has(post.content));

    console.log(`Filtered duplicates: ${postsToInsert.length - newPosts.length} duplicates found, ${newPosts.length} new posts to insert`);

    if (newPosts.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          scraped: items.length,
          stored: 0,
          duplicates: postsToInsert.length,
          message: 'All posts already exist in database (duplicates skipped).'
        }
      });
    }

    // Insert in batches to avoid timeout
    let insertedCount = 0;
    
    for (let i = 0; i < newPosts.length; i += API_LIMITS.SCRAPE_BATCH_SIZE) {
      const batch = newPosts.slice(i, i + API_LIMITS.SCRAPE_BATCH_SIZE);
      const { error, data } = await supabase
        .from('political_posts')
        .insert(batch)
        .select('id');

      if (error) {
        console.error('Batch insert error:', error);
        continue;
      }
      
      insertedCount += data?.length || 0;
    }

    // Log health metric
    await supabase.from('system_health').insert({
      metric_name: 'apify_scrape',
      metric_value: {
        run_id: run.id,
        items_fetched: items.length,
        items_stored: insertedCount,
        duplicates_skipped: postsToInsert.length - newPosts.length,
        actor_id: apifyActorId,
        status: 'success'
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        scraped: items.length,
        stored: insertedCount,
        duplicates: postsToInsert.length - newPosts.length,
        message: `Successfully scraped ${items.length} posts. Stored ${insertedCount} new posts, skipped ${postsToInsert.length - newPosts.length} duplicates.`
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Scraping failed';
    console.error('Scrape error:', error);
    
    // Log error to health tracking
    try {
      const supabase = createServiceClient();
      await supabase.from('system_health').insert({
        metric_name: 'apify_scrape_error',
        metric_value: {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          status: 'failed'
        }
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        message: 'Scraping failed. Please check API credentials and try again.'
      },
      { status: 500 }
    );
  }
}

// Helper: Get default Apify input based on actor
function getDefaultInput() {
  const actorId = process.env.APIFY_ACTOR_ID || 'apify/reddit-scraper';
  
  if (actorId.includes('reddit')) {
    return {
      startUrls: [
        { url: 'https://www.reddit.com/r/Philippines/' }
      ],
      searches: [
        'politics',
        'election',
        'government',
        'duterte',
        'marcos'
      ],
      sort: 'new',
      time: 'week',
      maxItems: 50,
      skipComments: true,
      skipCommunity: true,
      searchPosts: true
    };
  }
  
  if (actorId.includes('twitter')) {
    return {
      searchTerms: ['#PhilippinePolitics', 'Philippine election', 'PH government'],
      maxTweets: 50,
      language: 'en'
    };
  }
  
  // Default fallback
  return { maxItems: 50 };
}

// Helper: Determine source from actor ID
function determineSource(actorId: string): 'reddit' | 'twitter' | 'news' | 'facebook' {
  if (actorId.includes('reddit')) return 'reddit';
  if (actorId.includes('twitter')) return 'twitter';
  if (actorId.includes('news')) return 'news';
  return 'facebook';
}

// Helper: Extract topic from content
function extractTopic(content: string, subreddit?: string): string {
  const lowerContent = content.toLowerCase();
  
  const topics = [
    { keywords: ['election', 'vote', 'campaign'], label: 'elections' },
    { keywords: ['corruption', 'scandal', 'bribery'], label: 'corruption' },
    { keywords: ['infrastructure', 'build', 'project'], label: 'infrastructure' },
    { keywords: ['education', 'school', 'student'], label: 'education' },
    { keywords: ['health', 'hospital', 'medical'], label: 'healthcare' },
    { keywords: ['economy', 'jobs', 'unemployment'], label: 'economy' },
    { keywords: ['law', 'bill', 'legislation'], label: 'legislation' },
  ];

  for (const topic of topics) {
    if (topic.keywords.some(kw => lowerContent.includes(kw))) {
      return topic.label;
    }
  }

  return subreddit || 'general';
}