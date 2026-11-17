import type {
  ZodiacSignInfo,
  NakshatraInfo,
  PlanetName,
  ZodiacSignName,
} from '../types.ts';

export const ZODIAC_SIGNS: ZodiacSignInfo[] = [
  { index: 0, name: 'Aries', sanskrit: 'Mesha', lord: 'Mars', element: 'Fire', modality: 'Chara', startDegree: 0, endDegree: 30 },
  { index: 1, name: 'Taurus', sanskrit: 'Vrishabha', lord: 'Venus', element: 'Earth', modality: 'Sthira', startDegree: 30, endDegree: 60 },
  { index: 2, name: 'Gemini', sanskrit: 'Mithuna', lord: 'Mercury', element: 'Air', modality: 'Dwisvabhava', startDegree: 60, endDegree: 90 },
  { index: 3, name: 'Cancer', sanskrit: 'Karka', lord: 'Moon', element: 'Water', modality: 'Chara', startDegree: 90, endDegree: 120 },
  { index: 4, name: 'Leo', sanskrit: 'Simha', lord: 'Sun', element: 'Fire', modality: 'Sthira', startDegree: 120, endDegree: 150 },
  { index: 5, name: 'Virgo', sanskrit: 'Kanya', lord: 'Mercury', element: 'Earth', modality: 'Dwisvabhava', startDegree: 150, endDegree: 180 },
  { index: 6, name: 'Libra', sanskrit: 'Tula', lord: 'Venus', element: 'Air', modality: 'Chara', startDegree: 180, endDegree: 210 },
  { index: 7, name: 'Scorpio', sanskrit: 'Vrishchika', lord: 'Mars', element: 'Water', modality: 'Sthira', startDegree: 210, endDegree: 240 },
  { index: 8, name: 'Sagittarius', sanskrit: 'Dhanu', lord: 'Jupiter', element: 'Fire', modality: 'Dwisvabhava', startDegree: 240, endDegree: 270 },
  { index: 9, name: 'Capricorn', sanskrit: 'Makara', lord: 'Saturn', element: 'Earth', modality: 'Chara', startDegree: 270, endDegree: 300 },
  { index: 10, name: 'Aquarius', sanskrit: 'Kumbha', lord: 'Saturn', element: 'Air', modality: 'Sthira', startDegree: 300, endDegree: 330 },
  { index: 11, name: 'Pisces', sanskrit: 'Meena', lord: 'Jupiter', element: 'Water', modality: 'Dwisvabhava', startDegree: 330, endDegree: 360 },
];

export const PLANET_SANSKRIT: Record<PlanetName, string> = {
  Sun: 'Surya',
  Moon: 'Chandra',
  Mars: 'Mangal',
  Mercury: 'Budha',
  Jupiter: 'Guru',
  Venus: 'Shukra',
  Saturn: 'Shani',
  Rahu: 'Rahu',
  Ketu: 'Ketu',
};

