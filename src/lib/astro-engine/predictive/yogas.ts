import type { PlanetPosition, AscendantInfo, PlanetName } from '../types.ts';
import { ZODIAC_SIGNS, DIGNITIES_MAP } from '../core/constants.ts';

export interface YogaResult {
  name: string;
  sanskrit: string;
  category: 'Raja' | 'Dhana' | 'Mahapurusha' | 'Benefic' | 'Special' | 'Chandra' | 'Surya' | 'Viparita';
  description: string;
  wellnessMeaning: string;
}

export function detectYogas(
  ascendant: AscendantInfo,
  planets: Record<PlanetName, PlanetPosition>
): YogaResult[] {
  const yogas: YogaResult[] = [];
  const kendras = [1, 4, 7, 10];
  const trikonas = [1, 5, 9];
  const dusthanas = [6, 8, 12];

  const moon = planets.Moon;
  const sun = planets.Sun;
  const jupiter = planets.Jupiter;
  const mars = planets.Mars;
  const mercury = planets.Mercury;
  const venus = planets.Venus;
  const saturn = planets.Saturn;

  // Helper: Find lord of a house
  const getHouseLord = (houseNum: number): PlanetName => {
    const signIdx = (ascendant.sign.index + houseNum - 1) % 12;
    return ZODIAC_SIGNS[signIdx].lord;
  };

  // 1. Gaja Kesari Yoga
  const jupHouseFromMoon = ((jupiter.sign.index - moon.sign.index + 12) % 12) + 1;
  if (kendras.includes(jupHouseFromMoon)) {
    yogas.push({
      name: 'Gaja Kesari Yoga',
      sanskrit: 'Gajakesarī Yoga',
      category: 'Benefic',
      description: 'Jupiter is in a Kendra from the Moon: emotional resilience, noble character, and lasting respect.',
      wellnessMeaning: 'Natural mental equanimity; protects against depressive fatigue and supports calm leadership.',
    });
  }

  // 2. Budhaditya Yoga
  if (sun.sign.index === mercury.sign.index) {
    yogas.push({
      name: 'Budhaditya Yoga',
      sanskrit: 'Buddhāditya Yoga',
      category: 'Benefic',
      description: 'Sun and Mercury conjunct in the same sign: analytical sharpness and articulate delivery.',
      wellnessMeaning: 'Strong executive function, swift cognitive recovery, and effective speech cadence.',
    });
  }

  // 3. Chandra-Mangala Yoga
  if (moon.sign.index === mars.sign.index) {
    yogas.push({
      name: 'Chandra-Mangala Yoga',
      sanskrit: 'Candra-Maṅgala Yoga',
      category: 'Special',
      description: 'Moon conjunct Mars: heightened commercial enterprise, vital courage, and passionate focus.',
      wellnessMeaning: 'Vigorous metabolic fire; requires intentional cooldown rhythms to avoid irritability.',
    });
  }

  // 4. Pancha Mahapurusha Yogas
  if (kendras.includes(mars.house) && (mars.dignity === 'Exalted' || mars.dignity === 'OwnSign')) {
    yogas.push({
      name: 'Ruchaka Yoga',
      sanskrit: 'Rucaka Yoga',
      category: 'Mahapurusha',
      description: 'Mars sovereign in a Kendra: commanding leadership, physical strength, and protective instincts.',
      wellnessMeaning: 'High physical stamina; benefits from demanding physical training and athletic challenges.',
    });
  }
  if (kendras.includes(mercury.house) && (mercury.dignity === 'Exalted' || mercury.dignity === 'OwnSign')) {
    yogas.push({
      name: 'Bhadra Yoga',
      sanskrit: 'Bhadra Yoga',
      category: 'Mahapurusha',
      description: 'Mercury sovereign in a Kendra: intellectual dexterity, deep learning, and commercial brilliance.',
      wellnessMeaning: 'Adaptable nervous system; thrives on structured information hygiene and daily quietude.',
    });
  }
  if (kendras.includes(jupiter.house) && (jupiter.dignity === 'Exalted' || jupiter.dignity === 'OwnSign')) {
    yogas.push({
      name: 'Hamsa Yoga',
      sanskrit: 'Haṃsa Yoga',
      category: 'Mahapurusha',
      description: 'Jupiter sovereign in a Kendra: profound wisdom, spiritual nobility, and philosophical poise.',
      wellnessMeaning: 'Deep parasympathetic tone and innate trust; highly responsive to restorative breathwork.',
    });
  }
  if (kendras.includes(venus.house) && (venus.dignity === 'Exalted' || venus.dignity === 'OwnSign')) {
    yogas.push({
      name: 'Malavya Yoga',
      sanskrit: 'Mālavya Yoga',
      category: 'Mahapurusha',
      description: 'Venus sovereign in a Kendra: exquisite aesthetic sense, sensory charm, and life contentment.',
      wellnessMeaning: 'Refined sensory regulation; flourishes through beautiful surroundings and restorative arts.',
    });
  }
  if (kendras.includes(saturn.house) && (saturn.dignity === 'Exalted' || saturn.dignity === 'OwnSign')) {
    yogas.push({
      name: 'Sasa Yoga',
      sanskrit: 'Śaśa Yoga',
      category: 'Mahapurusha',
      description: 'Saturn sovereign in a Kendra: endurance, organizational grit, and mastery over adversity.',
      wellnessMeaning: 'Exceptional long-range stamina; steady pacing prevents depletion when culture rushes.',
    });
  }

  // 5. Neechabhanga Raja Yoga (Cancellation of Debilitation)
  const candidatePlanets = [sun, moon, mars, mercury, jupiter, venus, saturn];
  for (const p of candidatePlanets) {
    if (p.dignity === 'Debilitated') {
      const debSign = p.sign;
      const dispositor = planets[debSign.lord];
      const exaltationLordName = DIGNITIES_MAP[p.name].exaltation.sign;
      const exaltationSignLord = ZODIAC_SIGNS.find((s) => s.name === exaltationLordName)?.lord;
      const exaltationLord = exaltationSignLord ? planets[exaltationSignLord] : null;

      const dispositorInKendra = kendras.includes(dispositor.house);
      const exaltLordInKendra = exaltationLord ? kendras.includes(exaltationLord.house) : false;

      if (dispositorInKendra || exaltLordInKendra) {
        yogas.push({
          name: `Neechabhanga Raja Yoga (${p.name})`,
          sanskrit: 'Nīcabhaṅga Rāja Yoga',
          category: 'Raja',
          description: `Debilitation of ${p.name} is cancelled by sovereign dispositor in a cardinal house, transmuting early vulnerability into profound mastery.`,
          wellnessMeaning: `Early somatic sensitivity in ${p.name}'s realm develops into extraordinary empathy and self-healing.`,
        });
        break;
      }
    }
  }

  // 6. Lunar Yogas: Sunapha, Anapha, Durudhara, Kemadruma
  const planetPositionsFromMoon = candidatePlanets
    .filter((p) => p.name !== 'Moon' && p.name !== 'Sun')
    .map((p) => ({
      name: p.name,
      diff: ((p.sign.index - moon.sign.index + 12) % 12) + 1,
    }));

  const has2ndFromMoon = planetPositionsFromMoon.some((p) => p.diff === 2);
  const has12thFromMoon = planetPositionsFromMoon.some((p) => p.diff === 12);

  if (has2ndFromMoon && has12thFromMoon) {
    yogas.push({
      name: 'Durudhara Yoga',
      sanskrit: 'Durudharā Yoga',
      category: 'Chandra',
      description: 'Benefic or active planets flank both the 2nd and 12th houses from Moon: financial balance and life stability.',
      wellnessMeaning: 'Balanced emotional input and output; sustained psychological equilibrium.',
    });
  } else if (has2ndFromMoon) {
    yogas.push({
      name: 'Sunapha Yoga',
      sanskrit: 'Sunaphā Yoga',
      category: 'Chandra',
      description: 'Planets in the 2nd house from Moon: self-earned prosperity, eloquence, and sound intellect.',
      wellnessMeaning: 'Strong somatic appetite and healthy metabolic accumulation.',
    });
  } else if (has12thFromMoon) {
    yogas.push({
      name: 'Anapha Yoga',
      sanskrit: 'Anaphā Yoga',
      category: 'Chandra',
      description: 'Planets in the 12th house from Moon: refined tastes, moral poise, and generous spirit.',
      wellnessMeaning: 'Healthy sleep architecture and easy release of tension.',
    });
  } else {
    // Check if Kemadruma has cancellation
    const planetsInKendraFromLagnaOrMoon = candidatePlanets.some(
      (p) => p.name !== 'Moon' && (kendras.includes(p.house) || kendras.includes(((p.sign.index - moon.sign.index + 12) % 12) + 1))
    );
    if (!planetsInKendraFromLagnaOrMoon) {
      yogas.push({
        name: 'Kemadruma Yoga',
        sanskrit: 'Kemadruma Yoga',
        category: 'Chandra',
        description: 'Moon stands in isolation without flanking planets: feelings of solitary independence.',
        wellnessMeaning: 'Higher baseline need for co-regulation, emotional community, and nervous system reassurance.',
      });
    }
  }

  // 7. Solar Yogas: Vesi, Vosi, Ubhayachari
  const planetPositionsFromSun = candidatePlanets
    .filter((p) => p.name !== 'Sun' && p.name !== 'Moon')
    .map((p) => ({
      name: p.name,
      diff: ((p.sign.index - sun.sign.index + 12) % 12) + 1,
    }));

  const has2ndFromSun = planetPositionsFromSun.some((p) => p.diff === 2);
  const has12thFromSun = planetPositionsFromSun.some((p) => p.diff === 12);

  if (has2ndFromSun && has12thFromSun) {
    yogas.push({
      name: 'Ubhayachari Yoga',
      sanskrit: 'Ubhayācarī Yoga',
      category: 'Surya',
      description: 'Planets on both sides of the Sun: poised public delivery, broad vision, and consistent energy.',
      wellnessMeaning: 'Balanced diurnal energy; smooth transition from morning focus to evening wind-down.',
    });
  } else if (has2ndFromSun) {
    yogas.push({
      name: 'Vesi Yoga',
      sanskrit: 'Veśi Yoga',
      category: 'Surya',
      description: 'Planets in the 2nd house from the Sun: truthful speech, focused memory, and ethical fortitude.',
      wellnessMeaning: 'Solid morning vitality and healthy sustained alertness.',
    });
  } else if (has12thFromSun) {
    yogas.push({
      name: 'Vosi Yoga',
      sanskrit: 'Vośi Yoga',
      category: 'Surya',
      description: 'Planets in the 12th house from the Sun: philanthropic instincts, deep spiritual insight, and tact.',
      wellnessMeaning: 'Intuitive night-time restoration and creative dream recall.',
    });
  }

  // 8. Viparita Raja Yogas (Dusthana lords in Dusthanas)
  const lord6 = planets[getHouseLord(6)];
  const lord8 = planets[getHouseLord(8)];
  const lord12 = planets[getHouseLord(12)];

  if (dusthanas.includes(lord6.house)) {
    yogas.push({
      name: 'Harsha Yoga',
      sanskrit: 'Harṣa Yoga',
      category: 'Viparita',
      description: '6th lord placed in a dusthana (6th, 8th, or 12th house): overcoming adversaries, high physical resilience, and robust immune defenses.',
      wellnessMeaning: 'Exceptional immunological resilience and ability to bounce back swiftly from setbacks.',
    });
  }
  if (dusthanas.includes(lord8.house)) {
    yogas.push({
      name: 'Sarala Yoga',
      sanskrit: 'Sarala Yoga',
      category: 'Viparita',
      description: '8th lord placed in a dusthana: fearlessness, longevity, and capacity to thrive under psychological pressure.',
      wellnessMeaning: 'Deep somatic fearlessness; natural composure in emergencies.',
    });
  }
  if (dusthanas.includes(lord12.house)) {
    yogas.push({
      name: 'Vimala Yoga',
      sanskrit: 'Vimala Yoga',
      category: 'Viparita',
      description: '12th lord placed in a dusthana: financial prudence, ethical independence, and spiritual purity.',
      wellnessMeaning: 'Efficient energetic economy; resists burnout and preserves vital reserves.',
    });
  }

  // 9. Amala Yoga (Benefics in 10th from Lagna or Moon)
  const benefics: PlanetName[] = ['Jupiter', 'Venus', 'Mercury'];
  const hasBeneficIn10thLagna = benefics.some((b) => planets[b].house === 10);
  const hasBeneficIn10thMoon = benefics.some(
    (b) => ((planets[b].sign.index - moon.sign.index + 12) % 12) + 1 === 10
  );

  if (hasBeneficIn10thLagna || hasBeneficIn10thMoon) {
    yogas.push({
      name: 'Amala Yoga',
      sanskrit: 'Amalā Yoga',
      category: 'Benefic',
      description: 'Unblemished benefic in the 10th house from Ascendant or Moon: stainless public reputation and noble accomplishments.',
      wellnessMeaning: 'Work and public actions generate vitality rather than chronic depletion.',
    });
  }

  // 10. Saraswati Yoga (Mercury, Jupiter, and Venus in Kendras, Trikonas, or 2nd)
  const intellectualHouses = [1, 2, 4, 5, 7, 9, 10];
  if (
    intellectualHouses.includes(mercury.house) &&
    intellectualHouses.includes(jupiter.house) &&
    intellectualHouses.includes(venus.house)
  ) {
    yogas.push({
      name: 'Saraswati Yoga',
      sanskrit: 'Sarasvatī Yoga',
      category: 'Benefic',
      description: 'Mercury, Jupiter, and Venus aligned in benefic quadrants: refined scholarship, literary mastery, and aesthetic genius.',
      wellnessMeaning: 'High synaptic plasticity and natural protection against neuro-cognitive fatigue.',
    });
  }

  // 11. Dhana Yoga (Wealth alignment between 1st, 2nd, 5th, 9th, and 11th)
  const lord1 = planets[getHouseLord(1)];
  const lord2 = planets[getHouseLord(2)];
  const lord11 = planets[getHouseLord(11)];
  if (
    (lord2.house === 11 || lord11.house === 2 || lord1.house === 2 || lord1.house === 11) &&
    (trikonas.includes(lord2.house) || trikonas.includes(lord11.house))
  ) {
    yogas.push({
      name: 'Dhana Yoga',
      sanskrit: 'Dhana Yoga',
      category: 'Dhana',
      description: 'Harmonious mutual connection between houses of self, resources, and expansion: steady compounding of wealth.',
      wellnessMeaning: 'Somatic security and relaxed relationship with resources, preventing chronic scarcity stress.',
    });
  }

  return yogas;
}
