import 'server-only'
import crypto from 'node:crypto'
import { z } from 'zod'
import type { Evidence, Grade, RubricScore, Session, Turn } from '@/lib/types'
import { structured, type Msg } from './ai'
import { FACT_IDS, FACTS, MAYA_PERSONA, OPENER, RUBRIC } from './scenario'

export const MAX_QUESTIONS = 14
export const MIN_QUESTIONS = 2

export const learnerCount = (turns: Turn[]) => turns.filter((t) => t.role === 'learner').length

export function ensureOpener(s: Session) {
  if (!s.interview.turns.length) s.interview.turns.push({ id: 't1', role: 'client', text: OPENER, opener: true })
}

export function addTurn(s: Session, role: Turn['role'], text: string): Turn {
  const t: Turn = { id: `t${s.interview.turns.length + 1}`, role, text: text.trim() }
  s.interview.turns.push(t)
  return t
}

const MayaReply = z.object({
  reply: z.string().describe('What Maya says out loud. 1–4 short sentences, no lists, no markdown.'),
  revealedFactIds: z.array(z.enum(FACT_IDS as [string, ...string[]])).max(2).describe('Hidden fact ids this reply discloses (0–2).'),
})

export async function mayaTypedReply(turns: Turn[]) {
  const messages: Msg[] = []
  for (const t of turns) {
    // The opener is Maya's; the conversation must begin with a user message for the API.
    if (t.opener) continue
    messages.push({ role: t.role === 'learner' ? 'user' : 'assistant', content: t.text })
  }
  const out = await structured({
    schema: MayaReply,
    instructions: `${MAYA_PERSONA}\n\nYou already opened the meeting by saying: "${OPENER}"\nReturn JSON with your reply and the ids of any hidden facts that reply discloses.`,
    messages,
    temperature: 0.6,
    maxOutputTokens: 400,
  })
  return { reply: out.reply.replace(/[*_#`]/g, '').trim(), revealed: out.revealedFactIds.slice(0, 2) }
}

// ---------- Grading ----------

const GradeSchema = z.object({
  rubric: z
    .array(
      z.object({
        key: z.enum(['problem', 'workflow', 'constraints', 'metrics', 'stakeholders']),
        score: z.number(),
        explanation: z.string(),
        evidence: z.array(z.object({ turnId: z.string(), quote: z.string() })).max(3),
      }),
    )
    .length(5),
  strengths: z.array(z.string()).max(3),
  improvements: z.array(z.string()).max(3),
  betterQuestions: z.array(z.string()).max(3),
  discoveredFacts: z.array(z.object({ factId: z.string(), turnId: z.string() })),
})

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const stripIds = (s: string) =>
  s
    .replace(/\(?\b(turn\s*)?t\d+\b\)?/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:])/g, '$1')
    .trim()

export function transcriptForModel(turns: Turn[]) {
  return turns.map((t) => `[${t.id}] ${t.role === 'learner' ? 'Consultant' : 'Maya'}${t.opener ? ' (scripted opener)' : ''}: ${t.text}`).join('\n')
}

export const transcriptHash = (turns: Turn[]) => 'tx_' + crypto.createHash('sha256').update(JSON.stringify(turns.map((t) => [t.id, t.role, t.text]))).digest('hex').slice(0, 10)

export async function gradeTranscript(turns: Turn[], typedRevealed: Record<string, string[]>): Promise<Grade> {
  const rubricText = RUBRIC.map((r) => `- ${r.key} (${r.label}, 0–${r.max}): ${r.earns}`).join('\n')
  const factText = FACTS.map((f) => `- ${f.id}: ${f.fact}`).join('\n')
  const out = await structured({
    schema: GradeSchema,
    temperature: 0,
    maxOutputTokens: 2500,
    instructions: `You grade a practice client-discovery interview for DeployHER, a learning simulation. The consultant interviewed Maya Chen (a fictional nonprofit director) who asked for "a chatbot".

Rubric (score each dimension within its range):
${rubricText}

Hidden facts Maya could disclose:
${factText}

Rules:
- Grade only what the consultant actually asked and did in the transcript. Judge the substance of the questions.
- Never penalise style, accent, fluency, grammar, transcription errors or length.
- For each dimension cite evidence: the turn id and a verbatim quote of 3–15 consecutive words copied exactly from that turn. Use the consultant's turns whenever possible. If there is no evidence, give 0 and cite nothing.
- discoveredFacts: list a fact only if one of Maya's replies (not the scripted opener) actually disclosed it, with that reply's turn id.
- strengths, improvements, betterQuestions: at most 3 each, short, second person ("You asked…"). betterQuestions are questions she could ask next time, written as the question itself.
- Never mention turn ids (like t3) in any prose field.`,
    prompt: `Transcript:\n${transcriptForModel(turns)}`,
  })

  const byId = new Map(turns.map((t) => [t.id, t]))
  const rubric: RubricScore[] = RUBRIC.map((r) => {
    const row = out.rubric.find((x) => x.key === r.key)
    let score = Math.max(0, Math.min(r.max, Math.round(row?.score ?? 0)))
    const evidence: Evidence[] = []
    for (const e of row?.evidence ?? []) {
      const t = byId.get(e.turnId)
      const words = norm(e.quote).split(' ').filter(Boolean)
      if (!t || words.length < 3 || words.length > 15) continue
      if (!norm(t.text).includes(norm(e.quote))) continue
      evidence.push({ turnId: t.id, quote: e.quote.trim().replace(/^["“]|["”]$/g, '') })
    }
    let removed = false
    if (score > 0 && evidence.length === 0) {
      score = 0
      removed = true
    }
    return { key: r.key, label: r.label, max: r.max, score, explanation: stripIds(row?.explanation ?? ''), evidence, evidenceRemoved: removed }
  })

  const isRealClient = (id: string) => {
    const t = byId.get(id)
    return Boolean(t && t.role === 'client' && !t.opener)
  }
  const discovered = new Set<string>()
  for (const d of out.discoveredFacts) if (FACT_IDS.includes(d.factId) && isRealClient(d.turnId)) discovered.add(d.factId)
  for (const [turnId, ids] of Object.entries(typedRevealed)) if (isRealClient(turnId)) ids.forEach((id) => FACT_IDS.includes(id) && discovered.add(id))

  return {
    transcriptId: transcriptHash(turns),
    rubric,
    total: rubric.reduce((a, r) => a + r.score, 0),
    strengths: out.strengths.slice(0, 3).map(stripIds),
    improvements: out.improvements.slice(0, 3).map(stripIds),
    betterQuestions: out.betterQuestions.slice(0, 3).map(stripIds),
    discoveredFacts: FACT_IDS.filter((id) => discovered.has(id)),
    gradedAt: Date.now(),
  }
}
