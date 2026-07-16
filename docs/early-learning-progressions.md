# Early-learning progressions — research grounding for worksheet activities

This document is the **evidence base** for how the app builds *do-it* worksheet
activities (tracing, pre-writing strokes, letter/number formation, drawing, copying)
and how it gates them by a child's age. It exists because a first attempt shipped
developmentally wrong material — e.g. "Write a sentence about your day" on a worksheet
for a 4-year-old who is still learning to hold a pencil, and the same tracing rows
repeated on every sheet. Nothing here is invented: every rule the code applies traces
back to a source below. When we change the activity engine, update this file too.

**Design principles that fall out of the research**
1. **Motor development is sequential and age-linked.** A child can imitate a vertical
   line long before they can copy a triangle. Activities must be gated to what the child
   can actually do, not to the topic alone.
2. **Imitation precedes copying precedes independent production.** "Trace" (over a model)
   is easier than "copy" (from a model) is easier than "write from memory." The same
   letter/number is offered at different support levels by age.
3. **Never repeat within a topic's sheets.** Progressions are *ordered*; each successive
   worksheet advances along the sequence (stroke → stroke, letter set → letter set,
   number → number) so no two sheets are identical.
4. **Err conservative on age.** A 2020 peer-reviewed study (below) found common charts
   push some strokes *earlier* than children's natural capability; where sources
   disagree we gate to the **older** end.

---

## 1. Pre-writing stroke progression (the backbone of tracing)

Children acquire the nine pre-writing strokes in a stable order. Typical ages at which
each is **imitated** (watching an adult draw it) and then **copied** (from a static
model):

| Order | Stroke | Imitates | Copies |
|------|--------|----------|--------|
| 1 | Vertical line \| | ~18–24 mo | ~2–3 y |
| 2 | Horizontal line — | ~2–2.5 y | ~3 y |
| 3 | Circle ○ | ~2–2.5 y | ~3 y |
| 4 | Cross + | — | ~3.5–4 y |
| 5 | Right diagonal ╱ | — | ~4–4.5 y |
| 6 | Square □ | — | ~4 y |
| 7 | Left diagonal ╲ | — | ~4.5 y |
| 8 | X | — | ~5 y |
| 9 | Triangle △ | — | ~5 y |

Sources: The OT Toolbox, "Pre-Writing Lines & Strokes" and its developmental-progression
download; NAPA Center, "Activities to Develop Pre-Writing Skills"; and the peer-reviewed
Zascavage et al., *Pediatric Prewriting Stroke Developmental Stages* (Journal of
Occupational Therapy, Schools & Early Intervention, 13(1), 2020), which cautions that
some charts over-state early copying ability — hence our conservative gating.

**How the app uses it:** the tracing "lines & shapes" activity walks this list in order,
one stroke family per sheet, capped at the child's age band (age 4 ≤ cross; age 5 adds
diagonals/square/X; age 6 adds triangle + curves/zig-zags). Sheet 1 traces verticals,
sheet 2 horizontals, sheet 3 circles, and so on — so sheets never repeat.

---

## 2. Fine-motor & drawing milestones by age

| Age | Can imitate/copy | Drawing a person | Notes |
|-----|------------------|------------------|-------|
| 2 | controlled scribble; imitate \|, —, ○ | — | random → controlled scribble |
| 3 | copy \|, —, ○; make +, dots, loops | "tadpole" (head + legs) | poorly-formed squares |
| 4 | copy + and □; begins ╱ | person w/ 2–4 parts | colours within broad outlines |
| 5 | copy △, X; simple shapes | person w/ 6+ parts | draws shape-based pictures (house) |
| 6 | all shapes; controlled forms | detailed figure | — |

Sources: Growing Hands-On Kids, "Fine Motor Developmental Milestones Ages 0–6"; Lurie
Children's, "Fine Motor Developmental Milestones"; The OT Toolbox, "Drawing Milestones";
North Shore Pediatric Therapy, "Developmental Milestones for Pre-Writing and Writing."

