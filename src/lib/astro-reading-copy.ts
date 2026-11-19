/**
 * Life Rhythm — plain-English copy for the chart reading.
 * Classical meanings (BPHS / Phaladeepika conventions) rewritten as everyday, actionable language.
 */
import type { PlanetName } from './astro-engine/types.ts';

/** What each planet means in each house (whole-sign, from the Lagna): what it does, then how to use it. */
export const PLANET_IN_HOUSE: Record<PlanetName, Record<number, string>> = {
  Sun: {
    1: 'You have a strong sense of self and naturally take the lead. Own your decisions openly — and leave others room to contribute.',
    2: 'Your self-worth is tied to earning and to speaking with authority. Build income you control, and choose your words carefully: they carry weight.',
    3: 'You show courage through initiative, writing and speaking up. Put your name on your work and take the first step others hesitate over.',
    4: 'Home and family are central to who you are, and you may carry responsibility for them. Make your home something you are proud of, without running it like an office.',
    5: 'You shine through creativity, ideas and teaching, and children matter to your sense of self. Give creative projects real time, and lead by encouragement.',
    6: 'You prove yourself by solving problems and outworking rivals. That is a strength in competitive work — but schedule recovery, because you tend to push through illness.',
    7: 'Partners and clients are where your life plays out, and you want respect in close relationships. Choose strong partners, and share the lead rather than compete for it.',
    8: 'You are drawn to what is hidden, and life reshapes you through crises that are often about pride. Research, investigation and other people’s money suit you; let go of control when change comes.',
    9: 'You are guided by principles, teachers and a sense of purpose. Seek out mentors and put your beliefs into action — you do well as a teacher or adviser.',
    10: 'Career and public standing are central for you, and you are built for authority. Aim for visible responsibility and build your reputation deliberately.',
    11: 'Gains come through networks, groups and influential friends. Invest time in the right communities and in long-term goals.',
    12: 'You do your best work behind the scenes or far from home, and you need solitude to recharge. Protect quiet time, and watch spending on status.',
  },
  Moon: {
    1: 'Your feelings show on your face and your mood shapes your day. Keep a steady routine, because your energy follows your emotional state.',
    2: 'You feel safe when money and family are stable. A savings buffer settles your mind more than almost anything else.',
    3: 'You process feelings by talking, writing and staying busy. Write things down, and stay in touch with siblings or close peers.',
    4: 'Home is your emotional anchor; you need a calm, settled base. Invest in your home, and keep work out of it where you can.',
    5: 'You feel most alive when creating, playing or caring for children. Make time for creative play — it is your reset, not a luxury.',
    6: 'Stress tends to go straight to your stomach and your routines. Keep regular meals and sleep, and don’t absorb everyone else’s problems at work.',
    7: 'You need a close partner and can feel incomplete without connection. Choose emotionally reliable people, and say what you need instead of hoping they guess.',
    8: 'Your feelings run deep and private, and you notice what others hide. Give yourself time to process big changes, and talk to someone you trust instead of carrying it alone.',
    9: 'Faith, learning and travel steady you emotionally. When you feel lost, a course, a teacher or a trip resets you.',
    10: 'Your mood and your career are linked, and you are sensitive to how others see you. Work with the public suits you — just don’t measure your worth by today’s feedback.',
    11: 'Friends and community steady you, and gains come through people. Stay connected — isolation drains you quickly.',
    12: 'You need solitude the way others need company, and you have a rich inner life. Schedule time alone, protect your sleep, and watch comfort spending.',
  },
  Mars: {
    1: 'You have drive, courage and a quick temper. Put the energy into sport and bold starts, and pause before you react.',
    2: 'You speak directly and fight for financial security. Earn through initiative — and soften your tone in money talks and family discussions.',
    3: 'Courage and effort are your strengths; you get things done. Take on the challenges others avoid, and aim your competitiveness at goals, not people.',
    4: 'There can be tension at home or restlessness about where you live. Put the energy into improving your home or property, and keep arguments out of the house.',
    5: 'You are competitive and energetic in creative work and with children. Channel it into sport, projects and ventures — but avoid impulsive speculation.',
    6: 'You beat competition and handle conflict well. Excellent for demanding, competitive work — pick your battles, and watch for injuries and inflammation.',
    7: 'There is passion and friction in partnership: you want a partner with fire, and then have to handle it. Agree on how you argue before you need to.',
    8: 'You face sudden changes and high stakes, and you are brave in a crisis. Be careful with risk, driving and shared money; research and crisis work suit you.',
    9: 'You fight for your beliefs and act on principle. Put that drive into study and travel, and stay open to other views.',
    10: 'You are ambitious and action-oriented at work. Take on leadership and projects with clear targets, and avoid power struggles with bosses.',
    11: 'You go after your goals hard and gain through effort and driven friends. Set ambitious targets, and keep your network loyal by keeping your word.',
    12: 'Your energy works best behind the scenes or abroad, and you can burn out quietly. Exercise to release tension, sleep enough, and watch hidden expenses.',
  },
  Mercury: {
    1: 'You are curious, quick and communicative, and you think on your feet. Make writing and talking your main tools — and finish one thing before starting the next.',
    2: 'You earn through words, numbers and trade. Negotiating, selling and analysis suit you; keep your finances organised and written down.',
    3: 'Writing, communication and practical skills are natural talents. Publish, teach or build skills — short courses and short trips pay off.',
    4: 'You think best at home, and learning often starts with family. A good home office and a quiet place to study help a lot.',
    5: 'You have a sharp, playful mind that suits teaching, ideas and strategy. Turn ideas into projects, and test them small before investing.',
    6: 'You are good at analysis, detail and fixing problems at work. Use it in admin, health, service or troubleshooting — and don’t let worry run your days.',
    7: 'You bond through conversation, and business partnerships suit you. Choose partners you can really talk to, and get agreements in writing.',
    8: 'You have a research mind that finds what is hidden. Investigation, data, finance and psychology suit you — just avoid overthinking every risk.',
    9: 'You learn through study, travel and debate. Further education, teaching or publishing suit you; keep your beliefs open to evidence.',
    10: 'Your career runs on communication, analysis or trade. Build a reputation for clear thinking, and put your expertise in writing.',
    11: 'You gain through networks, ideas and more than one income stream. Stay in touch with many people, and turn conversations into opportunities.',
    12: 'Your mind is active at night and drawn to the hidden or foreign. Write things down before bed, and use quiet time for research or creative work.',
  },
  Jupiter: {
    1: 'You come across as wise, generous and optimistic, and people trust you. Use it to mentor and lead — and watch over-commitment and weight.',
    2: 'Money and family tend to grow over time, and your words carry wisdom. Save steadily and advise others — just keep your promises realistic.',
    3: 'You grow through your own effort, writing and learning. Courses, writing and initiative bring good results, even if they take longer than you’d like.',
    4: 'Home, family and inner peace are well supported, and a comfortable home is likely. Investing in your home and education pays back over years.',
    5: 'Ideas, teaching, children and good judgement are real strengths. Mentor, teach or advise — creative and educational work is favoured.',
    6: 'You overcome problems through patience and good sense, and do well in service. Help others without taking on everyone’s burden, and watch your diet.',
    7: 'You attract decent partners and good advisers. Choose partners with integrity — partnership is a source of growth for you.',
    8: 'You are resilient in crises and interested in depth and meaning. Shared resources, insurance or research can benefit you; trust slow transformation.',
    9: 'Luck, teachers and purpose are strong in your chart. Study, travel and follow your principles — good mentors open doors for you.',
    10: 'Your career benefits from good judgement and a respected reputation. Aim for roles of trust: advisory, teaching, leadership.',
    11: 'Gains arrive generously and repeatedly, and you have good friends in high places. Keep building your network and your long-term goals.',
    12: 'You are generous, reflective and drawn to distant places. Retreats, travel and charitable work suit you — keep spending in check.',
  },
  Venus: {
    1: 'You have charm, taste and an easy way with people. Use it in client-facing, creative or design work — and don’t let comfort turn into complacency.',
    2: 'You earn through quality, beauty and good relationships, and you speak pleasantly. Value-based pricing suits you; save before you spend.',
    3: 'You communicate with grace and have artistic skills. Put them out there: writing, design, music or presenting.',
    4: 'You want a beautiful, comfortable home, and family life is usually warm. Investing in your home environment restores you.',
    5: 'Romance, creativity and enjoyment come naturally. Make time for art and pleasure, and keep romance honest and grounded.',
    6: 'Relationships at work can get complicated, and you may over-give. Keep work and romance separate, and watch indulgence.',
    7: 'Partnership is where you shine. You want a harmonious relationship and usually find one — invest in it, and keep it fair on both sides.',
    8: 'Shared money and intimacy matter to you and can be intense. Be careful with joint finances, and choose depth over drama.',
    9: 'You love beauty in learning, culture and travel. Art, culture or teaching suit you, and travel brings good relationships.',
    10: 'Your career benefits from charm, taste or diplomacy. Creative, client or quality-focused work suits you — build relationships with decision-makers.',
    11: 'Gains come through friends, social life and pleasant connections. Your network is an asset — nurture it with generosity.',
    12: 'You enjoy comfort, retreat and private pleasures. Make rest beautiful, but keep an eye on spending on comfort.',
  },
  Saturn: {
    1: 'You are serious, responsible and built to last, and may have felt older than your age early on. Trust slow progress, and look after bones, teeth and posture.',
    2: 'Money comes slowly but steadily through discipline. Build savings systematically, and choose your words with care in family matters.',
    3: 'You develop courage and skill through persistence. Long-term learning and steady effort pay off — don’t give up early.',
    4: 'Home life may carry duties or feel heavy at times. Build stability step by step, and make home a place of rest, not obligation.',
    5: 'Creativity and children may come with responsibility, or later in life. Approach creative goals with discipline — patience pays.',
    6: 'You beat problems through persistence and good systems. Excellent for long-term, demanding work: build routines and stick to them.',
    7: 'Partnerships take commitment and time, and often mature later. Choose reliable partners, and make commitments slowly but firmly.',
    8: 'You are built to endure long changes. Plan for the long term, keep reserves, and approach shared money cautiously.',
    9: 'Your beliefs are hard-won and practical. Respect tradition but test it — structured study and experienced mentors suit you.',
    10: 'Your career builds slowly to real authority. Commit to the long game; your reputation rests on reliability.',
    11: 'Gains come steadily through long-term effort and established contacts. Be patient with goals — don’t chase quick wins.',
    12: 'You are comfortable with solitude, and your life may end up far from where it began. Protect your sleep, and keep spending under control.',
  },
  Rahu: {
    1: 'You want to stand out and reinvent yourself. Use the drive for bold, unconventional moves — but stay honest about who you are.',
    2: 'You have a big appetite for wealth and an unusual way of earning or speaking. New markets and technology suit you; avoid get-rich-quick schemes.',
    3: 'You have bold, unconventional courage. Media, technology and calculated risks suit you.',
    4: 'You may feel restless about home and roots, or live far from where you grew up. Build a base you choose — don’t keep moving to escape.',
    5: 'You have unconventional ideas and creative ambition. Take creative risks, but stay away from speculation and gambling.',
    6: 'You are excellent at beating competition and solving unusual problems. Strong for competitive or technical work; get unclear health issues properly checked.',
    7: 'You are drawn to unusual partners or partnerships across cultures. Be clear about agreements, and don’t idealise the other person.',
    8: 'You are drawn to the hidden, to research and to sudden change. Investigation and technology suit you; avoid unnecessary risks.',
    9: 'You question traditions and learn from foreign or unconventional teachers. Travel and broad study suit you — choose mentors carefully.',
    10: 'You have strong worldly ambition and can rise in unconventional fields. Go for it, but build your reputation on substance.',
    11: 'Gains through networks, technology and large groups can be big. Set ambitious goals — and keep your circle trustworthy.',
    12: 'You are drawn to foreign places and hidden things, with spending you can’t always account for. Track your expenses, and use time abroad or in retreat well.',
  },
  Ketu: {
    1: 'You can seem detached or hard to read, with sharp intuition. Use it in specialist work, and make an effort to show warmth.',
    2: 'You are not very attached to money or family patterns, and your speech can be blunt. Keep a simple budget, and choose your words.',
    3: 'Your courage is quiet and intuitive. Specialist skills and research suit you more than self-promotion.',
    4: 'You may feel unsettled about home or detached from your roots. Create inner peace first — a simple home suits you.',
    5: 'Your intelligence is intuitive and deep, and your creative work can be unusual. Trust your instincts, and be patient with children and romance.',
    6: 'Enemies simply don’t stick to you, and you handle problems calmly. Health issues may be hard to pin down — get thorough check-ups.',
    7: 'You can feel detached in relationships or give a partner too much room. Keep connection intentional, and say what you need.',
    8: 'You have deep intuition and an interest in hidden knowledge. Research and reflective practice suit you; go gently with sudden changes.',
    9: 'You question formal beliefs and find your own. Seek wisdom directly rather than through institutions.',
    10: 'You may feel detached from status or change direction at work. Choose meaningful work over titles.',
    11: 'You don’t chase gains or big networks. A small, real circle and meaningful goals serve you better.',
    12: 'You are naturally drawn to retreat, reflection and letting go. Meditation and solitude do you good — just keep a grip on practical matters.',
  },
};

