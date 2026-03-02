'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, RefreshCw, Wifi, WifiOff, Clock, VolumeX, Link2, Copy, Check, Users, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useCountdownStore, countdownApi, syncApi, Countdown } from '@/lib/countdown-store';
import { CountdownCard } from '@/components/countdown/CountdownCard';
import { AddCountdownModal } from '@/components/countdown/AddCountdownModal';
import { useToast } from '@/hooks/use-toast';
import { soundApi, audioManager, initializeDefaultSounds } from '@/lib/sound-store';

export default function HomePage() {
  const { toast } = useToast();
  const {
    countdowns,
    syncCode,
    isLoading,
    isOnline,
    setCountdowns,
    addCountdown,
    updateCountdown: updateStoreCountdown,
    removeCountdown,
    setSyncCode,
    setLoading,
    setOnline,
  } = useCountdownStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCountdown, setEditingCountdown] = useState<Countdown | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [pendingActions, setPendingActions] = useState<Array<{
    type: 'create' | 'update' | 'delete';
    data: any;
    id?: string;
  }>>([]);

  const triggeredCountdowns = useRef<Set<string>>(new Set());

  // Initialize sounds
  useEffect(() => {
    initializeDefaultSounds();
  }, []);

  // Check online status
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      if (pendingActions.length > 0 && syncCode) {
        syncPendingActions();
      }
    };
    const handleOffline = () => setOnline(false);

    setOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline, pendingActions, syncCode]);

  // Background countdown checker
  useEffect(() => {
    const checkCountdowns = () => {
      const now = new Date();

      countdowns.forEach(async (countdown) => {
        const targetDate = new Date(countdown.targetDate);
        const isPast = now >= targetDate;

        if (isPast && !triggeredCountdowns.current.has(countdown.id) && !countdown.completed) {
          triggeredCountdowns.current.add(countdown.id);

          if (countdown.soundId) {
            try {
              const sound = await soundApi.get(countdown.soundId);
              if (sound) {
                audioManager.setVolume(countdown.volume ?? 1.0);
                await audioManager.play(sound.data, countdown.loopSound);
              }
            } catch (error) {
              console.error('Failed to play sound:', error);
            }
          }

          if (countdown.notify && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(`⏰ ${countdown.title}`, {
              body: 'Your countdown has ended!',
              icon: '/icon-192.png',
              tag: countdown.id,
            });
          }

          updateStoreCountdown(countdown.id, { completed: true });
        }
      });
    };

    const interval = setInterval(checkCountdowns, 1000);
    checkCountdowns();

    return () => clearInterval(interval);
  }, [countdowns, updateStoreCountdown]);

  // Sync pending actions
  const syncPendingActions = useCallback(async () => {
    if (pendingActions.length === 0 || !syncCode) return;

    toast({
      title: 'Syncing...',
      description: `Syncing ${pendingActions.length} pending change(s)`,
    });

    for (const action of pendingActions) {
      try {
        if (action.type === 'create') {
          const newCountdown = await countdownApi.create(syncCode, action.data);
          const oldId = action.data.tempId;
          if (oldId) {
            removeCountdown(oldId);
            addCountdown(newCountdown);
          }
        } else if (action.type === 'update' && action.id) {
          await countdownApi.update(syncCode, action.id, action.data);
        } else if (action.type === 'delete' && action.id) {
          await countdownApi.delete(syncCode, action.id);
        }
      } catch (error) {
        console.error('Failed to sync action:', action, error);
      }
    }

    setPendingActions([]);
    toast({
      title: 'Sync complete',
      description: 'All changes have been synced',
    });
  }, [pendingActions, syncCode, addCountdown, removeCountdown, toast]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Load countdowns
  const loadCountdowns = useCallback(async () => {
    if (!syncCode || !navigator.onLine) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await countdownApi.fetchAll(syncCode);
      setCountdowns(data);
    } catch (error) {
      console.error('Failed to load countdowns:', error);
    } finally {
      setLoading(false);
    }
  }, [syncCode, setCountdowns, setLoading]);

  // Load countdowns when sync code changes
  useEffect(() => {
    if (syncCode && isOnline) {
      loadCountdowns();
    }
  }, [syncCode, isOnline, loadCountdowns]);

  // Create new sync group
  const handleCreateSync = async () => {
    try {
      const code = await syncApi.create();
      setSyncCode(code);
      setCountdowns([]);
      toast({
        title: 'Sync created!',
        description: `Your code is: ${code}`,
      });
    } catch (error) {
      console.error('Failed to create sync:', error);
      toast({
        title: 'Error',
        description: 'Failed to create sync code',
        variant: 'destructive',
      });
    }
  };

  // Join existing sync group
  const handleJoinSync = async () => {
    if (!codeInput.trim() || codeInput.length !== 6) {
      toast({
        title: 'Invalid code',
        description: 'Please enter a 6-character code',
        variant: 'destructive',
      });
      return;
    }

    try {
      const countdowns = await syncApi.getCountdowns(codeInput);
      setSyncCode(codeInput.toUpperCase());
      setCountdowns(countdowns);
      toast({
        title: 'Connected!',
        description: `Synced with code: ${codeInput.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Failed to join sync:', error);
      toast({
        title: 'Error',
        description: 'Invalid sync code or failed to connect',
        variant: 'destructive',
      });
    }
  };

  // Leave sync group
  const handleLeaveSync = () => {
    setSyncCode(null);
    setCountdowns([]);
    setCodeInput('');
    toast({
      title: 'Disconnected',
      description: 'You have left the sync group',
    });
  };

  // Copy sync code
  const handleCopyCode = async () => {
    if (syncCode) {
      await navigator.clipboard.writeText(syncCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Copied!',
        description: `Code ${syncCode} copied to clipboard`,
      });
    }
  };

  const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Handle create/edit countdown
  const handleSaveCountdown = async (data: {
    title: string;
    targetDate: string;
    description?: string;
    color: string;
    icon?: string;
    notify: boolean;
    soundId?: string | null;
    loopSound: boolean;
    volume: number;
  }) => {
    if (editingCountdown) {
      updateStoreCountdown(editingCountdown.id, {
        ...data,
        updatedAt: new Date().toISOString(),
      });

      if (isOnline && syncCode) {
        try {
          const updated = await countdownApi.update(syncCode, editingCountdown.id, data);
          updateStoreCountdown(editingCountdown.id, updated);
          toast({
            title: 'Countdown updated',
            description: `"${data.title}" has been updated`,
          });
        } catch (error) {
          console.error('Failed to update on server:', error);
          setPendingActions(prev => [...prev, { type: 'update', id: editingCountdown.id, data }]);
          toast({
            title: 'Saved offline',
            description: 'Changes will sync when online',
          });
        }
      } else {
        setPendingActions(prev => [...prev, { type: 'update', id: editingCountdown.id, data }]);
      }

      setEditingCountdown(null);
      return;
    }

    const tempId = generateTempId();
    const newCountdown: Countdown = {
      id: tempId,
      ...data,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addCountdown(newCountdown);

    if (isOnline && syncCode) {
      try {
        const created = await countdownApi.create(syncCode, data);
        removeCountdown(tempId);
        addCountdown(created);

        toast({
          title: 'Countdown created',
          description: `"${data.title}" has been added`,
        });
      } catch (error) {
        console.error('Failed to create on server:', error);
        setPendingActions(prev => [...prev, { type: 'create', data: { ...data, tempId } }]);
        toast({
          title: 'Saved offline',
          description: 'Will sync when online',
        });
      }
    } else {
      setPendingActions(prev => [...prev, { type: 'create', data: { ...data, tempId } }]);
      toast({
        title: 'Saved offline',
        description: 'Will sync when online',
      });
    }
  };

  // Handle delete countdown
  const handleDeleteCountdown = async (id: string) => {
    audioManager.stop();
    removeCountdown(id);

    if (isOnline && syncCode) {
      try {
        await countdownApi.delete(syncCode, id);
        toast({
          title: 'Countdown deleted',
          description: 'The countdown has been removed',
        });
      } catch (error) {
        console.error('Failed to delete from server:', error);
        setPendingActions(prev => [...prev, { type: 'delete', id }]);
      }
    } else {
      setPendingActions(prev => [...prev, { type: 'delete', id }]);
    }
  };

  // Handle toggle notification
  const handleToggleNotify = async (id: string, notify: boolean) => {
    updateStoreCountdown(id, { notify });

    if (isOnline && syncCode) {
      try {
        await countdownApi.update(syncCode, id, { notify });
      } catch (error) {
        console.error('Failed to update notification:', error);
      }
    } else {
      setPendingActions(prev => [...prev, { type: 'update', id, data: { notify } }]);
    }
  };

  // Handle stop sound
  const handleStopSound = () => {
    audioManager.stop();
    toast({
      title: 'Sound stopped',
      description: 'The alarm sound has been stopped',
    });
  };

  const sortedCountdowns = [...countdowns].sort((a, b) => {
    const aPast = new Date(a.targetDate) <= new Date();
    const bPast = new Date(b.targetDate) <= new Date();
    if (aPast && !bPast) return 1;
    if (!aPast && bPast) return -1;
    return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
  });

  // Not synced - show setup page
  if (!syncCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col">
        {/* Header */}
        <header className="p-4">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ rotate: -10 }}
                animate={{ rotate: 0 }}
                className="p-2 rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500 shadow-lg"
              >
                <Clock className="w-6 h-6 text-white" />
              </motion.div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
                  Countdown
                </span>
              </h1>
            </div>

            {/* Online/Offline indicator */}
            <Badge
              variant="outline"
              className={`gap-1 ${
                isOnline
                  ? 'bg-green-500/10 text-green-600 border-green-500/20'
                  : 'bg-orange-500/10 text-orange-600 border-orange-500/20'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3 h-3" />
                  Online
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" />
                  Offline
                </>
              )}
            </Badge>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full"
          >
            <div className="p-6 rounded-full bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-cyan-500/10 mb-6 inline-block">
              <Link2 className="w-16 h-16 text-muted-foreground/50" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Sync Your Countdowns</h2>
            <p className="text-muted-foreground mb-8">
              Create a sync code to share countdowns between devices, or enter an existing code to join.
            </p>

            <div className="space-y-4">
              <Button
                onClick={handleCreateSync}
                size="lg"
                className="w-full gap-2 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 hover:opacity-90"
              >
                <Plus className="w-5 h-5" />
                Create New Sync Code
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Enter 6-digit code"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                />
                <Button onClick={handleJoinSync} variant="secondary">
                  Join
                </Button>
              </div>
            </div>
          </motion.div>
        </main>

        {/* Features */}
        <div className="p-8 max-w-4xl mx-auto w-full">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { title: 'Colorful Design', desc: 'Personalize with colors and emojis' },
              { title: 'Notifications', desc: 'Get alerts when countdowns end' },
              { title: 'Custom Sounds', desc: 'Upload your own alert sounds' },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                className="p-4 rounded-xl bg-muted/50 text-center"
              >
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Synced - show main app
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ rotate: -10 }}
                animate={{ rotate: 0 }}
                className="p-2 rounded-xl bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500 shadow-lg"
              >
                <Clock className="w-6 h-6 text-white" />
              </motion.div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
                  Countdown
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {/* Stop sound button */}
              {audioManager.getIsPlaying() && (
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={handleStopSound}
                  className="animate-pulse"
                >
                  <VolumeX className="w-4 h-4" />
                </Button>
              )}

              {/* Online/Offline indicator */}
              <Badge
                variant="outline"
                className={`gap-1 ${
                  isOnline
                    ? 'bg-green-500/10 text-green-600 border-green-500/20'
                    : 'bg-orange-500/10 text-orange-600 border-orange-500/20'
                }`}
              >
                {isOnline ? (
                  <>
                    <Wifi className="w-3 h-3" />
                    Online
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3" />
                    Offline
                  </>
                )}
              </Badge>

              {/* Pending sync indicator */}
              {pendingActions.length > 0 && (
                <Badge variant="outline" className="gap-1 bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                  <RefreshCw className="w-3 h-3" />
                  {pendingActions.length} pending
                </Badge>
              )}

              {/* Sync code badge */}
              <Badge
                variant="secondary"
                className="gap-1 cursor-pointer hover:bg-secondary/80"
                onClick={handleCopyCode}
              >
                <Users className="w-3 h-3" />
                {copied ? <Check className="w-3 h-3" /> : syncCode}
              </Badge>

              {/* Refresh button */}
              {isOnline && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={loadCountdowns}
                  disabled={isLoading}
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              )}

              {/* Add button */}
              <Button onClick={() => setShowAddModal(true)} className="gap-1">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add</span>
              </Button>

              {/* Leave sync */}
              <Button
                variant="outline"
                size="icon"
                onClick={handleLeaveSync}
                title="Leave sync group"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Sync code info */}
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 flex items-center gap-2"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyCode}
              className="text-xs gap-1"
            >
              <Copy className="w-3 h-3" />
              {copied ? 'Copied!' : `Tap to copy: ${syncCode}`}
            </Button>
          </motion.div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {countdowns.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="p-6 rounded-full bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-cyan-500/10 mb-6">
              <Clock className="w-16 h-16 text-muted-foreground/50" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No countdowns yet</h2>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Create your first countdown to start tracking important moments
            </p>
            <Button
              onClick={() => setShowAddModal(true)}
              size="lg"
              className="gap-2 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 hover:opacity-90"
            >
              <Plus className="w-5 h-5" />
              Create Your First Countdown
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <AnimatePresence mode="popLayout">
              {sortedCountdowns.map((countdown) => (
                <CountdownCard
                  key={countdown.id}
                  countdown={countdown}
                  onEdit={(c) => {
                    setEditingCountdown(c);
                    setShowAddModal(true);
                  }}
                  onDelete={handleDeleteCountdown}
                  onToggleNotify={handleToggleNotify}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      <AddCountdownModal
        open={showAddModal}
        onOpenChange={(open) => {
          setShowAddModal(open);
          if (!open) setEditingCountdown(null);
        }}
        onSave={handleSaveCountdown}
        editingCountdown={editingCountdown}
      />
    </div>
  );
}
