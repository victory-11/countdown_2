import { NextResponse } from 'next/server';
import { createSyncGroup } from '@/lib/store';

// POST /api/sync - Create a new sync group
export async function POST() {
  try {
    const code = await createSyncGroup();
    return NextResponse.json({ code }, { status: 201 });
  } catch (error) {
    console.error('Error creating sync group:', error);
    return NextResponse.json(
      { error: 'Failed to create sync group' },
      { status: 500 }
    );
  }
}