/** One plain line per nakshatra — used for the rising degree and the Moon. */
export const NAKSHATRA_PLAIN: Record<string, string> = {
  Ashwini: 'quick to start and good at getting things moving — you like to act fast and help fast.',
  Bharani: 'intense and able to carry heavy loads; you handle big transitions others avoid.',
  Krittika: 'sharp and honest; you cut through nonsense and hold high standards.',
  Rohini: 'warm, attractive and growth-minded; you love comfort and make things flourish.',
  Mrigashira: 'curious and searching; you are always looking for the next thing to understand.',
  Ardra: 'intense and clear-eyed; your storms tend to clear the air, and you are good with complex systems.',
  Punarvasu: 'optimistic and resilient; you come back after setbacks and help others do the same.',
  Pushya: 'nurturing and dependable; people rely on you to protect and provide.',
  Ashlesha: 'perceptive and strategic; you read people well and keep your cards close.',
  Magha: 'dignified, with respect for tradition and roots; you take your place with natural authority.',
  'Purva Phalguni': 'you know how to enjoy yourself, and you make that contagious — rest, romance and creative play.',
  'Uttara Phalguni': 'loyal and generous; you are good at commitments and partnerships that last.',
  Hasta: 'skilful and practical; you are clever with your hands and with getting things done.',
  Chitra: 'you make beautiful things and have an unusually exact eye for design.',
  Swati: 'independent and adaptable; you need freedom to move and grow at your own pace.',
  Vishakha: 'goal-driven and determined; once you set your sights on something, you stay with it.',
  Anuradha: 'a loyal friend and a natural collaborator; you do well in teams and long friendships.',
  Jyeshtha: 'protective and responsible; you often end up as the senior one who carries things.',
  Mula: 'you dig to the root of things, and sometimes need to pull things up to start fresh.',
  'Purva Ashadha': 'persuasive and hard to defeat; you build momentum and carry others with you.',
  'Uttara Ashadha': 'steady and principled; your wins come late but they last.',
  Shravana: 'a listener and a learner; you gain by paying attention to what others miss.',
  Dhanishta: 'ambitious and resourceful, with a strong sense of rhythm and timing.',
  Shatabhisha: 'independent, analytical and private; you are good at fixing what others can’t.',
  'Purva Bhadrapada': 'an intense idealist with two sides — fiery commitment and deep reflection.',
  'Uttara Bhadrapada': 'calm, deep and patient; you stay steady when others panic.',
  Revati: 'gentle and kind; you guide others and see projects safely to completion.',
};

