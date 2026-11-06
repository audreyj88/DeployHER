// Skill statuses and report facts, computed in code from the session. The model only words them.
import { CHOICES } from './rollout.ts'
import type { EvidenceRef, LabRun, Session, SkillResult, SkillStatus } from './types.ts'

export const STATUS_META: Record<SkillStatus, { label: string; color: string; glow: number; rung: string }> = {
  demonstrated_independently: { label: 'Demonstrated independently', color: '#16A34A', glow: 2.6, rung: 'You did it on your own' },
  demonstrated_with_help: { label: 'Demonstrated with help', color: '#0EA5A4', glow: 2.1, rung: 'You got there with a hint' },
  practiced: { label: 'Practiced', color: '#D97706', glow: 1.6, rung: 'You tried it; it’s practice, not proof' },
  not_yet_demonstrated: { label: 'Not yet demonstrated', color: '#64748B', glow: 0.6, rung: 'Learned about it, not shown yet' },
  not_assessed: { label: 'Not assessed', color: '#94A3B8', glow: 0.12, rung: 'Not assessed' },
}

/** Lectern/book colors in the library. */
export const BOOK_COLOR: Record<SkillStatus, string> = {
  demonstrated_independently: '#22C55E',
  demonstrated_with_help: '#14B8A6',
  practiced: '#F59E0B',
  not_yet_demonstrated: '#94A3B8',
  not_assessed: '#CBD5E1',
}

/** Roles that lean on the people skills practiced here; most don't require coding. */
export const CAREERS = [
  'AI implementation specialist',
  'AI solutions consultant',
  'AI adoption & change lead',
  'AI program manager',
  'Customer success manager (AI products)',
  'AI enablement & training specialist',
  'AI evaluation & quality analyst',
  'Responsible AI & policy analyst',
  'AI deployment strategist',
  'Forward-deployed PM',
]

export const CAREERS_INTRO = 'Most of these roles don’t require coding. They need what you practiced today: asking good questions, understanding the people a tool serves, checking AI work, and making careful launch calls.'
export const CAREERS_TECHNICAL = 'Enjoyed the technical side? Forward-deployed engineering is a great path to grow into.'

export const CAVEAT = 'Introductory simulation; not professional certification.'

const learnerQuestionNo = (s: Session, turnId: string) => {
  let n = 0
  for (const t of s.interview.turns) {
    if (t.role === 'learner') n++
    if (t.id === turnId) return t.role === 'learner' ? n : null
  }
  return null
}

function quoteRef(s: Session, turnId: string, quote: string): EvidenceRef {
  const q = learnerQuestionNo(s, turnId)
  return q ? { kind: 'question', label: `You asked (question ${q})`, text: quote } : { kind: 'client', label: 'Maya said', text: quote }
}

export const firstRun = (s: Session): LabRun | undefined => s.lab.runs[0]
export const lastRun = (s: Session): LabRun | undefined => s.lab.runs[s.lab.runs.length - 1]
const t02 = (r: LabRun) => r.results.find((x) => x.applicantId === 'T02')

