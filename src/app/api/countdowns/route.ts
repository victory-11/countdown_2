import { NextRequest, NextResponse } from 'next/server';
import { getCountdowns, addCountdown, CountdownData } from '@/lib/store';
import { v4 as uuidv4 } from 'uuid';

// GET /api/countdowns - Get all countdowns for a sync code
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const syncCode = searchParams.get('syncCode');

    if (!syncCode) {
      return NextResponse.json({ error: 'syncCode is required' }, { status: 400 });
    }

    const countdowns = await getCountdowns(syncCode);
    return NextResponse.json(countdowns);
  } catch (error) {
    console.error('Error fetching countdowns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch countdowns' },
      { status: 500 }
    );
  }
}

// POST /api/countdowns - Create new countdown
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { syncCode, title, targetDate, description, color, icon, notify, soundId, loopSound, volume } = body;

    if (!syncCode) {
      return NextResponse.json({ error: 'syncCode is required' }, { status: 400 });
    }

    if (!title || !targetDate || !color) {
      return NextResponse.json(
        { error: 'Title, targetDate, and color are required' },
        { status: 400 }
      );
    }

    const countdown: CountdownData = {
      id: uuidv4(),
      title,
      targetDate,
      description: description || '',
      color,
      icon: icon || '',
      notify: notify ?? true,
      completed: false,
      soundId: soundId || undefined,
      loopSound: loopSound ?? false,
      volume: volume ?? 1.0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await addCountdown(syncCode, countdown);

    return NextResponse.json(countdown, { status: 201 });
  } catch (error) {
    console.error('Error creating countdown:', error);
    return NextResponse.json(
      { error: 'Failed to create countdown' },
      { status: 500 }
    );
  }
}