/** What a life area "comes through" when its ruling planet sits in house n. */
export const COMES_THROUGH: Record<number, string> = {
  1: 'your own initiative and the way you present yourself',
  2: 'income, family and the way you speak',
  3: 'your own effort, skills, writing and short trips',
  4: 'home, family, property and a settled base',
  5: 'creativity, ideas, education and children',
  6: 'hard work, service, problem-solving and competition',
  7: 'partners, clients and contracts',
  8: 'change, research, crises and shared money',
  9: 'teachers, study, travel and your beliefs',
  10: 'your career and your public role',
  11: 'networks, friends and larger organisations',
  12: 'foreign places, retreat, behind-the-scenes work and spending',
};

/**
 * What it looks like in real life when an area "runs through" house n (its ruler sits there):
 * where help for that area actually comes from, written so it reads after "X runs through …".
 */
export const LINK_HOW: Record<number, string> = {
  1: 'your own initiative: it moves when you act on it yourself, and stalls while you wait for others',
  2: 'money and family: it is steadier when your income is steady, and family often has a hand in it',
  3: 'your own effort and skills: it improves when you learn, write, pitch and follow up yourself',
  4: 'home and a settled base: it goes better when your home life is calm and secure',
  5: 'creativity, learning and children: it goes best when you are making something of your own',
  6: 'hard work, service and daily routines: it improves through effort and problem-solving, usually with some conflict on the way',
  7: 'partners, clients and contracts: the right partner or client moves it forward, the wrong one blocks it',
  8: 'change, research and shared money: it tends to shift after an upheaval, a joint financial arrangement or a crisis you come through',
  9: 'teachers, study and travel: a mentor, a course or time abroad tends to open it up',
  10: 'your career and public role: it rises and falls with how your work is going',
  11: 'friends, networks and organisations: it improves through people you know — a friend’s tip, a community, an employer or club',
  12: 'distance, retreat and private spending: it improves through time away, a move or quiet behind-the-scenes work, and it tends to cost money',
};

