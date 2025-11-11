// lib/env.ts
// Environment variable validation

export interface EnvVars {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  OPENAI_API_KEY: string;
  APIFY_API_TOKEN: string;
  APIFY_ACTOR_ID?: string; // Optional, has default
}

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY',
  'APIFY_API_TOKEN',
] as const;

export function validateEnv(): EnvVars {
  const missing: string[] = [];
  const invalid: string[] = [];

  // Check required variables
  for (const varName of requiredEnvVars) {
    const value = process.env[varName];
    if (!value) {
      missing.push(varName);
    } else if (value.trim() === '') {
      invalid.push(varName);
    }
  }

  // Validate URL format for Supabase URL
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    } catch {
      invalid.push('NEXT_PUBLIC_SUPABASE_URL (invalid URL format)');
    }
  }

  // Report errors
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map(v => `  - ${v}`).join('\n')}\n\n` +
      `Please add these to your .env.local file.`
    );
  }

  if (invalid.length > 0) {
    throw new Error(
      `Invalid environment variables:\n${invalid.map(v => `  - ${v}`).join('\n')}\n\n` +
      `Please check your .env.local file.`
    );
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
    APIFY_API_TOKEN: process.env.APIFY_API_TOKEN!,
    APIFY_ACTOR_ID: process.env.APIFY_ACTOR_ID,
  };
}

// Validate on module load in development
if (process.env.NODE_ENV !== 'production') {
  try {
    validateEnv();
    console.log('✅ Environment variables validated successfully');
  } catch (error) {
    console.error('❌ Environment validation failed:');
    console.error(error instanceof Error ? error.message : error);
    // Don't throw in development to allow for partial setup
  }
}
