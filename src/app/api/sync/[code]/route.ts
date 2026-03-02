import { NextRequest, NextResponse } from 'next/server';
import { getCountdowns } from '@/lib/store';

// GET /api/sync/[code] - Get all countdowns for a sync code
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const countdowns = await getCountdowns(code);
    return NextResponse.json({ countdowns });
  } catch (error) {
    console.error('Error fetching countdowns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch countdowns' },
      { status: 500 }
    );
  }
}
