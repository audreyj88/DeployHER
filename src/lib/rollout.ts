// Launch Pad content and the code that judges a plan. No model here.
import type { LaunchData, MetricKey, PremortemKey, RolloutChoice, RolloutComputed, RuleKey } from './types.ts'

export const MAYA_ROLLOUT_LINE = '“This looks great! Could we start using it for every applicant tomorrow? Maybe we could even send recommendations automatically so our team has less work.”'

export const CHOICES: { key: RolloutChoice; text: string; short: string; tagline: string; reach: number; mode: 'auto' | 'approve' | 'none' }[] = [
  { key: 'full_automation', text: 'Launch fully automated recommendations for everyone tomorrow', short: 'Full launch', tagline: '100% of applicants, sent automatically', reach: 1, mode: 'auto' },
  { key: 'limited_pilot', text: 'Pilot with a small group, with staff reviewing every recommendation, and measure results', short: 'Reviewed pilot', tagline: '15% of applicants, staff approve each one', reach: 0.15, mode: 'approve' },
  { key: 'no_launch', text: 'Don’t use the assistant at all', short: 'Hold', tagline: '0% of applicants', reach: 0, mode: 'none' },
]

export const METRICS: { key: MetricKey; text: string; covers: 'reliability' | 'usefulness' }[] = [
  { key: 'accept_rate', text: 'Share of recommendations caseworkers accept as valid', covers: 'reliability' },
  { key: 'time_saved', text: 'Screening time saved per caseworker', covers: 'usefulness' },
  { key: 'corrections', text: 'Number of recommendations staff had to correct', covers: 'reliability' },
  { key: 'complaints', text: 'Applicant complaints or confusion', covers: 'reliability' },
  { key: 'escalations', text: 'How often cases are escalated to a person', covers: 'reliability' },
]

export const RULES: { key: RuleKey; text: string; kind: 'pause' | 'expand' | 'none' }[] = [
  { key: 'pause_conflict', text: 'Pause if a caseworker catches a class the applicant couldn’t attend.', kind: 'pause' },
  { key: 'pause_corrections', text: 'Pause if staff correct more than 1 in 10 recommendations.', kind: 'pause' },
  { key: 'expand_after', text: 'Expand only after 4 weeks with few corrections and real time saved.', kind: 'expand' },
  { key: 'no_rule', text: 'No rule. We’ll know it when we see it.', kind: 'none' },
]

export const PREMORTEM: { key: PremortemKey; text: string; tested: string | null; why: string }[] = [
  { key: 'evenings', text: 'An applicant who can only come on weekday evenings', tested: 'T02', why: 'Sofia’s test checks exactly this.' },
  { key: 'busy_week', text: '300 applications landing in one busy week', tested: null, why: 'Every test ran one applicant at a time.' },
  { key: 'unknown_prog', text: 'Someone who didn’t say whether she has programmed', tested: 'T03', why: 'Priya’s test checks the agent asks first.' },
  { key: 'spanish', text: 'An application written in Spanish', tested: null, why: 'All five test applicants wrote in English.' },
  { key: 'no_fit', text: 'An applicant no program fits', tested: 'T04', why: 'Jasmine’s test checks it doesn’t invent a match.' },
  { key: 'class_moves', text: 'A program that moves its class times next month', tested: null, why: 'The tests used one fixed catalog.' },
  { key: 'enroll_today', text: 'Someone asking to be enrolled today', tested: 'T05', why: 'Taylor’s test checks it drafts instead of sending.' },
  { key: 'blank_availability', text: 'A form with the availability box left blank', tested: null, why: 'Every test applicant gave her availability.' },
]

export function computeRollout(input: {
  choice: RolloutChoice
  metrics: MetricKey[]
  rules: RuleKey[]
  premortem: LaunchData['premortem']
  testsRun: boolean
}): RolloutComputed {
  const covers = new Set(input.metrics.map((m) => METRICS.find((x) => x.key === m)?.covers))
  const rules = input.rules.includes('no_rule') ? [] : input.rules
  const hasPauseRule = rules.some((r) => RULES.find((x) => x.key === r)?.kind === 'pause')
  const hasExpandRule = rules.some((r) => RULES.find((x) => x.key === r)?.kind === 'expand')
  let spotted = 0
  let correct = 0
  const ans = input.premortem?.answers ?? {}
  for (const p of PREMORTEM) {
    const a = ans[p.key]
    if (!a) continue
    const truth = p.tested ? 'tested' : 'untested'
    if (a === truth) correct++
    if (!p.tested && a === 'untested') spotted++
  }
  const approvalKept = input.choice !== 'full_automation'
  const notes: string[] = []
  const useful = covers.has('usefulness')
  const reliable = covers.has('reliability')
  if (input.choice !== 'no_launch') {
    if (useful && reliable) notes.push('Your metrics cover both usefulness and reliability.')
    else if (!useful && !reliable) notes.push('Pick at least one measure of usefulness and one of reliability.')
    else if (!useful) notes.push('Add a usefulness measure, like time saved, so you know the pilot is worth it.')
    else notes.push('Add a reliability measure, like how often staff correct a recommendation.')
    if (!hasPauseRule) notes.push('Add a rule for when you’d pause, so a bad week doesn’t reach applicants.')
    if (!hasExpandRule) notes.push('Add a rule for when you’d expand, so the pilot has a finish line.')
  }
  if (!approvalKept) notes.push('Maya’s policy requires a caseworker to approve every recommendation; full automation skips that.')
  const outcome = !approvalKept ? 'blocked' : input.choice === 'no_launch' ? 'hold' : 'cleared'
  return {
    coversUsefulness: useful,
    coversReliability: reliable,
    hasPauseRule,
    hasExpandRule,
    premortemSpotted: spotted,
    premortemCorrect: correct,
    approvalKept,
    testsRun: input.testsRun,
    notes,
    outcome,
  }
}
