import { db } from './db'

export type CountdownData = {
  id: string
  title: string
  targetDate: string
  description?: string
  color: string
  icon?: string
  notify: boolean
  completed: boolean
  soundId?: string
  loopSound: boolean
  volume: number
  createdAt: string
  updatedAt: string
}

// Generate a unique sync code
export function generateSyncCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Create a new sync group and return its code
export async function createSyncGroup(): Promise<string> {
  let code = generateSyncCode()

  // Ensure unique code
  let existing = await db.syncGroup.findUnique({ where: { code } })
  while (existing) {
    code = generateSyncCode()
    existing = await db.syncGroup.findUnique({ where: { code } })
  }

  const syncGroup = await db.syncGroup.create({
    data: { code },
  })

  return syncGroup.code
}

// Get countdowns for a sync code
export async function getCountdowns(syncCode: string): Promise<CountdownData[]> {
  const syncGroup = await db.syncGroup.findUnique({
    where: { code: syncCode.toUpperCase() },
    include: {
      countdowns: {
        orderBy: { targetDate: 'asc' },
      },
    },
  })

  if (!syncGroup) return []

  return syncGroup.countdowns.map(c => ({
    id: c.id,
    title: c.title,
    targetDate: c.targetDate.toISOString(),
    description: c.description || undefined,
    color: c.color,
    icon: c.icon || undefined,
    notify: c.notify,
    completed: c.completed,
    soundId: c.soundId || undefined,
    loopSound: c.loopSound,
    volume: c.volume,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }))
}

// Add a countdown
export async function addCountdown(syncCode: string, countdown: CountdownData): Promise<void> {
  const syncGroup = await db.syncGroup.findUnique({
    where: { code: syncCode.toUpperCase() },
  })

  if (!syncGroup) {
    throw new Error('Sync group not found')
  }

  await db.countdown.create({
    data: {
      id: countdown.id,
      title: countdown.title,
      targetDate: new Date(countdown.targetDate),
      description: countdown.description,
      color: countdown.color,
      icon: countdown.icon,
      notify: countdown.notify,
      completed: countdown.completed,
      soundId: countdown.soundId,
      loopSound: countdown.loopSound,
      volume: countdown.volume,
      syncGroupId: syncGroup.id,
    },
  })
}

// Update a countdown
export async function updateCountdown(
  syncCode: string,
  countdownId: string,
  updates: Partial<CountdownData>
): Promise<boolean> {
  const syncGroup = await db.syncGroup.findUnique({
    where: { code: syncCode.toUpperCase() },
  })

  if (!syncGroup) return false

  const countdown = await db.countdown.findFirst({
    where: { id: countdownId, syncGroupId: syncGroup.id },
  })

  if (!countdown) return false

  const updateData: Record<string, unknown> = {}

  if (updates.title !== undefined) updateData.title = updates.title
  if (updates.targetDate !== undefined) updateData.targetDate = new Date(updates.targetDate)
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.color !== undefined) updateData.color = updates.color
  if (updates.icon !== undefined) updateData.icon = updates.icon
  if (updates.notify !== undefined) updateData.notify = updates.notify
  if (updates.completed !== undefined) updateData.completed = updates.completed
  if (updates.soundId !== undefined) updateData.soundId = updates.soundId
  if (updates.loopSound !== undefined) updateData.loopSound = updates.loopSound
  if (updates.volume !== undefined) updateData.volume = updates.volume

  await db.countdown.update({
    where: { id: countdownId },
    data: updateData,
  })

  return true
}

// Delete a countdown
export async function deleteCountdown(syncCode: string, countdownId: string): Promise<boolean> {
  const syncGroup = await db.syncGroup.findUnique({
    where: { code: syncCode.toUpperCase() },
  })

  if (!syncGroup) return false

  const countdown = await db.countdown.findFirst({
    where: { id: countdownId, syncGroupId: syncGroup.id },
  })

  if (!countdown) return false

  await db.countdown.delete({
    where: { id: countdownId },
  })

  return true
}
