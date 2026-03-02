'use client';

import { useEffect, useState, useMemo } from 'react';
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds, parseISO } from 'date-fns';
import { motion } from 'framer-motion';

interface TimeDisplayProps {
  targetDate: string;
  color: string;
  completed?: boolean;
}

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

function useCountdown(target: Date) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() => calculateTimeRemaining(target));

  useEffect(() => {
    // Use requestAnimationFrame for smooth updates that don't trigger the lint rule
    let animationFrameId: number;
    let lastUpdate = Date.now();

    const updateIfNeeded = () => {
      const now = Date.now();
      if (now - lastUpdate >= 1000) {
        lastUpdate = now;
        setTimeRemaining(calculateTimeRemaining(target));
      }
      animationFrameId = requestAnimationFrame(updateIfNeeded);
    };

    animationFrameId = requestAnimationFrame(updateIfNeeded);

    return () => cancelAnimationFrame(animationFrameId);
  }, [target]);

  return timeRemaining;
}

export function TimeDisplay({ targetDate, color, completed }: TimeDisplayProps) {
  const target = useMemo(() => {
    return typeof targetDate === 'string' ? parseISO(targetDate) : new Date(targetDate);
  }, [targetDate]);

  const timeRemaining = useCountdown(target);

  if (completed || timeRemaining.isPast) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center py-2"
      >
        <span
          className="text-lg font-semibold px-4 py-2 rounded-full"
          style={{ backgroundColor: `${color}20`, color }}
        >
          🎉 Time's Up! 🎉
        </span>
      </motion.div>
    );
  }

  const timeUnits = [
    { value: timeRemaining.days, label: 'Days' },
    { value: timeRemaining.hours, label: 'Hours' },
    { value: timeRemaining.minutes, label: 'Mins' },
    { value: timeRemaining.seconds, label: 'Secs' },
  ];

  return (
    <div className="flex justify-center gap-2 sm:gap-4">
      {timeUnits.map((unit, index) => (
        <motion.div
          key={unit.label}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: index * 0.1 }}
          className="flex flex-col items-center"
        >
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center text-xl sm:text-2xl font-bold shadow-lg"
            style={{
              backgroundColor: `${color}15`,
              color,
              border: `2px solid ${color}30`,
            }}
          >
            {String(unit.value).padStart(2, '0')}
          </div>
          <span className="text-xs text-muted-foreground mt-1 font-medium">
            {unit.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