export const NAKSHATRAS: NakshatraInfo[] = [
  { index: 0, name: 'Ashwini', sanskrit: 'Aśvinī', lord: 'Ketu', startDegree: 0, endDegree: 13.33333333, deity: 'Ashvins', gana: 'Deva', yoni: 'Horse', nadi: 'Adi', symbol: "Horse's head" },
  { index: 1, name: 'Bharani', sanskrit: 'Bharaṇī', lord: 'Venus', startDegree: 13.33333333, endDegree: 26.66666667, deity: 'Yama', gana: 'Manushya', yoni: 'Elephant', nadi: 'Madhya', symbol: 'Yoni' },
  { index: 2, name: 'Krittika', sanskrit: 'Kṛttikā', lord: 'Sun', startDegree: 26.66666667, endDegree: 40, deity: 'Agni', gana: 'Rakshasa', yoni: 'Sheep', nadi: 'Antya', symbol: 'Knife or Spear' },
  { index: 3, name: 'Rohini', sanskrit: 'Rohiṇī', lord: 'Moon', startDegree: 40, endDegree: 53.33333333, deity: 'Brahma', gana: 'Manushya', yoni: 'Serpent', nadi: 'Antya', symbol: 'Cart or Chariot' },
  { index: 4, name: 'Mrigashira', sanskrit: 'Mṛgaśīrṣā', lord: 'Mars', startDegree: 53.33333333, endDegree: 66.66666667, deity: 'Soma', gana: 'Deva', yoni: 'Serpent', nadi: 'Madhya', symbol: "Deer's head" },
  { index: 5, name: 'Ardra', sanskrit: 'Ārdrā', lord: 'Rahu', startDegree: 66.66666667, endDegree: 80, deity: 'Rudra', gana: 'Manushya', yoni: 'Dog', nadi: 'Adi', symbol: 'Teardrop' },
  { index: 6, name: 'Punarvasu', sanskrit: 'Punarvasu', lord: 'Jupiter', startDegree: 80, endDegree: 93.33333333, deity: 'Aditi', gana: 'Deva', yoni: 'Cat', nadi: 'Adi', symbol: 'Bow and Quiver' },
  { index: 7, name: 'Pushya', sanskrit: 'Puṣya', lord: 'Saturn', startDegree: 93.33333333, endDegree: 106.66666667, deity: 'Brihaspati', gana: 'Deva', yoni: 'Sheep', nadi: 'Madhya', symbol: 'Cow udder / Lotus' },
  { index: 8, name: 'Ashlesha', sanskrit: 'Āśleṣā', lord: 'Mercury', startDegree: 106.66666667, endDegree: 120, deity: 'Nagas', gana: 'Rakshasa', yoni: 'Cat', nadi: 'Antya', symbol: 'Coiled serpent' },
  { index: 9, name: 'Magha', sanskrit: 'Maghā', lord: 'Ketu', startDegree: 120, endDegree: 133.33333333, deity: 'Pitris', gana: 'Rakshasa', yoni: 'Rat', nadi: 'Antya', symbol: 'Royal Throne' },
  { index: 10, name: 'Purva Phalguni', sanskrit: 'Pūrva Phālgunī', lord: 'Venus', startDegree: 133.33333333, endDegree: 146.66666667, deity: 'Bhaga', gana: 'Manushya', yoni: 'Rat', nadi: 'Madhya', symbol: 'Front legs of bed' },
  { index: 11, name: 'Uttara Phalguni', sanskrit: 'Uttara Phālgunī', lord: 'Sun', startDegree: 146.66666667, endDegree: 160, deity: 'Aryaman', gana: 'Manushya', yoni: 'Cow', nadi: 'Adi', symbol: 'Back legs of bed' },
  { index: 12, name: 'Hasta', sanskrit: 'Hasta', lord: 'Moon', startDegree: 160, endDegree: 173.33333333, deity: 'Savitr', gana: 'Deva', yoni: 'Buffalo', nadi: 'Adi', symbol: 'Open hand' },
  { index: 13, name: 'Chitra', sanskrit: 'Citrā', lord: 'Mars', startDegree: 173.33333333, endDegree: 186.66666667, deity: 'Tvashtar', gana: 'Rakshasa', yoni: 'Tiger', nadi: 'Madhya', symbol: 'Bright jewel' },
  { index: 14, name: 'Swati', sanskrit: 'Svātī', lord: 'Rahu', startDegree: 186.66666667, endDegree: 200, deity: 'Vayu', gana: 'Deva', yoni: 'Buffalo', nadi: 'Antya', symbol: 'Young shoot / Coral' },
  { index: 15, name: 'Vishakha', sanskrit: 'Viśākhā', lord: 'Jupiter', startDegree: 200, endDegree: 213.33333333, deity: 'Indragni', gana: 'Rakshasa', yoni: 'Tiger', nadi: 'Antya', symbol: 'Triumphal arch' },
  { index: 16, name: 'Anuradha', sanskrit: 'Anurādhā', lord: 'Saturn', startDegree: 213.33333333, endDegree: 226.66666667, deity: 'Mitra', gana: 'Deva', yoni: 'Deer', nadi: 'Madhya', symbol: 'Lotus / Row of offerings' },
  { index: 17, name: 'Jyeshtha', sanskrit: 'Jyeṣṭhā', lord: 'Mercury', startDegree: 226.66666667, endDegree: 240, deity: 'Indra', gana: 'Rakshasa', yoni: 'Deer', nadi: 'Adi', symbol: 'Circular amulet / Earring' },
  { index: 18, name: 'Mula', sanskrit: 'Mūla', lord: 'Ketu', startDegree: 240, endDegree: 253.33333333, deity: 'Nirriti', gana: 'Rakshasa', yoni: 'Dog', nadi: 'Adi', symbol: 'Tied bunch of roots' },
  { index: 19, name: 'Purva Ashadha', sanskrit: 'Pūrva Aṣāḍhā', lord: 'Venus', startDegree: 253.33333333, endDegree: 266.66666667, deity: 'Apas', gana: 'Manushya', yoni: 'Monkey', nadi: 'Madhya', symbol: "Fan / Winnowing basket" },
  { index: 20, name: 'Uttara Ashadha', sanskrit: 'Uttara Aṣāḍhā', lord: 'Sun', startDegree: 266.66666667, endDegree: 280, deity: 'Vishvadevas', gana: 'Manushya', yoni: 'Mongoose', nadi: 'Antya', symbol: "Elephant's tusk" },
  { index: 21, name: 'Shravana', sanskrit: 'Śravaṇa', lord: 'Moon', startDegree: 280, endDegree: 293.33333333, deity: 'Vishnu', gana: 'Deva', yoni: 'Monkey', nadi: 'Antya', symbol: 'Ear / Three footsteps' },
  { index: 22, name: 'Dhanishta', sanskrit: 'Dhaniṣṭhā', lord: 'Mars', startDegree: 293.33333333, endDegree: 306.66666667, deity: 'Ashta Vasus', gana: 'Rakshasa', yoni: 'Lion', nadi: 'Madhya', symbol: 'Drum / Flute' },
  { index: 23, name: 'Shatabhisha', sanskrit: 'Śatabhiṣaj', lord: 'Rahu', startDegree: 306.66666667, endDegree: 320, deity: 'Varuna', gana: 'Rakshasa', yoni: 'Horse', nadi: 'Adi', symbol: 'Empty circle / 100 healers' },
  { index: 24, name: 'Purva Bhadrapada', sanskrit: 'Pūrva Bhādrapadā', lord: 'Jupiter', startDegree: 320, endDegree: 333.33333333, deity: 'Aja Ekapada', gana: 'Manushya', yoni: 'Lion', nadi: 'Adi', symbol: 'Front legs of funeral cot' },
  { index: 25, name: 'Uttara Bhadrapada', sanskrit: 'Uttara Bhādrapadā', lord: 'Saturn', startDegree: 333.33333333, endDegree: 346.66666667, deity: 'Ahirbudhnya', gana: 'Manushya', yoni: 'Cow', nadi: 'Madhya', symbol: 'Back legs of funeral cot' },
  { index: 26, name: 'Revati', sanskrit: 'Revatī', lord: 'Mercury', startDegree: 346.66666667, endDegree: 360, deity: 'Pushan', gana: 'Deva', yoni: 'Elephant', nadi: 'Antya', symbol: 'Fish / Pair of fish' },
];

