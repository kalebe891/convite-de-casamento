import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";

interface CountdownTimerProps {
  targetDate: string; // ISO date string (e.g. "2025-09-20")
  firstEventTime?: string | null; // Time string (e.g. "15:00")
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const calculateTimeLeft = (target: Date): TimeLeft => {
  const now = new Date().getTime();
  const diff = target.getTime() - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
};

const pad = (value: number) => String(value).padStart(2, "0");

const units: { key: keyof TimeLeft; label: string }[] = [
  { key: "days", label: "Dias" },
  { key: "hours", label: "Horas" },
  { key: "minutes", label: "Min" },
  { key: "seconds", label: "Seg" },
];

const CountdownTimer = ({ targetDate, firstEventTime }: CountdownTimerProps) => {
  const target = useMemo(() => {
    const date = new Date(targetDate + "T00:00:00");
    if (firstEventTime) {
      const [hours, minutes] = firstEventTime.split(":").map(Number);
      date.setHours(hours, minutes, 0, 0);
    }
    return date;
  }, [targetDate, firstEventTime]);

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(target));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(target));
    }, 1000);
    return () => clearInterval(timer);
  }, [target]);

  const isFinished = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;

  if (isFinished) return null;

  return (
    <motion.div
      className="flex gap-6 md:gap-10 justify-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 1.5, ease: "easeOut" }}
    >
      {units.map(({ key, label }, index) => (
        <div key={key} className="flex items-center">
          <div className="flex flex-col items-center">
            <span className="font-display text-3xl md:text-5xl text-foreground tabular-nums leading-none">
              {pad(timeLeft[key])}
            </span>
            <span className="font-sans-alt text-[10px] tracking-[0.3em] uppercase text-muted-foreground mt-2">
              {label}
            </span>
          </div>
          {index < units.length - 1 && (
            <span className={`font-display text-3xl md:text-5xl text-muted-foreground self-start leading-none ${index === 0 ? 'mx-6 md:mx-10' : 'mx-2 md:mx-3'}`}>
              {index === 0 ? '' : ':'}
            </span>
          )}
        </div>
      ))}
    </motion.div>
  );
};

export default CountdownTimer;