**How the app uses it:** "draw" activities are gated by this table — a 4-year-old is
asked to draw/colour and to draw small quantities; shape-drawing prompts (triangle,
square, house) are held until 5; a "draw a person / your family" prompt is age-appropriate
from 4. Draw-a-quantity counts are capped at the child's counting range (§5).

---

## 3. Letter formation & the order to introduce letters

Two different orderings matter, and we use both for different purposes.

**(a) Formation order — how the hand makes the shape (Handwriting Without Tears).**
Letters are taught by *starting stroke*, not alphabetically, because same-motion letters
reinforce each other:
- **Capitals first** (all start at the top, easiest): **Frog-Jump** `F E D P B R N M`
  (big line down, "frog-jump" back to top) → **Corner-starters** `H K L U V W X Y Z` →
  **Center-starters** `C O Q G S A I T J`.
- **Magic-C lowercase**: `c o a d g` (and `q`) all begin with the "magic c" curve.

Source: Learning Without Tears, HWT Printing teaching-order guide; The OT Toolbox,
"Handwriting Without Tears Letter Order."

**(b) Sound order — which letters carry the most reading value (Letters & Sounds / SATPIN).**
Every major UK synthetic-phonics scheme introduces letters in the same high-utility order
so children can build words almost immediately:
- **SATPIN** first: `s a t p i n` (two continuous sounds /s/ /n/; makes the most words).
- **Letters & Sounds Phase 2 sets**: Set 1 `s a t p` · Set 2 `i n m d` · Set 3 `g o c k`
  · Set 4 `ck e u r` · Set 5 `h b f l` (+ doubles `ff ll ss`). Phase 3 adds the rest of
  the alphabet and digraphs (`ch sh th ng ai ee igh oa …`).

Sources: DfES, *Letters and Sounds: Principles and Practice of High Quality Phonics*
(2007); letters-and-sounds.com, "Phase 2 Introduction"; Teach Starter & Twinkl on SATPIN.

