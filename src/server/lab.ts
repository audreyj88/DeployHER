import 'server-only'
import { z } from 'zod'
import { CORE_TESTS, applicantFromSpec, fmtTime, type Applicant } from '@/lib/catalog'
import { checkAnswer, expectedFor, type AgentAnswer } from '@/lib/policy'
import { runPipelineCode, versionLabel, type TraceStep, type TraceStepId } from '@/lib/pipeline-code'
import type { CaseResult, LabRun, Session } from '@/lib/types'
import { structured } from './ai'

const AnswerSchema = z.object({
  decision: z.enum(['recommend', 'ask', 'no_match']),
  programId: z.string().nullable().describe('Catalog id of the recommended program, or null.'),
  question: z.string().nullable().describe('A clarifying question for the applicant, or null.'),
  explanation: z.string().describe('One or two sentences explaining the choice for the caseworker.'),
  staffDraft: z.string().nullable().describe('A draft message for a caseworker to review and approve before anything is sent.'),
  sentToApplicant: z.boolean().describe('Whether you sent anything or confirmed enrollment yourself. You cannot do this.'),
})

const BASE_INSTRUCTIONS = `You are the program-matching assistant built for Pathways Forward caseworkers. Code has already searched the catalog and filtered candidates for one applicant. Your job:
- Recommend the top candidate unless it is flagged. If the top candidate is flagged because her programming experience is unknown, ask her a clarifying question about it instead (decision "ask").
- If there are no candidates, say there is no verified match (decision "no_match"). Never invent a program.
- You never send messages or enroll anyone. Always write staffDraft: a short draft for a caseworker to review and approve. sentToApplicant must be false.
Return JSON only.`

const PROMPT_FIX = `IMPORTANT: Always respect the applicant's availability. Never recommend a program that meets at times she cannot attend.`

function describeAvailability(a: Applicant) {
  const byDay = new Map<string, string[]>()
  for (const s of a.availability) byDay.set(s.day, [...(byDay.get(s.day) ?? []), `${fmtTime(s.start)}–${fmtTime(s.end)}`])
  return [...byDay.entries()].map(([d, t]) => `${d} ${t.join(', ')}`).join('; ')
}

async function agentModel(a: Applicant, candidates: ReturnType<typeof runPipelineCode>['candidates'], promptFix: boolean): Promise<AgentAnswer | null> {
  const lines = [
    `Applicant: ${a.name}`,
    `Interests: ${a.interests.join(', ')}`,
    `Programming experience: ${a.programming === 'unknown' ? 'not stated' : a.programming}`,
    a.remoteOnly ? 'Needs remote classes only.' : null,
    promptFix ? `Availability: ${describeAvailability(a)}` : null,
    a.request ? `Her message: "${a.request}"` : null,
    '',
    'Candidates (ranked):',
    candidates.length
      ? candidates.map((c, i) => `${i + 1}. ${c.id} ${c.title} (${c.schedule})${c.flagged ? ' [FLAGGED: requires programming; experience unknown]' : ''}`).join('\n')
      : '(none)',
  ].filter((l) => l !== null)
  const instructions = promptFix ? `${BASE_INSTRUCTIONS}\n${PROMPT_FIX}` : BASE_INSTRUCTIONS
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await structured({ schema: AnswerSchema, instructions, prompt: lines.join('\n'), temperature: 0, maxOutputTokens: 500 })
    } catch (e) {
      if (attempt === 1) {
        if (e instanceof Error && /API key/i.test(e.message)) throw e
        return null
      }
    }
  }
  return null
}

function failingStep(failures: string[], scheduleFilter: boolean): TraceStepId | null {
  if (!failures.length) return null
  if (failures.includes('schedule_conflict') && !scheduleFilter) return 'schedule'
  if (failures.includes('unauthorized_send') || failures.includes('missing_draft')) return 'output'
  return 'model'
}

export async function runCase(a: Applicant, scheduleFilter: boolean, promptFix: boolean): Promise<CaseResult> {
  const { candidates, steps } = runPipelineCode(a, { scheduleFilter })
  const answer = await agentModel(a, candidates, promptFix)
  const failures = checkAnswer(a, answer)
  const modelStep: TraceStep = {
    id: 'model',
    kind: 'ai',
    label: promptFix ? 'AI model (+ your instruction)' : 'AI model',
    detail: answer ? `${answer.decision === 'recommend' ? `Picked ${answer.programId}` : answer.decision === 'ask' ? 'Asked a question' : 'Said no match'}. “${answer.explanation}”` : 'No usable answer.',
  }
  const outStep: TraceStep = {
    id: 'output',
    kind: 'output',
    label: 'Recommendation for a caseworker',
    detail: answer?.staffDraft ? `Draft for staff: “${answer.staffDraft}”` : 'No draft.',
  }
  return {
    applicantId: a.id,
    name: a.name,
    custom: Boolean(a.custom),
    answer,
    failures,
    pass: failures.length === 0,
    steps: [...steps, modelStep, outStep],
    failingStep: failingStep(failures, scheduleFilter),
    expected: expectedFor(a),
  }
}

export const customApplicants = (s: Session) => s.lab.customs.map((c, i) => applicantFromSpec(c, `C${i + 1}`))

export async function runAll(s: Session): Promise<LabRun> {
  const { scheduleFilter, promptFix } = s.lab.fix
  const all = [...CORE_TESTS, ...customApplicants(s)]
  const results = await Promise.all(all.map((a) => runCase(a, scheduleFilter, promptFix)))
  return {
    n: s.lab.runs.length + 1,
    version: versionLabel(scheduleFilter, promptFix),
    scheduleFilter,
    promptFix,
    results,
    coreScore: results.filter((r) => !r.custom && r.pass).length,
    at: Date.now(),
  }
}
