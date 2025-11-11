import { NextResponse } from 'next/server';
import { getProgress } from '@/lib/analysisProgress';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const runId = url.searchParams.get('runId');

  if (!runId) {
    return NextResponse.json({ success: false, error: 'Missing runId' }, { status: 400 });
  }

  const progress = getProgress(runId);
  if (!progress) {
    return NextResponse.json({ success: false, error: 'Run not found or completed' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: { runId, progress } });
}