export const VIMSHOTTARI_DASHA_CYCLE: Array<{ lord: PlanetName; years: number }> = [
  { lord: 'Ketu', years: 7 },
  { lord: 'Venus', years: 20 },
  { lord: 'Sun', years: 6 },
  { lord: 'Moon', years: 10 },
  { lord: 'Mars', years: 7 },
  { lord: 'Rahu', years: 18 },
  { lord: 'Jupiter', years: 16 },
  { lord: 'Saturn', years: 19 },
  { lord: 'Mercury', years: 17 },
];

export const DIGNITIES_MAP: Record<PlanetName, {
  exaltation: { sign: ZodiacSignName; degree: number };
  debilitation: { sign: ZodiacSignName; degree: number };
  ownSigns: ZodiacSignName[];
  moolatrikona: { sign: ZodiacSignName; startDegree: number; endDegree: number };
}> = {
  Sun: {
    exaltation: { sign: 'Aries', degree: 10 },
    debilitation: { sign: 'Libra', degree: 10 },
    ownSigns: ['Leo'],
    moolatrikona: { sign: 'Leo', startDegree: 0, endDegree: 20 },
  },
  Moon: {
    exaltation: { sign: 'Taurus', degree: 3 },
    debilitation: { sign: 'Scorpio', degree: 3 },
    ownSigns: ['Cancer'],
    moolatrikona: { sign: 'Taurus', startDegree: 3, endDegree: 30 },
  },
  Mars: {
    exaltation: { sign: 'Capricorn', degree: 28 },
    debilitation: { sign: 'Cancer', degree: 28 },
    ownSigns: ['Aries', 'Scorpio'],
    moolatrikona: { sign: 'Aries', startDegree: 0, endDegree: 12 },
  },
  Mercury: {
    exaltation: { sign: 'Virgo', degree: 15 },
    debilitation: { sign: 'Pisces', degree: 15 },
    ownSigns: ['Gemini', 'Virgo'],
    moolatrikona: { sign: 'Virgo', startDegree: 15, endDegree: 20 },
  },
  Jupiter: {
    exaltation: { sign: 'Cancer', degree: 5 },
    debilitation: { sign: 'Capricorn', degree: 5 },
    ownSigns: ['Sagittarius', 'Pisces'],
    moolatrikona: { sign: 'Sagittarius', startDegree: 0, endDegree: 10 },
  },
  Venus: {
    exaltation: { sign: 'Pisces', degree: 27 },
    debilitation: { sign: 'Virgo', degree: 27 },
    ownSigns: ['Taurus', 'Libra'],
    moolatrikona: { sign: 'Libra', startDegree: 0, endDegree: 15 },
  },
  Saturn: {
    exaltation: { sign: 'Libra', degree: 20 },
    debilitation: { sign: 'Aries', degree: 20 },
    ownSigns: ['Capricorn', 'Aquarius'],
    moolatrikona: { sign: 'Aquarius', startDegree: 0, endDegree: 20 },
  },
  Rahu: {
    exaltation: { sign: 'Taurus', degree: 20 },
    debilitation: { sign: 'Scorpio', degree: 20 },
    ownSigns: ['Aquarius'],
    moolatrikona: { sign: 'Gemini', startDegree: 0, endDegree: 30 },
  },
  Ketu: {
    exaltation: { sign: 'Scorpio', degree: 20 },
    debilitation: { sign: 'Taurus', degree: 20 },
    ownSigns: ['Scorpio'],
    moolatrikona: { sign: 'Sagittarius', startDegree: 0, endDegree: 30 },
  },
};
