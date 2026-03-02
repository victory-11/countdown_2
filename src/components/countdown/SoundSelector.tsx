'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Trash2, Play, Square, Volume2, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { soundApi, audioManager, CustomSound, DEFAULT_SOUNDS } from '@/lib/sound-store';

interface SoundSelectorProps {
  selectedSoundId: string | null;
  loopSound: boolean;
  volume: number;
  onSoundChange: (soundId: string | null) => void;
  onLoopChange: (loop: boolean) => void;
  onVolumeChange: (volume: number) => void;
}

export function SoundSelector({
  selectedSoundId,
  loopSound,
  volume,
  onSoundChange,
  onLoopChange,
  onVolumeChange,
}: SoundSelectorProps) {
  const [sounds, setSounds] = useState<CustomSound[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load sounds on mount
  useEffect(() => {
    loadSounds();
  }, []);

  const loadSounds = async () => {
    try {
      await soundApi.getAll(); // Initialize DB
      const loadedSounds = await soundApi.getAll();
      // Add default sounds at the beginning
      setSounds([
        ...DEFAULT_SOUNDS.map(s => ({ ...s, createdAt: new Date().toISOString() })),
        ...loadedSounds.filter(s => !s.id.startsWith('default-') && !s.id.startsWith('celebration') && !s.id.startsWith('gentle')),
      ]);
    } catch (error) {
      console.error('Failed to load sounds:', error);
      // Still show default sounds
      setSounds(DEFAULT_SOUNDS.map(s => ({ ...s, createdAt: new Date().toISOString() })));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith('audio/')) {
      alert('Please select an audio file (MP3, WAV, etc.)');
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setIsLoading(true);
    try {
      const base64 = await soundApi.fileToBase64(file);
      const duration = await soundApi.getDuration(base64);

      const newSound: CustomSound = {
        id: `custom-${Date.now()}`,
        name: `🎵 ${file.name.replace(/\.[^/.]+$/, '')}`,
        data: base64,
        type: file.type,
        duration,
        createdAt: new Date().toISOString(),
      };

      await soundApi.save(newSound);
      setSounds(prev => [...prev, newSound]);
      onSoundChange(newSound.id);
    } catch (error) {
      console.error('Failed to upload sound:', error);
      alert('Failed to upload sound. Please try again.');
    } finally {
      setIsLoading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePlaySound = async (sound: CustomSound) => {
    if (playingId === sound.id) {
      // Stop playing
      audioManager.stop();
      setPlayingId(null);
    } else {
      // Play this sound
      try {
        setPlayingId(sound.id);
        await audioManager.play(sound.data, false);
        setPlayingId(null);
      } catch (error) {
        console.error('Failed to play sound:', error);
        setPlayingId(null);
      }
    }
  };

  const handleDeleteSound = async (soundId: string) => {
    // Don't allow deleting default sounds
    if (soundId.startsWith('default-') || soundId === 'celebration' || soundId === 'gentle-chime') {
      return;
    }

    try {
      await soundApi.delete(soundId);
      setSounds(prev => prev.filter(s => s.id !== soundId));
      if (selectedSoundId === soundId) {
        onSoundChange(null);
      }
    } catch (error) {
      console.error('Failed to delete sound:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sound Selection */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Music className="w-4 h-4" />
          Completion Sound
        </Label>
        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
          {/* No sound option */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSoundChange(null)}
            className={`p-2 rounded-lg text-left text-sm transition-all ${
              selectedSoundId === null
                ? 'bg-primary/20 border-2 border-primary'
                : 'bg-muted border-2 border-transparent hover:bg-muted/80'
            }`}
          >
            <div className="font-medium">🔇 No Sound</div>
          </motion.button>

          {/* Sound options */}
          {sounds.map((sound) => (
            <motion.div
              key={sound.id}
              className={`p-2 rounded-lg border-2 transition-all ${
                selectedSoundId === sound.id
                  ? 'bg-primary/20 border-primary'
                  : 'bg-muted border-transparent hover:bg-muted/80'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => onSoundChange(sound.id)}
                  className="flex-1 text-left text-sm truncate"
                >
                  <div className="font-medium truncate">{sound.name}</div>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handlePlaySound(sound)}
                    className="p-1 rounded hover:bg-background/50"
                  >
                    {playingId === sound.id ? (
                      <Square className="w-3 h-3 text-primary" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                  </button>
                  {!sound.id.startsWith('default-') && sound.id !== 'celebration' && sound.id !== 'gentle-chime' && (
                    <button
                      type="button"
                      onClick={() => handleDeleteSound(sound.id)}
                      className="p-1 rounded hover:bg-destructive/20"
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Upload custom sound */}
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="w-full gap-2"
        >
          <Upload className="w-4 h-4" />
          {isLoading ? 'Uploading...' : 'Upload Custom Sound'}
        </Button>
        <p className="text-xs text-muted-foreground">
          MP3, WAV, OGG. Max 5MB.
        </p>
      </div>

      {/* Volume slider */}
      {selectedSoundId && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            Volume: {Math.round(volume * 100)}%
          </Label>
          <Slider
            value={[volume * 100]}
            onValueChange={(value) => onVolumeChange(value[0] / 100)}
            max={100}
            step={1}
            className="w-full"
          />
        </div>
      )}

      {/* Loop toggle */}
      {selectedSoundId && (
        <div className="flex items-center justify-between">
          <Label htmlFor="loopSound" className="cursor-pointer">
            Loop Sound
          </Label>
          <Switch
            id="loopSound"
            checked={loopSound}
            onCheckedChange={onLoopChange}
          />
        </div>
      )}
    </div>
  );
}
