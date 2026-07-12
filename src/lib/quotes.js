export const QUOTES = [
  "Small steps, repeated daily, outrun rare bursts of effort.",
  "Start before you feel ready — readiness comes from starting.",
  "The work you avoid loudest is usually the work that matters most.",
  "Discipline is choosing between what you want now and what you want most.",
  "A quiet hour of focus beats a loud day of busyness.",
  "You don't need more time — you need fewer distractions.",
  "Momentum is built one finished task at a time.",
  "Done is a decision, not an accident.",
  "The desk doesn't care how you feel — sit down anyway.",
  "Progress hides inside boring, repeated effort.",
  "Future you is built entirely out of today's choices.",
  "Rest is part of the work, not a break from it.",
  "Clarity comes from doing, not from thinking about doing.",
  "One page, one problem, one step — that's the whole method.",
  "You are always one focused hour away from momentum.",
  "Consistency turns average effort into extraordinary results.",
  "The first five minutes are the only hard part.",
  "Nobody feels like it. They just do it anyway.",
  "Every session you finish makes the next one easier to start.",
  "Effort compounds quietly, then all at once.",
  "Your streak isn't about perfection — it's about returning.",
  "Small, unglamorous work is what most success is made of.",
  "Show up for the version of you that's still becoming.",
  "The desk remembers everyone who kept coming back."
]

export function randomQuote(excludeIdx = -1) {
  let i
  do { i = Math.floor(Math.random() * QUOTES.length) } while (i === excludeIdx && QUOTES.length > 1)
  return { text: QUOTES[i], idx: i }
}
