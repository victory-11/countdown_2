'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { motion } from 'framer-motion';
import { Countdown } from '@/lib/countdown-store';

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

function calculateTimeRemaining(targetDate: Date): TimeRemaining {
  const now = new Date();
  const isPast = now >= targetDate;

  if (isPast) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }

  return {
    days: Math.max(0, differenceInDays(targetDate, now)),
    hours: Math.max(0, differenceInHours(targetDate, now) % 24),
    minutes: Math.max(0, differenceInMinutes(targetDate, now) % 60),
    seconds: Math.max(0, differenceInSeconds(targetDate, now) % 60),
    isPast: false,
  };
}

// Load countdown from localStorage
function loadCountdownFromStorage(widgetId: string): Countdown | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem('countdown-storage');
    if (stored) {
      const data = JSON.parse(stored);
      const countdowns = data.state?.countdowns || [];
      return countdowns.find((c: Countdown) => c.id === widgetId) || null;
    }
  } catch (error) {
    console.error('Failed to load countdown:', error);
  }
  return null;
}

export default function WidgetPage() {
  const params = useParams();
  const router = useRouter();
  const widgetId = params.id as string;

  const [countdown, setCountdown] = useState<Countdown | null>(() =>
    loadCountdownFromStorage(widgetId)
  );

  const target = useMemo(() =>
    countdown ? new Date(countdown.targetDate) : new Date(),
    [countdown]
  );

  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(target)
  );

  // Update countdown timer
  useEffect(() => {
    if (!countdown) return;

    const updateTimer = () => {
      setTimeRemaining(calculateTimeRemaining(target));
    };

    updateTimer();

    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [countdown, target]);

  // Handle opening the main app
  const handleOpenApp = useCallback(() => {
    router.push('/');
  }, [router]);

  if (!countdown) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 p-4">
        <div className="text-white text-center">
          <div className="text-4xl mb-4">⏰</div>
          <p className="text-lg">Countdown not found</p>
          <button
            onClick={handleOpenApp}
            className="mt-4 px-6 py-2 bg-white text-purple-600 rounded-full font-semibold"
          >
            Open App
          </button>
        </div>
      </div>
    );
  }

  const now = new Date();
  const totalSeconds = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
  const progress = Math.min(100, Math.max(0,
    ((totalSeconds / (60 * 60 * 24 * 365)) * 100) // Based on 1 year max
  ));

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: `linear-gradient(135deg, ${countdown.color}20, ${countdown.color}40)`,
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm"
      >
        {/* Widget Card */}
        <div
          className="rounded-3xl p-6 shadow-2xl backdrop-blur-xl"
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            border: `4px solid ${countdown.color}`,
          }}
        >
          {/* Header */}
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">{countdown.icon || '⏰'}</div>
            <h1 className="text-xl font-bold text-gray-800 truncate">
              {countdown.title}
            </h1>
            {countdown.description && (
              <p className="text-sm text-gray-500 mt-1 truncate">
                {countdown.description}
              </p>
            )}
          </div>

          {/* Progress Ring */}
          <div className="relative w-48 h-48 mx-auto mb-4">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="12"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                fill="none"
                stroke={countdown.color}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${progress * 5.5} 553`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div
                  className="text-5xl font-bold"
                  style={{ color: countdown.color }}
                >
                  {timeRemaining.days}
                </div>
                <div className="text-gray-500 text-sm font-medium">DAYS</div>
              </div>
            </div>
          </div>

          {/* Time Display */}
          {timeRemaining.isPast ? (
            <div className="text-center py-4">
              <span
                className="text-2xl font-bold px-6 py-3 rounded-full"
                style={{
                  backgroundColor: `${countdown.color}20`,
                  color: countdown.color,
                }}
              >
                🎉 Time's Up! 🎉
              </span>
            </div>
          ) : (
            <div className="flex justify-center gap-3">
              {[
                { value: timeRemaining.hours, label: 'HRS' },
                { value: timeRemaining.minutes, label: 'MIN' },
                { value: timeRemaining.seconds, label: 'SEC' },
              ].map((unit) => (
                <motion.div
                  key={unit.label}
                  className="flex flex-col items-center"
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg"
                    style={{
                      backgroundColor: `${countdown.color}15`,
                      color: countdown.color,
                      border: `2px solid ${countdown.color}30`,
                    }}
                  >
                    {String(unit.value).padStart(2, '0')}
                  </div>
                  <span className="text-xs text-gray-500 mt-1 font-semibold">
                    {unit.label}
                  </span>
                </motion.div>
              ))}
            </div>
          )}

          {/* Target Date */}
          <div className="text-center mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              {new Date(countdown.targetDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          {/* Open App Button */}
          <button
            onClick={handleOpenApp}
            className="w-full mt-4 py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: countdown.color }}
          >
            Open App
          </button>
        </div>

        {/* Widget Badge */}
        <div className="text-center mt-4">
          <span className="text-xs text-gray-400 opacity-50">
            Countdown Widget
          </span>
        </div>
      </motion.div>
    </div>
  );
}