export function computeSkills(s: Session): SkillResult[] {
  const skipped = (id: string) => s.skipped.includes(id as never)
  const g = s.grade
  const out: SkillResult[] = []

  // Discovery
  if (skipped('interview') || !g) {
    out.push({ key: 'discovery', label: 'Client discovery', status: 'not_assessed', explanation: 'The client interview was skipped or not scored.', evidence: [] })
  } else {
    const p = g.rubric.find((r) => r.key === 'problem')!
    const pct = p.score / p.max
    const status: SkillStatus = pct >= 0.6 ? 'demonstrated_independently' : p.score > 0 ? 'practiced' : 'not_yet_demonstrated'
    out.push({
      key: 'discovery',
      label: 'Client discovery',
      status,
      explanation: `Problem diagnosis scored ${p.score}/${p.max} in the interview grade.`,
      evidence: p.evidence.map((e) => quoteRef(s, e.turnId, e.quote)),
    })
  }

  // Finding constraints
  if (skipped('interview') || !g) {
    out.push({ key: 'constraints', label: 'Finding hard constraints', status: 'not_assessed', explanation: 'The client interview was skipped or not scored, so constraints were learned from the brief.', evidence: [] })
  } else {
    const found = ['schedule', 'location', 'pay'].some((f) => g.discoveredFacts.includes(f))
    const c = g.rubric.find((r) => r.key === 'constraints')!
    out.push({
      key: 'constraints',
      label: 'Finding hard constraints',
      status: found ? 'demonstrated_independently' : 'not_yet_demonstrated',
      explanation: found ? 'You got Maya to tell you about applicants’ hours, location or pay needs during the interview.' : 'Applicants’ hours, location and pay needs didn’t come up in the interview; you learned them in the debrief.',
      evidence: c.evidence.map((e) => quoteRef(s, e.turnId, e.quote)),
    })
  }

  // Evaluating output
  const spot = s.lab.spot
  const first = firstRun(s)
  if (skipped('lab') || !spot) {
    out.push({ key: 'evaluating', label: 'Evaluating AI outputs', status: 'not_assessed', explanation: 'You didn’t judge the agent’s first answer for Sofia.', evidence: [] })
  } else {
    const status: SkillStatus = spot.correct ? (spot.hint ? 'demonstrated_with_help' : 'demonstrated_independently') : 'practiced'
    const ev: EvidenceRef[] = []
    const r = first && t02(first)
    if (r) ev.push({ kind: 'test', label: 'Test T02 Sofia', text: `school hours, remote or short commute, $25/hr minimum · agent ${r.answer?.jobId ? `recommended ${r.answer.jobId}` : 'gave no job'} · ${r.pass ? 'right' : 'wrong'}` })
    out.push({
      key: 'evaluating',
      label: 'Evaluating AI outputs',
      status,
      explanation: spot.correct ? `You judged Sofia’s result correctly${spot.hint ? ' after a hint' : ' without a hint'}.` : 'Your first judgment of Sofia’s result didn’t match the client’s rules.',
      evidence: ev,
    })
  }

  // Improving reliability
  if (skipped('lab') || !s.lab.runs.length) {
    out.push({ key: 'reliability', label: 'Improving reliability', status: 'not_assessed', explanation: 'No lab runs to assess.', evidence: [] })
  } else {
    const fixedByCheck = s.lab.runs.find((r) => r.scheduleFilter && t02(r)?.pass)
    const fixedByPrompt = s.lab.runs.find((r) => !r.scheduleFilter && r.promptFix && t02(r)?.pass)
    const status: SkillStatus = fixedByCheck ? 'demonstrated_independently' : fixedByPrompt ? 'demonstrated_with_help' : 'practiced'
    const ev: EvidenceRef[] = s.lab.runs.slice(-2).map((r) => ({ kind: 'run', label: `Test run ${r.n} ${r.version}`, text: `${r.coreScore}/5 tests passed` }))
    out.push({
      key: 'reliability',
      label: 'Improving reliability',
      status,
      explanation: fixedByCheck
        ? 'You added a schedule & location check in code, and Sofia’s test passed on the rerun.'
        : fixedByPrompt
          ? 'An instruction to the AI made Sofia’s test pass, but nothing guarantees it holds for the next applicant.'
          : 'You ran the tests; the bug that sent Sofia a full-time, on-site job wasn’t fixed yet.',
      evidence: ev,
    })
  }

  // Deployment judgment
  const d = s.launch.decision
  if (skipped('launch') || !d) {
    out.push({ key: 'deployment', label: 'Deployment judgment', status: 'not_assessed', explanation: 'No rollout decision was made.', evidence: [] })
  } else {
    const c = CHOICES.find((x) => x.key === d.choice)!
    const kept = d.computed.approvalKept ? 'kept caseworker approval' : 'skipped caseworker approval'
    out.push({
      key: 'deployment',
      label: 'Deployment judgment',
      status: 'practiced',
      explanation: `Chose ‘${c.short.toLowerCase()}’: ${kept}. Practice only; one simulated decision isn’t proof of production judgment.`,
      evidence: [{ kind: 'rollout', label: 'Launch Pad', text: d.rationale ? `${c.short}: “${d.rationale.slice(0, 140)}”` : c.short }],
    })
  }
  return out
}

/** One stamp fact per room, from real data. */
export function stampFacts(s: Session): Record<'setup' | 'interview' | 'debrief' | 'lab' | 'launch', string | null> {
  const first = firstRun(s)
  const last = lastRun(s)
  const q = s.interview.turns.filter((t) => t.role === 'learner').length
  const d = s.launch.decision
  return {
    setup: s.setup?.confirmed ? `${s.setup.strengths.length} strengths mapped` : null,
    interview: s.skipped.includes('interview') || !s.grade ? null : `${q} questions · ${s.grade.total}/100`,
    debrief: s.skipped.includes('debrief') ? null : 'Read the full client brief',
    lab: s.skipped.includes('lab') || !first || !last ? null : first === last ? `${first.coreScore}/5 tests passed` : `${first.coreScore}/5 → ${last.coreScore}/5 tests passed`,
    launch: s.skipped.includes('launch') || !d ? null : CHOICES.find((c) => c.key === d.choice)!.short,
  }
}

export function fallbackWords(s: Session, skills: SkillResult[]) {
  const ind = skills.filter((k) => k.status === 'demonstrated_independently')
  const reliability = skills.find((k) => k.key === 'reliability')
  const headline =
    reliability?.status === 'demonstrated_independently'
      ? 'You caught the job-fit bug before it reached anyone'
      : ind.length
        ? 'You finished your first deployment mission'
        : 'You walked a full deployment, start to finish'
  const parts: string[] = []
  if (s.grade) parts.push(`You interviewed Maya and scored ${s.grade.total}/100 on discovery.`)
  const l = lastRun(s)
  if (l) parts.push(`Your latest run of Kai’s agent passed ${l.coreScore} of 5 tests.`)
  if (s.launch.decision) parts.push(`At the Launch Pad you chose a ${CHOICES.find((c) => c.key === s.launch.decision!.choice)!.short.toLowerCase()}.`)
  if (!parts.length) parts.push('You explored the mission at your own pace.')
  const next: string[] = []
  if (skills.find((k) => k.key === 'discovery')?.status !== 'demonstrated_independently') next.push('Practice asking “why” twice before talking about solutions.')
  if (reliability?.status !== 'demonstrated_independently') next.push('Rerun the lab and put the schedule and location rules in code, not just in the instructions.')
  next.push('Write three acceptance tests for a tool you use at work or school.')
  return { headline, summary: parts.slice(0, 3).join(' '), nextSteps: next.slice(0, 3) }
}
