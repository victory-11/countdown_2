import { NextRequest, NextResponse } from 'next/server';
import { getCountdowns, updateCountdown, deleteCountdown } from '@/lib/store';

// GET /api/countdowns/[id] - Get single countdown
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const syncCode = searchParams.get('syncCode');

    if (!syncCode) {
      return NextResponse.json({ error: 'syncCode is required' }, { status: 400 });
    }

    const countdowns = await getCountdowns(syncCode);
    const countdown = countdowns.find(c => c.id === id);

    if (!countdown) {
      return NextResponse.json(
        { error: 'Countdown not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(countdown);
  } catch (error) {
    console.error('Error fetching countdown:', error);
    return NextResponse.json(
      { error: 'Failed to fetch countdown' },
      { status: 500 }
    );
  }
}

// PUT /api/countdowns/[id] - Update countdown
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { syncCode, ...updates } = body;

    if (!syncCode) {
      return NextResponse.json({ error: 'syncCode is required' }, { status: 400 });
    }

    const success = await updateCountdown(syncCode, id, updates);

    if (!success) {
      return NextResponse.json(
        { error: 'Countdown not found' },
        { status: 404 }
      );
    }

    // Return the updated countdown
    const countdowns = await getCountdowns(syncCode);
    const updatedCountdown = countdowns.find(c => c.id === id);

    return NextResponse.json(updatedCountdown);
  } catch (error) {
    console.error('Error updating countdown:', error);
    return NextResponse.json(
      { error: 'Failed to update countdown' },
      { status: 500 }
    );
  }
}

// DELETE /api/countdowns/[id] - Delete countdown
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const syncCode = searchParams.get('syncCode');

    if (!syncCode) {
      return NextResponse.json({ error: 'syncCode is required' }, { status: 400 });
    }

    const success = await deleteCountdown(syncCode, id);

    if (!success) {
      return NextResponse.json(
        { error: 'Countdown not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting countdown:', error);
    return NextResponse.json(
      { error: 'Failed to delete countdown' },
      { status: 500 }
    );
  }
}
