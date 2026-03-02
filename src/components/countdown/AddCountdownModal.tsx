'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Sparkles, Music } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Countdown } from '@/lib/countdown-store';
import { SoundSelector } from './SoundSelector';

const PRESET_COLORS = [
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'Pink', value: '#EC4899' },
];

const EMOJI_OPTIONS = [
  '🎉', '🎂', '🎄', '🎊', '💍', '🎓', '🚀', '✈️', '🏖️', '💪',
  '❤️', '🌟', '🎁', '🏆', '📅', '⏰', '🔥', '💎', '🎯', '🎪',
];

interface AddCountdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    title: string;
    targetDate: string;
    description?: string;
    color: string;
    icon?: string;
    notify: boolean;
    soundId?: string | null;
    loopSound: boolean;
    volume: number;
  }) => void;
  editingCountdown?: Countdown | null;
}

interface FormState {
  title: string;
  date: string;
  time: string;
  description: string;
  color: string;
  icon: string;
  notify: boolean;
  soundId: string | null;
  loopSound: boolean;
  volume: number;
}

function getInitialFormState(editingCountdown?: Countdown | null): FormState {
  if (editingCountdown) {
    // Parse the ISO string and convert to local timezone for display
    const targetDate = new Date(editingCountdown.targetDate);
    return {
      title: editingCountdown.title,
      date: format(targetDate, 'yyyy-MM-dd'),
      time: format(targetDate, 'HH:mm'),
      description: editingCountdown.description || '',
      color: editingCountdown.color,
      icon: editingCountdown.icon || '',
      notify: editingCountdown.notify,
      soundId: editingCountdown.soundId || null,
      loopSound: editingCountdown.loopSound ?? false,
      volume: editingCountdown.volume ?? 1.0,
    };
  }
  return {
    title: '',
    date: '',
    time: '',
    description: '',
    color: PRESET_COLORS[0].value,
    icon: '',
    notify: true,
    soundId: null,
    loopSound: false,
    volume: 1.0,
  };
}

function FormContent({
  editingCountdown,
  onSave,
  onOpenChange,
}: {
  editingCountdown?: Countdown | null;
  onSave: AddCountdownModalProps['onSave'];
  onOpenChange: AddCountdownModalProps['onOpenChange'];
}) {
  const initialState = getInitialFormState(editingCountdown);
  const [title, setTitle] = useState(initialState.title);
  const [date, setDate] = useState(initialState.date);
  const [time, setTime] = useState(initialState.time);
  const [description, setDescription] = useState(initialState.description);
  const [color, setColor] = useState(initialState.color);
  const [icon, setIcon] = useState(initialState.icon);
  const [notify, setNotify] = useState(initialState.notify);
  const [soundId, setSoundId] = useState<string | null>(initialState.soundId);
  const [loopSound, setLoopSound] = useState(initialState.loopSound);
  const [volume, setVolume] = useState(initialState.volume);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) return;

    // Create date in user's local timezone, then convert to ISO string
    // This ensures the countdown targets the correct time in the user's timezone
    const timeString = time || '00:00';
    const localDate = new Date(`${date}T${timeString}:00`);
    const targetDate = localDate.toISOString();

    onSave({
      title,
      targetDate,
      description: description || undefined,
      color,
      icon: icon || undefined,
      notify,
      soundId,
      loopSound,
      volume,
    });

    onOpenChange(false);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="sound" className="gap-1">
            <Music className="w-3 h-3" />
            Sound
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4 mt-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What are you counting down to?"
              required
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add some details..."
              rows={2}
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <motion.button
                  key={c.value}
                  type="button"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setColor(c.value)}
                  className={`w-8 h-8 rounded-full transition-all duration-200 ${
                    color === c.value
                      ? 'ring-2 ring-offset-2 ring-offset-background'
                      : ''
                  }`}
                  style={{
                    backgroundColor: c.value,
                    ringColor: c.value,
                  }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Emoji Picker */}
          <div className="space-y-2">
            <Label>Icon (optional)</Label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <motion.button
                  key={emoji}
                  type="button"
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIcon(icon === emoji ? '' : emoji)}
                  className={`w-10 h-10 text-xl rounded-lg transition-all ${
                    icon === emoji
                      ? 'bg-primary/20 ring-2 ring-primary'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Notification Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="notify" className="cursor-pointer">
              Enable Notifications
            </Label>
            <Switch
              id="notify"
              checked={notify}
              onCheckedChange={setNotify}
            />
          </div>
        </TabsContent>

        <TabsContent value="sound" className="mt-4">
          <SoundSelector
            selectedSoundId={soundId}
            loopSound={loopSound}
            volume={volume}
            onSoundChange={setSoundId}
            onLoopChange={setLoopSound}
            onVolumeChange={setVolume}
          />
        </TabsContent>
      </Tabs>

      <DialogFooter className="gap-2 sm:gap-0 mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!title || !date}>
          {editingCountdown ? 'Save Changes' : 'Create Countdown'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function AddCountdownModal({
  open,
  onOpenChange,
  onSave,
  editingCountdown,
}: AddCountdownModalProps) {
  // Use key to force re-mount when editingCountdown changes
  const formKey = editingCountdown?.id || 'new';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {editingCountdown ? 'Edit Countdown' : 'Create New Countdown'}
          </DialogTitle>
        </DialogHeader>
        <FormContent
          key={formKey}
          editingCountdown={editingCountdown}
          onSave={onSave}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  );
}
