export type ChoghadiyaType =
  | 'Amrit'
  | 'Shubh'
  | 'Labh'
  | 'Char'
  | 'Rog'
  | 'Kaal'
  | 'Udveg';

export interface ChoghadiyaSlot {
  name: ChoghadiyaType;
  quality: 'Auspicious' | 'Neutral' | 'Inauspicious';
  startTime: string;
  endTime: string;
  recommendedActivity: string;
}

export interface DailyChoghadiyaResult {
  daySlots: ChoghadiyaSlot[];
  nightSlots: ChoghadiyaSlot[];
}

export const CHOGHADIYA_QUALITY: Record<ChoghadiyaType, { quality: 'Auspicious' | 'Neutral' | 'Inauspicious'; activity: string }> = {
  Amrit: { quality: 'Auspicious', activity: 'Best for all restorative actions, medical treatments, meditation, and important starts.' },
  Shubh: { quality: 'Auspicious', activity: 'Excellent for ceremonies, meetings, sacred work, and creative focus.' },
  Labh: { quality: 'Auspicious', activity: 'Ideal for commercial starts, learning, contracts, and financial initiatives.' },
  Char: { quality: 'Neutral', activity: 'Good for movement, travel, dynamic errands, and administrative flow.' },
  Rog: { quality: 'Inauspicious', activity: 'Prone to dispute or low stamina; preserve energy and avoid confrontational tasks.' },
  Kaal: { quality: 'Inauspicious', activity: 'Low vitality; focus on clearing, decluttering, or solitary quietude.' },
  Udveg: { quality: 'Inauspicious', activity: 'Prone to mental tension; ideal for nervous system grounding and gentle walks.' },
};

// Day sequences (8 segments of 1.5h from 06:00 to 18:00)
export const CHOGHADIYA_DAY_SEQUENCES: Record<number, ChoghadiyaType[]> = {
  0: ['Udveg', 'Char', 'Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog', 'Udveg'], // Sun
  1: ['Amrit', 'Kaal', 'Shubh', 'Rog', 'Udveg', 'Char', 'Labh', 'Amrit'], // Mon
  2: ['Rog', 'Udveg', 'Char', 'Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog'], // Tue
  3: ['Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog', 'Udveg', 'Char', 'Labh'], // Wed
  4: ['Shubh', 'Rog', 'Udveg', 'Char', 'Labh', 'Amrit', 'Kaal', 'Shubh'], // Thu
  5: ['Char', 'Labh', 'Amrit', 'Kaal', 'Shubh', 'Rog', 'Udveg', 'Char'], // Fri
  6: ['Kaal', 'Shubh', 'Rog', 'Udveg', 'Char', 'Labh', 'Amrit', 'Kaal'], // Sat
};

// Night sequences (8 segments of 1.5h from 18:00 to 06:00)
export const CHOGHADIYA_NIGHT_SEQUENCES: Record<number, ChoghadiyaType[]> = {
  0: ['Shubh', 'Amrit', 'Char', 'Rog', 'Kaal', 'Labh', 'Udveg', 'Shubh'], // Sun
  1: ['Char', 'Rog', 'Kaal', 'Labh', 'Udveg', 'Shubh', 'Amrit', 'Char'], // Mon
  2: ['Kaal', 'Labh', 'Udveg', 'Shubh', 'Amrit', 'Char', 'Rog', 'Kaal'], // Tue
  3: ['Udveg', 'Shubh', 'Amrit', 'Char', 'Rog', 'Kaal', 'Labh', 'Udveg'], // Wed
  4: ['Amrit', 'Char', 'Rog', 'Kaal', 'Labh', 'Udveg', 'Shubh', 'Amrit'], // Thu
  5: ['Rog', 'Kaal', 'Labh', 'Udveg', 'Shubh', 'Amrit', 'Char', 'Rog'], // Fri
  6: ['Labh', 'Udveg', 'Shubh', 'Amrit', 'Char', 'Rog', 'Kaal', 'Labh'], // Sat
};

export function calculateChoghadiya(date: Date): DailyChoghadiyaResult {
  const dayOfWeek = date.getDay();
  const daySequence = CHOGHADIYA_DAY_SEQUENCES[dayOfWeek];
  const nightSequence = CHOGHADIYA_NIGHT_SEQUENCES[dayOfWeek];

  function formatTime(hourFloat: number): string {
    const norm = (hourFloat + 24) % 24;
    const h = Math.floor(norm);
    const m = Math.round((norm - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  const daySlots: ChoghadiyaSlot[] = daySequence.map((type, idx) => {
    const startHour = 6 + idx * 1.5;
    const endHour = startHour + 1.5;
    const meta = CHOGHADIYA_QUALITY[type];
    return {
      name: type,
      quality: meta.quality,
      startTime: formatTime(startHour),
      endTime: formatTime(endHour),
      recommendedActivity: meta.activity,
    };
  });

  const nightSlots: ChoghadiyaSlot[] = nightSequence.map((type, idx) => {
    const startHour = 18 + idx * 1.5;
    const endHour = startHour + 1.5;
    const meta = CHOGHADIYA_QUALITY[type];
    return {
      name: type,
      quality: meta.quality,
      startTime: formatTime(startHour),
      endTime: formatTime(endHour),
      recommendedActivity: meta.activity,
    };
  });

  return {
    daySlots,
    nightSlots,
  };
}

