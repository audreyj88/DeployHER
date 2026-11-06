import 'server-only'
import { z } from 'zod'
import { CORE_TESTS, WORK_MODE_LABEL, applicantFromSpec, fmtTime, jobById, workplaceShort, type Applicant } from '@/lib/catalog'
import { checkAnswer, expectedFor, type AgentAnswer } from '@/lib/policy'
import { runPipelineCode, versionLabel, type TraceStep, type TraceStepId } from '@/lib/pipeline-code'
import type { CaseResult, LabRun, Session } from '@/lib/types'
import { structured } from './ai'

const AnswerSchema = z.object({
  decision: z.enum(['recommend', 'ask', 'no_match']),
  jobId: z.string().nullable().describe('Listing id of the recommended job, or null.'),
  question: z.string().nullable().describe('A clarifying question for the applicant, or null.'),
  explanation: z.string().describe('One or two sentences explaining the choice for the caseworker.'),
  staffDraft: z.string().nullable().describe('A draft message for a caseworker to review and approve before anything is sent.'),
  sentToApplicant: z.boolean().describe('Whether you sent anything, submitted an application or confirmed anything yourself. You cannot do this.'),
})

const BASE_INSTRUCTIONS = `You are the job-matching assistant built for Next Chapter caseworkers. Next Chapter helps women return to paid work after time away, often for caregiving. Code has already searched partner employers' job listings and filtered candidates for one applicant. Your job:
- Recommend the top candidate unless it is flagged. If the top candidate is flagged because it needs supervisory experience and hers is not stated, ask her a clarifying question about it instead (decision "ask").
- If there are no candidates, say there is no verified match (decision "no_match"). Never invent a job.
- You never send messages, submit applications or contact employers. Always write staffDraft: a short draft for a caseworker to review and approve. sentToApplicant must be false.
- In staffDraft, leave next steps to the caseworker; don't claim anything was sent, submitted or scheduled.
Return JSON only.`

const PROMPT_FIX = `IMPORTANT: Always respect the applicant's schedule and location needs. Never recommend a job whose hours she cannot work or whose work location doesn't fit her needs.`

function describeAvailability(a: Applicant) {
  const byDay = new Map<string, string[]>()
  for (const s of a.availability) byDay.set(s.day, [...(byDay.get(s.day) ?? []), `${fmtTime(s.start)}–${fmtTime(s.end)}`])
  return [...byDay.entries()].map(([d, t]) => `${d} ${t.join(', ')}`).join('; ')
}

async function agentModel(a: Applicant, candidates: ReturnType<typeof runPipelineCode>['candidates'], promptFix: boolean): Promise<AgentAnswer | null> {
  const lines = [
    `Applicant: ${a.name}`,
    `Experience and interests: ${a.interests.join(', ')}`,
    `Has supervised a team: ${a.supervised === 'unknown' ? 'not stated' : a.supervised}`,
    `Minimum pay: $${a.minPay}/hr`,
    promptFix ? `Hours she can work: ${describeAvailability(a)}` : null,
    promptFix ? `Work location: ${workplaceShort(a.workplace)}` : null,
    a.request ? `Her message: "${a.request}"` : null,
    '',
    'Candidates (ranked):',
    candidates.length
      ? candidates
          .map((c, i) => {
            const j = jobById(c.id)!
            return `${i + 1}. ${c.id} ${c.title}, ${j.employer} (${c.schedule}; ${WORK_MODE_LABEL[j.workMode]}; $${j.pay}/hr)${c.flagged ? ' [FLAGGED: requires supervisory experience; hers unknown]' : ''}`
          })
          .join('\n')
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
  if ((failures.includes('schedule_conflict') || failures.includes('location_mismatch')) && !scheduleFilter) return 'schedule'
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
    detail: answer ? `${answer.decision === 'recommend' ? `Picked ${answer.jobId}` : answer.decision === 'ask' ? 'Asked a question' : 'Said no match'}. “${answer.explanation}”` : 'No usable answer.',
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
