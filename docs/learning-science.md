# The Physics of Learning

> **Source note.** This document reproduces an external analysis shared with the
> project on the science of learning and why it is so rarely put into practice.
> It is preserved here as the pedagogical foundation for how we design content,
> practice, scheduling, and the parent's role. Our own mapping of these ideas
> onto this repository lives in [`applying-learning-science.md`](applying-learning-science.md).

The knowledge graph is the main ingredient in the secret sauce that empowers
students to learn at breakneck speed. Here's the rest of the recipe — the
physics of learning, and why almost no one uses it.

---

It's shocking how much we know about how learning happens, all the way down to
the mechanics of what's going on in the brain. And not just how learning
happens, but also what can be done to improve it.

There are plenty of learning-enhancing practice strategies that have been tested
scientifically, numerous times, and are completely replicable. They might as
well be laws of physics.

For instance: we know that **actively solving problems** produces more learning
than passively watching a video/lecture or re-reading notes. (To be clear:
active learning doesn't mean students never watch and listen. It means students
are actively solving problems as soon as possible following a *minimum effective
dose* of initial explanation, and they spend the vast majority of their time
actively solving problems.)

Another finding: if you don't review information, you forget it. You can model
this precisely, mathematically, using a **forgetting curve**. These really are
like laws of physics — the difference is only that we've gone up several levels
of scale and are dealing with noisier stochastic processes.

---

## Aren't these findings obvious?

Yes, but in education, obvious strategies often aren't put into practice. Plenty
of classes still run on a pure lecture format and don't review previously
learned material unless it's the day before a test.

And there are plenty of findings that replicate just as well but are *not* so
obvious:

- **The spacing effect** — more long-term retention occurs when you space out
  your practice, even if it's the same total amount of practice.

- **Spaced repetition (distributed practice)** — a profound consequence of the
  spacing effect: the more reviews are completed (with appropriate spacing), the
  longer the memory is retained, and the longer you can wait until the next
  review. A "repetition" is a successful review at the appropriate time.

- **The testing effect (retrieval practice effect)** — the best way to review is
  to test yourself, i.e. practice retrieving from memory, *unassisted*. To
  maximize how much your memory is extended, avoid looking back at reference
  material unless you are totally stuck.

- **Spaced retrieval practice** — combine the testing effect with spaced
  repetition for an even more potent technique.

- **Mixed practice / interleaving** — during review, spread minimal effective
  doses across various skills. The opposite is "blocked" practice (extensive
  consecutive repetition of one skill). Blocked practice gives a false sense of
  mastery by letting students settle into a robotic rhythm. Interleaving creates
  a *desirable difficulty* that promotes far superior retention and
  generalization.

- **Automaticity** — practice low-level skills enough that they run without
  conscious effort, freeing up mental processing power. Think of a basketball
  player dribbling, running, and strategizing at once: if they had to consciously
  manage every bounce they'd be too overwhelmed to strategize. Same in learning.

- **Deliberate practice** — the most effective active learning: individualized
  activities chosen to improve specific aspects of performance through effortful
  (not mindless) repetition and successive refinement. Because it demands intense
  effort *beyond* one's current repertoire, it's less enjoyable, so people avoid
  it and instead practice within their comfort zone — which is never deliberate
  practice, no matter the activity.

- **The expertise reversal effect** — techniques that promote the most learning
  in experts promote the *least* in beginners, and vice versa. A key consequence:
  effective practice for students should NOT emulate what experts do in the
  workplace (e.g. groups solving open-ended problems). Beginners learn most
  effectively through **direct instruction**.

---

## These aren't new

Most key findings have been known for decades. They're just not widely
circulated outside the niche fields of cognitive science and talent
development — not even in adjacent fields like education, and typically not even
in teacher-credentialing programs. Do a literature review on Google Scholar and
it's all right there.

So why aren't they leveraged in classrooms?

