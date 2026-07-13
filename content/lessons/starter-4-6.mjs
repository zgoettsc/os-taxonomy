// Real, teachable lesson + practice content for the age 4–6 starter set.
//
// This is what the generation pipeline produces per topic: a parent-facing
// teaching lesson (what to say and do) plus printable child practice with an
// answer key. Authored in American English. Keyed by taxonomy topic id so the
// app serves it directly; the same shape is what gets stored in content_core /
// content_presentation once generation runs at scale.
//
// Facts here are stable, textbook-level early-years pedagogy — the kind the
// sourcing policy classes as low fabrication risk (see docs/content-sourcing.md).

export const LESSONS = {

  // ── English · Speaking & Listening ──────────────────────────────────────
  mt_n6GhzDPllD: {
    id: 'mt_n6GhzDPllD',
    match: 'Exploring Ideas Through Talk',
    subject: 'English', domain: 'Speaking & Listening', band: '4–6',
    minutes: 15,
    parent: {
      bigIdea: `Talking is thinking out loud. Before a child can write ideas down, they need to grow the ideas by saying them — wondering, guessing, imagining, and explaining why. Your job here isn't to get "right answers." It's to keep the conversation going so the thinking stretches.`,
      why: `Children who talk through ideas build bigger vocabularies, hold longer trains of thought, and later find writing far easier — because they've already rehearsed their ideas aloud. This is the single highest-value thing you can do at this age, and it needs no worksheet.`,
      teach: [
        { say: `"I wonder what would happen if…"`, do: `Pick something in view — a plant, the weather, a picture in a book — and wonder aloud. Then wait. Silence is an invitation, not a failure.` },
        { say: `"I think ___ because ___."`, do: `Model giving a reason. "I think it will rain because the sky is gray." Reasons are the muscle you're building.` },
        { say: `"What if it were the opposite?"`, do: `Flip the idea. "What if dogs could talk?" Let the answer be silly — imagination and reasoning grow together.` },
        { say: `"Tell me more about that."`, do: `When Hugh says something, don't correct or move on — dig. "Tell me more" doubles the length of a child's answer more reliably than any other phrase.` },
      ],
      worked: [
        `Parent: "I wonder why leaves fall off the trees." Hugh: "Because it's windy." Parent: "Ooh — tell me more. Do they fall when it isn't windy too?" Hugh: "…Yeah, in the fall." Parent: "So maybe it's about the season AND the wind. I think you found two reasons." — Notice: no correction, two "tell me more" moves, and you named his thinking back to him.`,
      ],
      watch: [
        `Jumping in to finish his sentence. Count to three first.`,
        `Turning it into a quiz ("What color is this? What shape?"). Quizzes close thinking; wondering opens it.`,
        `Only accepting the "right" answer. At this stage a reasoned wrong answer is worth more than a lucky right one.`,
      ],
      everyday: `Do this at dinner, in the car, on a walk. Three "I wonder…" moments a day beats one long lesson.`,
    },
    practice: {
      intro: `These are talk prompts, not worksheets — read one, then follow Hugh's lead with "tell me more." Aim for a few sentences each, not one word.`,
      items: [
        { kind: 'talk', prompt: `Picture talk: look at any picture book page together. Ask: "What do you think is about to happen next? What makes you think that?"` },
        { kind: 'talk', prompt: `Wondering game: take turns starting a sentence with "I wonder…". No answer required — just wonder back and forth five times.` },
        { kind: 'talk', prompt: `Because it: you say a fact ("The floor is wet"), Hugh gives a reason with "because" ("because someone spilled water").` },
        { kind: 'talk', prompt: `What if: "What if we were as tall as a house? What could we do? What would be tricky?"` },
        { kind: 'talk', prompt: `New word try-out: after a story, pick one new word from it (e.g. "enormous") and challenge Hugh to use it three times today.` },
      ],
      sentenceStems: [`I wonder…`, `I think ___ because ___`, `What if…?`, `Maybe it's because…`, `That reminds me of…`],
    },
  },

  // ── Mathematics · Counting & Cardinality ───────────────────────────────
  mt__h7hvT4tEb: {
    id: 'mt__h7hvT4tEb',
    match: 'Comparing groups: more or fewer',
    subject: 'Mathematics', domain: 'Counting & Cardinality', band: '4–6',
    minutes: 15,
    parent: {
      bigIdea: `"More," "fewer," and "the same" come before real arithmetic. A child first compares by matching things one-to-one, then learns that counting both groups and comparing the numbers gives the same answer faster.`,
      why: `Comparing quantities is the seed of addition, subtraction, and later "greater than / less than." If a child truly gets "4 is more than 2," the symbols come easily later.`,
      teach: [
        { say: `"Let's line them up and match."`, do: `Put two rows of objects (buttons, crackers) with one from each row paired up. The row that "sticks out" has more — no counting needed yet. This is one-to-one matching.` },
        { say: `"Now let's count each group."`, do: `Count the first group, then the second. "Four here, two there. Which number is bigger?" Connect the matching answer to the counting answer — they agree.` },
        { say: `"How many more?"`, do: `Point at the ones that stuck out. "Two didn't have a partner — so four is two MORE than two." You're quietly teaching subtraction as difference.` },
        { say: `"Can you make them equal?"`, do: `"Add one… now two. Now both rows are the same — four and four." Building equality is as important as spotting inequality.` },
      ],
      worked: [
        `Line up 5 spoons and 3 forks, paired. Two spoons have no fork partner → "5 is more than 3, by 2." Then count each to confirm. Same answer, two ways. Then hand Hugh 2 more forks: "Now they're equal — 5 and 5."`,
      ],
      watch: [
        `Thinking the longer row always has more — spread 3 objects wide vs. 4 bunched up. Matching (not spacing) tells the truth. This is a classic mix-up worth doing on purpose.`,
        `Confusing "more" and "fewer." Use both words every time so both stick.`,
      ],
      everyday: `Snack time is a math lesson: "Do you have more crackers or more grapes? How many more?"`,
    },
    practice: {
      intro: `Hugh circles the group with MORE (unless it says fewer). Count both, then check the answer key. Say "more" and "fewer" out loud as he works.`,
      // generated correct-by-construction; rendered as counters
      generate: 'compare',
    },
  },

  // ── English · Phonics & Word Reading ───────────────────────────────────
  mt_4GiE83rJF_: {
    id: 'mt_4GiE83rJF_',
    match: 'Rhyming words',
    subject: 'English', domain: 'Phonics & Word Reading', band: '4–6',
    minutes: 15,
    parent: {
      bigIdea: `Rhyming words end with the same sound: cat, hat, bat. Hearing that ending sound — before ever reading the letters — is one of the strongest early signs a child is ready to read.`,
      why: `Rhyme trains the ear to break words into sounds (phonological awareness). Kids who hear rhyme early tend to crack the reading code faster, because reading is, at its root, mapping sounds to letters.`,
      teach: [
        { say: `"Listen to the END of the word."`, do: `Say a pair slowly: "c–at… h–at." Stretch the ending. "Hear how they finish the same way?"` },
        { say: `"Do these rhyme? cat… dog?"`, do: `Mix rhyming and non-rhyming pairs. Thumbs up for rhyme, thumbs down for no. Ears first, letters later.` },
        { say: `"Can you think of one that rhymes with sun?"`, do: `Generating a rhyme is harder than spotting one — celebrate any real attempt, even a nonsense word that rhymes ("bun, run, zun!"). The sound is what matters.` },
        { say: `"Finish my rhyme."`, do: `"The fat cat sat on a ___." Let Hugh supply "mat/hat/bat." Nursery rhymes and Dr. Seuss are perfect fuel.` },
      ],
      worked: [
        `Family fun: "Today's rhyme family is -at." Say cat, hat, bat, mat, rat, sat, and let Hugh add any word that fits — real or made up. Then switch to the -og family: dog, log, frog, hog. Kids love collecting a "family."`,
      ],
      watch: [
        `Matching by first sound instead of last (cat/car). Redirect: "Those start the same — but listen to the END."`,
        `Reaching for letters too early. Keep it an ear game at this stage; spelling comes later.`,
      ],
      everyday: `Rhyme while you walk: "I spy something that rhymes with 'bee'… a tree!"`,
    },
    practice: {
      intro: `Read each row to Hugh. He picks the word that rhymes with the first one, and can shout out more that rhyme too.`,
      generate: 'rhyme',
    },
  },

  // ── Mathematics · Measurement ──────────────────────────────────────────
  mt_NtJYlJdUe9: {
    id: 'mt_NtJYlJdUe9',
    match: 'Measurable Attributes of Objects',
    subject: 'Mathematics', domain: 'Measurement', band: '4–6',
    minutes: 15,
    parent: {
      bigIdea: `Everything can be measured in more than one way. A bottle has a height, a weight, and a capacity (how much it holds). First a child names these attributes; then they compare two objects directly — longer/shorter, heavier/lighter, taller/shorter, holds more/less.`,
      why: `Naming and comparing attributes is the foundation of all measurement and, later, of using rulers and scales. Direct comparison ("put them side by side") must come before numbers and units.`,
      teach: [
        { say: `"What could we measure about this?"`, do: `Hold up an object. Draw out: how long? how heavy? how tall? how much does it hold? One object, several attributes.` },
        { say: `"Let's line them up at the same end."`, do: `To compare length, both objects must start at the same line. This "fair start" idea is the seed of using a ruler from zero.` },
        { say: `"Hold one in each hand — which is heavier?"`, do: `Hands are the first scale. Heavier/lighter is felt before it's numbered.` },
        { say: `"Which cup holds more water?"`, do: `Pour from one into the other. If it overflows, the first held more. Capacity, discovered by pouring.` },
      ],
      worked: [
        `Grab a spoon and a pencil. "Which is longer?" Line them up at one end — the pencil sticks out, so it's longer. "Which is heavier?" One in each hand — the spoon. Same two objects, different answers, because length and weight are different attributes. That's the whole lesson.`,
      ],
      watch: [
        `Comparing length without lining up the ends. If they start at different points, the comparison is unfair — make the "fair start" explicit.`,
        `Thinking bigger-looking = heavier. A big pillow vs. a small rock breaks that idea nicely.`,
      ],
      everyday: `Tidying up is measurement: "Put the cups in order from holds-the-most to holds-the-least."`,
    },
    practice: {
      intro: `Hugh circles the object that matches the word (taller, longer, heavier, holds more). Talk about how you'd check it in real life.`,
      generate: 'measure',
    },
  },

};