/** Why a link 6, 8 or 12 places on is harder, in practical terms. */
export const UPHILL: Record<number, string> = {
  6: 'This is an uphill link: expect to work, compete or negotiate for what it brings.',
  8: 'This is an unsteady link: what it brings tends to arrive after a delay, a disruption or a renegotiation.',
  12: 'This is a costly link: it tends to take money, time or distance before it pays back.',
};

/** The practical lever: what to do when an area comes through house n. */
export const LEVER: Record<number, string> = {
  1: 'take the initiative yourself rather than waiting to be asked',
  2: 'build income you control and speak up clearly about what things are worth',
  3: 'put your work out — write, pitch, publish, follow up',
  4: 'secure your home base first; everything else runs better from there',
  5: 'turn ideas into small, tested projects and give creative work a fixed slot',
  6: 'build routines and systems, and take on the problems others avoid',
  7: 'invest in two or three strong partnerships and put agreements in writing',
  8: 'learn how shared money, contracts and risk work, and keep reserves',
  9: 'find a mentor, study something serious, and travel with purpose',
  10: 'take visible responsibility and keep a record of your results',
  11: 'show up in the right communities and keep in touch with your network',
  12: 'work quietly and deeply, look abroad, and track every expense',
};

/** Plain titles for the base yoga library (Mahapurusha, lunar and solar yogas, Viparita Raja). */
export const BASE_YOGA_PLAIN: Record<string, { title: string; use: string; care?: boolean }> = {
  'Anapha Yoga': { title: 'A well-regarded character', use: 'People tend to see you as decent and composed. Protect that reputation — it opens doors.' },
  'Sunapha Yoga': { title: 'Self-made resources', use: 'You build money and standing through your own effort. Back yourself and keep building.' },
  'Durudhara Yoga': { title: 'Support from more than one side', use: 'Help and resources tend to come from several directions. Notice them and use them.' },
  'Kemadruma Yoga': { title: 'Feeling on your own at times', use: 'You may feel unsupported in some phases. Build a reliable circle deliberately rather than waiting for one.', care: true },
  'Vosi Yoga': { title: 'Skilful and hard-working', use: 'Your effort and skill carry you. Let your work speak, and make sure the right people see it.' },
  'Vesi Yoga': { title: 'Balanced and truthful', use: 'People trust your even temper. Use it when others lose theirs.' },
  'Ubhayachari Yoga': { title: 'Well supported on both sides', use: 'You tend to have resources and a good name. Use them to lift others too.' },
  'Harsha Yoga': { title: 'Strength in a crisis', use: 'Problems tend to make you stronger, and trouble in one area quietly produces success in another. Stay steady when things go wrong.' },
  'Sarala Yoga': { title: 'Resilience under pressure', use: 'You come through upheaval better than most. Don’t avoid hard situations that lead somewhere.' },
  'Vimala Yoga': { title: 'Good with money and endings', use: 'You handle expenses and endings well and can close chapters cleanly. Keep that discipline with spending.' },
};