**How the app uses it:** for a **phonics/letters** topic we trace letters in **sound
order** (SATPIN → the phase sets), because that matches what the child is learning to
read that week — and if the topic *names* its letters (e.g. "Single Letter Sounds: s a t
p") we trace exactly those first. For a **handwriting** topic we trace in **formation
order** (magic-c group, then frog-jump capitals) because the goal is the motor pattern.
Each sheet advances to the next small set of letters, so no sheet repeats.

---

## 4. Writing-task appropriateness by age (the rule that was violated)

The progression from mark-making to composing is slow and must not be skipped:

| Age | Appropriate writing tasks | NOT yet appropriate |
|-----|---------------------------|---------------------|
| 3–4 | make marks; **trace** single letters/numbers over a model; trace own name | copying words; writing letters from memory; **any sentence** |
| 4–5 | trace + begin to **copy** single letters/numbers and simple shapes; copy own name with support | composing words/sentences |
| 5–6 | **write own name** independently; copy most upper/lowercase letters; copy short CVC words | composing multi-word sentences |
| 6–7 | **copy** a short sentence; begin simple spelling | extended independent composition |
| 7–8 | **compose** short sentences; spelling patterns | — |
| 9+ | full written responses | — |

Sources: Understood.org, "Writing skills: what to expect at different ages"; Wise Wonder /
Phonics.org on name-writing readiness (whole legible name typically **5–6 y**, and it is a
*readiness*, not a birthday); North Shore Pediatric Therapy pre-writing/writing milestones.

**How the app uses it:** this table is the age gate. "Write a sentence" is **forbidden
below age 7** (copy-a-sentence allowed at 6). Name work is **trace** at 4, **copy** at 5,
**write** at 6+. Word copying starts at **5**. This is exactly the rule whose absence
produced the bad worksheet.

---

## 5. Early numeracy milestones (for count/draw/number activities)

| Age | Number skills |
|-----|---------------|
| 2–3 | rote count a few numbers; subitise 1–2 |
| 3–4 | one-to-one correspondence emerges; count ~5–10 objects; subitise to 3 |
| 4–5 | cardinality ("how many" = last count) for sets to ~5; subitise to 5; recognise some numerals |
| 5–6 | count to 20; recognise numerals 0–10; compare "more/fewer"; **begin writing numerals** |
| 6–7 | write numerals fluently; number bonds; +/− within 10–20 |

Sources: Child Development Authority, "Math and Numeracy Development in Young Children";
Funexpected, "Math Learning Milestones Ages 3–7"; FHSU Pressbooks, *Mathematics
Milestones Birth–Grade 2*; Learning Resources, "Early Years Maths Milestones by Age."

**How the app uses it:** draw-a-quantity and circle-the-group counts are **capped at the
child's counting range** (≤5 at age 4, ≤10 at age 5, ≤20 at age 6). Numeral work is
**trace** at 4, **write** at 5–6. The specific number varies per sheet (no repeats).

---

## 6. The age-profile the code applies

Distilling §§1–5 into what the engine actually reads. `age` = the **child's** age
(not just the topic's band), so a 4-year-old and a 6-year-old on the same 4–6 topic get
different sheets.

| Age | Strokes offered | Letters | Name | Words | Sentences | Number cap | Numerals | Activities added / sheet |
|-----|-----------------|---------|------|-------|-----------|-----------|----------|--------------------------|
| ≤4 | \| — ○ + | trace 2, sound order | trace | — | — | 5 | trace | ~6 |
| 5 | + ╱ ╲ □ X | trace/copy 3 | trace→copy | copy CVC | — | 10 | write | ~4 |
| 6 | + △ + curves | copy 4 | write | copy | **copy** | 20 | write | ~3 |
| 7–8 | (motor tapering) | — | write | — | **compose** | — | write | ~1 |
| 9+ | none | — | — | — | compose | — | — | 0 (pure Q&A) |

**No-repeat guarantee.** Every generator is a pure function of `(topic, age, sheetIndex)`
that indexes into an *ordered* progression by `sheetIndex`, so worksheet 1, 2, 3 of a
topic always differ (different strokes, different letters, different numbers, different
draw prompts). Reprints of a single-topic session worksheet advance a per-child/per-topic
counter so they vary across reprints too.

**Questions stay, flagged for the grown-up.** The 6 text questions per sheet are kept and
labelled "Grown-up reads this aloud" (pre-readers can't read them); the do-it activities
are added on top, so an early-years sheet runs ~10–14 items.

---

## Sources
- The OT Toolbox — *Pre-Writing Lines & Strokes*; *Handwriting Without Tears Letter Order*;
  *Drawing Milestones*. https://www.theottoolbox.com
- NAPA Center — *Activities to Develop Pre-Writing Skills and Strokes*. https://napacenter.org/prewriting-skills/
- Zascavage et al. (2020), *Pediatric Prewriting Stroke Developmental Stages*, Journal of
  Occupational Therapy, Schools & Early Intervention 13(1). https://www.tandfonline.com/doi/abs/10.1080/19411243.2019.1647811
- Growing Hands-On Kids — *Fine Motor Developmental Milestones Ages 0–6*. https://www.growinghandsonkids.com
- Lurie Children's — *Fine Motor Developmental Milestones*. https://www.luriechildrens.org
- North Shore Pediatric Therapy — *Developmental Milestones for Pre-Writing and Writing Skills*. https://www.nspt4kids.com
- Learning Without Tears — HWT Printing teaching-order guide. https://www.lwtears.com
- DfES (2007) — *Letters and Sounds: Principles and Practice of High Quality Phonics*. https://www.gov.uk
- letters-and-sounds.com — *Phase 2 Introduction*. https://letters-and-sounds.com/phase-2-introduction/
- Teach Starter / Twinkl — *SATPIN* and *Order of Phonics Teaching*. https://www.teachstarter.com , https://www.twinkl.com
- Understood.org — *Writing skills: what to expect at different ages*. https://www.understood.org
- Child Development Authority — *Math and Numeracy Development in Young Children*. https://childdevelopmentauthority.com
- Funexpected — *Math Learning Milestones Ages 3–7*. https://funexpectedapps.com
- FHSU Pressbooks — *Mathematics Milestones Birth–Grade 2*. https://fhsu.pressbooks.pub