// ---- correct-by-construction practice generators (shared by app + renderer) ----
// Deterministic-ish; the caller may pass a simple counter for variety.
export function makePractice(kind, seedFn) {
  const rnd = seedFn || (() => Math.random());
  const R = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const EMO = { apple: '🍎', star: '⭐', fish: '🐟', flower: '🌸', car: '🚗', duck: '🦆', ball: '⚽', leaf: '🍃' };
  const names = Object.keys(EMO);

  if (kind === 'compare') {
    return Array.from({ length: 8 }, () => {
      let a = R(1, 8), b = R(1, 8); while (a === b) b = R(1, 8);
      const [n1, n2] = [names[R(0, names.length - 1)], names[R(0, names.length - 1)]];
      const ask = rnd() < 0.25 ? 'fewer' : 'more';
      const winner = ask === 'more' ? (a > b ? 'left' : 'right') : (a < b ? 'left' : 'right');
      return { kind: 'compare', left: EMO[n1].repeat(a), right: EMO[n2].repeat(b),
        la: a, rb: b, ask, answer: `${ask === 'more' ? Math.max(a, b) : Math.min(a, b)} (${winner} group)`, winner,
        diff: Math.abs(a - b) };
    });
  }
  if (kind === 'rhyme') {
    const fam = [
      { target: 'cat', options: ['hat', 'sun', 'dog'], answer: 'hat', more: 'bat, mat, rat, sat' },
      { target: 'dog', options: ['log', 'cup', 'pen'], answer: 'log', more: 'frog, hog, jog, fog' },
      { target: 'sun', options: ['run', 'top', 'bed'], answer: 'run', more: 'bun, fun, one, done' },
      { target: 'bee', options: ['tree', 'cup', 'hand'], answer: 'tree', more: 'see, key, three, free' },
      { target: 'star', options: ['car', 'fish', 'sock'], answer: 'car', more: 'far, jar, bar, guitar' },
      { target: 'bug', options: ['rug', 'sock', 'leaf'], answer: 'rug', more: 'hug, mug, jug, tug' },
      { target: 'snake', options: ['cake', 'bird', 'ring'], answer: 'cake', more: 'lake, rake, bake, wake' },
      { target: 'red', options: ['bed', 'blue', 'ball'], answer: 'bed', more: 'head, bread, sled, fed' },
    ];
    return fam.map((f) => ({ kind: 'rhyme', ...f }));
  }
  if (kind === 'measure') {
    const rows = [
      { attr: 'taller', a: '🌳 tree', b: '🌷 flower', answer: '🌳 tree' },
      { attr: 'longer', a: '✏️ pencil', b: '🥄 spoon', answer: '✏️ pencil' },
      { attr: 'heavier', a: '🪨 rock', b: '🪶 feather', answer: '🪨 rock' },
      { attr: 'holds more', a: '🪣 bucket', b: '🥤 cup', answer: '🪣 bucket' },
      { attr: 'shorter', a: '🐛 caterpillar', b: '🐍 snake', answer: '🐛 caterpillar' },
      { attr: 'lighter', a: '🎈 balloon', b: '📚 books', answer: '🎈 balloon' },
      { attr: 'taller', a: '🦒 giraffe', b: '🐁 mouse', answer: '🦒 giraffe' },
      { attr: 'holds more', a: '🛁 bathtub', b: '🍵 teacup', answer: '🛁 bathtub' },
    ];
    return rows;
  }
  return [];
}