/* ══ Love and marriage ══ */

/** How you love, by the sign your love planet (Venus) is in. No planet names: Simple view. */
export const LOVE_STYLE: Record<string, string> = {
  Aries: 'You fall fast and show it. You love the chase and lose interest when things go flat, so keep doing new things together.',
  Taurus: 'You love steadily and physically — touch, good food, comfort, loyalty. You take time to trust, and once you do, you stay.',
  Gemini: 'You fall for minds first. Conversation and humour keep you interested; silence and routine make you restless.',
  Cancer: 'You love by looking after someone, and you need to feel emotionally safe. Hurt goes deep and takes a long time to heal.',
  Leo: 'You love generously and openly, and you need to be admired back. Being taken for granted is what cools you.',
  Virgo: 'You show love through practical help and attention to detail rather than big gestures. This is classically a hard placement for romance: you can be critical — of yourself most of all — and find it difficult to relax into being loved.',
  Libra: 'Partnership comes naturally to you: you want harmony, fairness and a relationship that looks and feels good. The risk is keeping the peace at your own expense.',
  Scorpio: 'You love intensely and all-or-nothing. Trust and loyalty matter more to you than charm, and betrayal is very hard for you to forgive.',
  Sagittarius: 'You need freedom and a shared sense of adventure or meaning. A partner who restricts you won’t last; one who travels and grows with you will.',
  Capricorn: 'You love seriously and show it through reliability rather than words. You may commit late, and your relationships tend to improve with age.',
  Aquarius: 'You need a friend first and room to stay yourself. Unconventional arrangements suit you better than the traditional script.',
  Pisces: 'You love selflessly and romantically — classically the best placement there is for love. Watch for idealising a partner or trying to rescue people.',
};

