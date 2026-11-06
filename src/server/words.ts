import 'server-only'
import { z } from 'zod'
import { CHOICES, METRICS, RULES } from '@/lib/rollout'
import { fallbackWords, stampFacts } from '@/lib/report'
import type { LaunchData, Session, SkillResult, Strength } from '@/lib/types'
import { hasAnthropic, structured, text } from './ai'

// ---------- Setup: rephrase the deterministic draft ----------

const StrengthsSchema = z.object({
  strengths: z.array(z.object({ id: z.string(), label: z.string(), application: z.string(), from: z.string() })),
})

export async function rephraseStrengths(draft: Strength[], background: string, proud: string): Promise<{ strengths: Strength[]; source: 'ai' | 'fallback' }> {
  if (!hasAnthropic()) return { strengths: draft, source: 'fallback' }
  try {
    const out = await structured({
      schema: StrengthsSchema,
      temperature: 0.3,
      maxOutputTokens: 800,
      instructions: `You polish a draft list of a learner's transferable strengths for AI deployment work. Keep the same ids and the same number of items. For each:
- label: 2–6 words, a concrete skill.
- application: one sentence starting with a verb, how it helps in AI deployment work.
- from: a short verbatim quote (max 12 words) of HER OWN words below that supports it. Copy exactly.
Never assume anything from gender or from a degree name alone. Don't add strengths that her words don't support. Plain, warm language.`,
      prompt: `Her background: "${background}"\nSomething she's proud of: "${proud}"\n\nDraft:\n${JSON.stringify(draft)}`,
    })
    const both = `${background} ${proud}`.toLowerCase()
    const merged = draft.map((d) => {
      const r = out.strengths.find((x) => x.id === d.id)
      if (!r) return d
      const fromOk = r.from && both.includes(r.from.toLowerCase().replace(/^["“]|["”]$/g, ''))
      return { id: d.id, label: r.label.slice(0, 60) || d.label, application: r.application.slice(0, 180) || d.application, from: fromOk ? r.from.replace(/^["“]|["”]$/g, '') : d.from }
    })
    return { strengths: merged, source: 'ai' }
  } catch {
    return { strengths: draft, source: 'fallback' }
  }
}

// ---------- Rollout feedback ----------

export async function rolloutFeedback(d: Omit<NonNullable<LaunchData['decision']>, 'feedback' | 'feedbackSource' | 'at'>, s: Session): Promise<{ feedback: string; source: 'ai' | 'fallback' }> {
  const notes = d.computed.notes.join(' ')
  const choice = CHOICES.find((c) => c.key === d.choice)!
  const fallback = () => {
    const lead =
      d.choice === 'limited_pilot'
        ? 'A reviewed pilot lets real applicants test the assistant while a caseworker still checks every recommendation.'
        : d.choice === 'full_automation'
          ? 'Five passing tests don’t show the assistant is ready to send recommendations on its own, and Maya’s team needs to approve each one.'
          : 'Holding is a defensible call when the evidence is thin; the question is what you’d need to see to start a careful pilot.'
    return `${lead} ${notes}`.trim()
  }
  if (!hasAnthropic()) return { feedback: fallback(), source: 'fallback' }
  try {
    const premortem = s.launch.premortem?.checked ? `She spotted ${d.computed.premortemSpotted} of 4 untested situations in her pre-mortem.` : 'She skipped the pre-mortem.'
    const body = await text({
      temperature: 0.3,
      maxOutputTokens: 300,
      instructions: `You are Nia, a warm DeployHER coach. Respond to a learner's rollout decision for a fictional nonprofit's program-matching assistant in 2–3 short sentences, second person. Respond to her reasoning and pre-mortem. A well-argued choice other than a pilot gets nuance, not a scolding. Never claim the system is production-safe or ready. No lists, no markdown. Do not restate the checklist; it is appended after your words.`,
      prompt: `Choice: ${choice.short} (${choice.text}).\nHer reason: ${d.rationale ? `"${d.rationale}"` : '(none given)'}\nMetrics: ${d.metrics.map((m) => METRICS.find((x) => x.key === m)?.text).join('; ') || 'none'}\nRules: ${d.rules.map((r) => RULES.find((x) => x.key === r)?.text).join('; ') || 'none'}\n${premortem}\nCaseworker approval kept: ${d.computed.approvalKept ? 'yes' : 'no'}.`,
    })
    const clean = body.replace(/[*#_`]/g, '').trim()
    return { feedback: notes ? `${clean} ${notes}` : clean, source: 'ai' }
  } catch {
    return { feedback: fallback(), source: 'fallback' }
  }
}

// ---------- Report words ----------

const ReportSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  nextSteps: z.array(z.string()).min(2).max(3),
})

export async function reportWords(s: Session, skills: SkillResult[]): Promise<{ headline: string; summary: string; nextSteps: string[]; source: 'ai' | 'fallback' }> {
  const fb = fallbackWords(s, skills)
  if (!hasAnthropic()) return { ...fb, source: 'fallback' }
  const confirmed = s.setup?.confirmed ? s.setup : null
  try {
    const out = await structured({
      schema: ReportSchema,
      temperature: 0.3,
      maxOutputTokens: 600,
      instructions: `You write the words of a learner's DeployHER skills report. Every status and number below was computed in code; never change or contradict them, and never invent achievements.
- headline: second person, under 10 words, specific to what she did (e.g. "You caught the schedule bug before it reached anyone").
- summary: 2–3 sentences, second person, warm and honest. ${confirmed ? 'You may mention her background strengths briefly.' : 'Do not mention her background.'}
- nextSteps: 2–3 concrete next things to practice.
Honest about limits: this is practice, not proof. No markdown.`,
      prompt: JSON.stringify({
        stamps: stampFacts(s),
        skills: skills.map((k) => ({ skill: k.label, status: k.status, why: k.explanation })),
        strengths: confirmed?.strengths.map((x) => x.label) ?? null,
        skipped: s.skipped,
      }),
    })
    const headline = out.headline.split(/\s+/).length < 10 ? out.headline.replace(/[*#_`"]/g, '').trim() : fb.headline
    return { headline, summary: out.summary.replace(/[*#_`]/g, '').trim(), nextSteps: out.nextSteps.slice(0, 3), source: 'ai' }
  } catch {
    return { ...fb, source: 'fallback' }
  }
}
