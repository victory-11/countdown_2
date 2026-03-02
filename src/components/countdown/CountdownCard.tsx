'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Edit2, Trash2, Bell, BellOff, CheckCircle, Pin, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TimeDisplay } from './TimeDisplay';
import { Countdown } from '@/lib/countdown-store';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CountdownCardProps {
  countdown: Countdown;
  onEdit: (countdown: Countdown) => void;
  onDelete: (id: string) => void;
  onToggleNotify?: (id: string, notify: boolean) => void;
}

export function CountdownCard({ countdown, onEdit, onDelete, onToggleNotify }: CountdownCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);

  const isPast = new Date(countdown.targetDate) <= new Date();

  // Create widget shortcut
  const handlePinToHome = async () => {
    // Check if the PWA API is available
    if ('BeforeInstallPromptEvent' in window) {
      // This would be handled by a beforeinstallprompt event
      setShowPinDialog(true);
    } else {
      // Fallback: Share the widget URL
      const widgetUrl = `${window.location.origin}/widget/${countdown.id}`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: `${countdown.title} - Countdown Widget`,
            text: `Track ${countdown.title} countdown`,
            url: widgetUrl,
          });
        } catch (error) {
          // User cancelled or error
          console.log('Share cancelled');
        }
      } else {
        // Copy to clipboard
        try {
          await navigator.clipboard.writeText(widgetUrl);
          setShowPinDialog(true);
        } catch {
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = widgetUrl;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          setShowPinDialog(true);
        }
      }
    }
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <Card
          className="relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl"
          style={{
            borderColor: `${countdown.color}40`,
            backgroundColor: `${countdown.color}08`,
          }}
        >
          {/* Color accent bar at top */}
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{ backgroundColor: countdown.color }}
          />

          {/* Widget indicator */}
          <div className="absolute top-1 right-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={`/widget/${countdown.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-white/80 hover:bg-white transition-colors block"
                    style={{ color: countdown.color }}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Open as Widget</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="p-4 sm:p-6 pt-5">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2 pr-8">
                {countdown.icon && (
                  <span className="text-2xl">{countdown.icon}</span>
                )}
                <h3
                  className="text-lg sm:text-xl font-bold line-clamp-1"
                  style={{ color: countdown.color }}
                >
                  {countdown.title}
                </h3>
              </div>
              <div className="flex items-center gap-1">
                {countdown.completed || isPast ? (
                  <Badge
                    variant="outline"
                    className="bg-green-500/10 text-green-600 border-green-500/20"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Done
                  </Badge>
                ) : null}
              </div>
            </div>

            {/* Time Display */}
            <div className="mb-4">
              <TimeDisplay
                targetDate={countdown.targetDate}
                color={countdown.color}
                completed={countdown.completed}
              />
            </div>

            {/* Description */}
            {countdown.description && (
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {countdown.description}
              </p>
            )}

            {/* Sound indicator */}
            {countdown.soundId && (
              <div className="flex items-center gap-1 mb-3">
                <Badge variant="outline" className="text-xs">
                  🔊 Sound enabled
                </Badge>
                {countdown.loopSound && (
                  <Badge variant="outline" className="text-xs">
                    🔁 Loop
                  </Badge>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToggleNotify?.(countdown.id, !countdown.notify)}
                        className="h-8 w-8 p-0"
                      >
                        {countdown.notify ? (
                          <Bell className="w-4 h-4 text-primary" />
                        ) : (
                          <BellOff className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{countdown.notify ? 'Disable notifications' : 'Enable notifications'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handlePinToHome}
                        className="h-8 w-8 p-0"
                      >
                        <Pin className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Pin to Home Screen</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(countdown)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Edit countdown</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDeleteDialog(true)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Delete countdown</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Countdown</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{countdown.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(countdown.id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pin Dialog */}
      <AlertDialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Pin className="w-5 h-5 text-primary" />
              Pin to Home Screen
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2">
              <p>
                <strong>Widget URL copied!</strong>
              </p>
              <p>
                To add this countdown as a widget:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Open your browser and paste the URL</li>
                <li>Tap the browser menu (⋮ or ⬆️)</li>
                <li>Select "Add to Home Screen"</li>
                <li>The countdown will appear as a widget!</li>
              </ol>
              <p className="text-xs text-muted-foreground mt-2">
                Widget URL: {typeof window !== 'undefined' ? `${window.location.origin}/widget/${countdown.id}` : ''}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Got it!</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