/** Who you are drawn to as a long-term partner, by the sign on the 7th house. */
export const PARTNER_TYPE: Record<string, string> = {
  Aries: 'a direct, energetic partner who takes the initiative',
  Taurus: 'a steady, sensual and financially sensible partner',
  Gemini: 'a curious, talkative partner who keeps things light',
  Cancer: 'a caring, family-minded and emotionally open partner',
  Leo: 'a confident, warm partner with a strong presence',
  Virgo: 'a practical, capable partner with an eye for detail',
  Libra: 'a fair-minded, attractive and sociable partner',
  Scorpio: 'a deep, private and intense partner',
  Sagittarius: 'an open-minded, principled partner who loves travel and ideas',
  Capricorn: 'a mature, responsible and ambitious partner, often older or more established',
  Aquarius: 'an independent, unconventional partner who is also your friend',
  Pisces: 'a gentle, imaginative and spiritually minded partner',
};

/** The partner who suits you most deeply, by the spouse indicator (Darakaraka). */
export const DEEP_PARTNER: Record<string, string> = {
  Sun: 'someone with authority and self-respect. It works when you share the lead rather than compete for it.',
  Moon: 'someone emotionally warm and nurturing. Your moods and theirs will be closely linked, so look after both.',
  Mars: 'someone energetic and decisive. Expect sparks, and agree early on how you handle arguments.',
  Mercury: 'someone clever and communicative, often young in spirit. Talking is the glue — when conversation stops, check in.',
  Jupiter: 'someone wise, principled and generous, often a teacher or adviser type. Respect is the foundation.',
  Venus: 'someone attractive, artistic and easy to be with. Shared pleasures and beauty hold you together.',
  Saturn: 'someone serious and reliable, often older or from a different background. It starts slowly and gets stronger with the years.',
  Rahu: 'someone unusual or from a different culture. Exciting, but check that what you see is real before you commit.',
};

/** What tends to strain a marriage, by a hard planet near the marriage point (Upapada). */
export const MARRIAGE_STRAIN: Record<string, string> = {
  Sun: 'pride and who gets the final word',
  Mars: 'arguments, impatience and heat',
  Saturn: 'distance, duty and things left unsaid',
  Rahu: 'unrealistic expectations or outside temptation',
  Ketu: 'drifting apart without noticing',
};

/** A planet in the 7th house, read for love and marriage only (the business reading lives in PLANET_IN_HOUSE). */
export const LOVE_IN_7: Partial<Record<string, string>> = {
  Sun: 'You want a partner you can respect and be proud of; respect matters more to you than romance.',
  Mars: 'There is passion and friction in your relationships: you want a partner with fire, and then have to handle it.',
  Mercury: 'You bond through conversation: a partner you can’t really talk to won’t hold you, however attractive.',
  Jupiter: 'You attract decent, generous partners, and marriage is a source of growth for you.',
  Venus: 'Love and partnership come easily to you.',
  Saturn: 'Commitment comes slowly and is meant to last: marriage often happens later, or with someone older or more serious.',
  Rahu: 'You are drawn to unusual partners, often from another culture or background; idealising them is the risk.',
  Ketu: 'You can feel detached in relationships, or give a partner so much room that the connection thins.',
};