### 1. Leveraging them requires additional effort from teachers and students.

Each strategy increases the intensity of effort required, and that extra effort
converts into an outsized learning gain. This is so well-documented it has a
name: a practice condition that makes the task harder — slowing learning yet
improving recall and transfer — is a **desirable difficulty**.

Desirable difficulties make practice more representative of true assessment
conditions. Without them, students and teachers vastly overestimate their
knowledge — the **illusion of comprehension**. But the typical teacher is
incentivized to maximize students' *immediate* performance and happiness, which
biases them against desirable difficulties and toward promoting the illusion.
Using desirable difficulties exposes that students didn't learn as much as they
"felt" they did — inconvenient for everyone, so the illusion is often preferred.

### 2. Leveraging these strategies fully requires an inhuman amount of effort from teachers.

Imagine a classroom using these strategies fully: every student fully engaged in
productive problem-solving, with immediate feedback (and remedial support when
needed), on exactly the problem types and settings (with/without reference,
blocked/interleaved, timed/untimed) that move *their* needle most *right now* —
for the entire class period, except brief moments of introduction to a new topic
via a worked example.

Why is this inhuman?

- It's extremely hard, often impossible, to find one problem type productive for
  *all* students at once. A "class average" choice is too hard for many and too
  easy for many.

- To even know what each student needs, the teacher must track each student's
  progress on each problem type, manage a spaced-repetition schedule of when each
  student reviews each topic, and continually update it based on performance —
  complicated by the fact that reviewing an advanced topic implicitly reviews
  many simpler prerequisite topics, all of whose schedules must then be adjusted.
  This is an inhuman amount of bookkeeping and computation.

- Even with a universally productive problem type, different students need
  different amounts of practice and different amounts of time to master it.

Without the proper technology, it is impossible for one human teacher to deliver
an optimal experience to many students with heterogeneous knowledge profiles who
all need different problems and immediate feedback.

### 3. Most edtech does not actually leverage these findings.

Check any off-the-shelf edtech system against the strategies above and you'll be
surprised how few it uses:

- Many don't scaffold content into bite-sized pieces.
- Many let students advance without demonstrating prerequisite knowledge.
- Many do no spaced review — often no review at all.

And some only *appear* to leverage a finding, via corner-cutting:

- Bite-sized content achieved by **watering it down** — cherry-picking the
  simplest cases and skipping content a standard textbook would cover.
- "Prerequisite lessons" that don't actually **measure mastery** — watching a
  video or attempting some problems isn't mastery; the student has to get
  *representative* problems right.
- "Help when struggling" that just **lowers the bar** (giving away hints), when
  what's needed is to strengthen the weakness so the student clears the bar fully
  and independently next attempt.

Edtech is still the way forward — optimal teaching is an inhuman amount of work
and technology is needed — but you can't take these claims at face value. Some
systems genuinely work, shockingly well; many don't.

### 4. Even with the ideal system, you must hold students accountable.

Suppose you had the Platonic ideal of an edtech system. Can you just put a
student on it and expect learning? No — that only works for exceptionally
motivated students. Most students need a responsible adult (parent or teacher) to
incentivize them and hold them accountable.

The common failure: adult puts student on the system → student goofs off (e.g.
YouTube) → adult checks in, sees no progress → student says the system is "too
hard" or "doesn't work" → adult takes it at face value, or the student does the
bare minimum to *look* busy.

What needs to happen instead:

- The adult sits down next to the student and makes them put forth real effort.
- Once it's clear the student *can* progress with sufficient effort, the adult
  keeps holding them accountable for daily progress, re-engaging whenever
  progress stalls.
- To avoid sitting there constantly, the adult sets up an **incentive
  structure** — even small ("finish this week's work → ice cream on the
  weekend," "no video games until your work is done"), centered on something the
  student actually cares about.

Even a truly optimal system produces worse outcomes if the adult clocks out and
stops holding the student accountable every day.
