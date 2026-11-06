// Deterministic keyword map: her background -> deployment strengths. No assumptions from gender or degree names alone.
import type { AiExperience, Strength } from './types.ts'

interface Rule {
  id: string
  re: RegExp
  label: string
  application: string
}

const RULES: Rule[] = [
  { id: 'probing', re: /interview|research|survey|user stud|focus group|counsel|therap|social work|journalis|report(er|ing)/i, label: 'Asking probing questions', application: 'Uncovering what a client really needs before anyone builds anything.' },
  { id: 'workflow', re: /operation|logistic|schedul|shift|process|coordinat|supply|hospital|clinic|admin|project manag|organi[sz]/i, label: 'Mapping workflows and priorities', application: 'Seeing where time goes in a team’s day and where an AI tool could actually help.' },
  { id: 'evaluation', re: /assess|grading|exam|rubric|test|qa|quality|audit|evaluat|inspect/i, label: 'Judging quality against a standard', application: 'Checking an AI system’s outputs against clear rules, case by case.' },
  { id: 'teaching', re: /teach|tutor|train(ing|er)|coach|mentor|curricul|lesson|educat/i, label: 'Explaining complex ideas simply', application: 'Helping staff understand what an AI tool can and can’t do.' },
  { id: 'numbers', re: /account|financ|bookkeep|budget|data|analy|statist|spreadsheet|excel|econom|math/i, label: 'Careful work with numbers and data', application: 'Defining metrics and spotting when results don’t add up.' },
  { id: 'building', re: /software|engineer|develop|program|cod(e|ing)|python|built|app|pipeline|agent/i, label: 'Building and debugging systems', application: 'Finding exactly where an AI pipeline breaks and fixing it.' },
  { id: 'people', re: /customer|client|patient|nurs|retail|service|sales|support|volunteer|community|nonprofit|care/i, label: 'Understanding the people a tool serves', application: 'Keeping real users in mind when deciding how a tool should roll out.' },
  { id: 'writing', re: /writ|edit|communicat|policy|law|legal|contract|document/i, label: 'Writing clear, precise rules', application: 'Turning a client’s needs into acceptance criteria a system can be tested against.' },
]

const FALLBACK: Rule[] = [
  { id: 'learning', re: /.*/, label: 'Learning new things quickly', application: 'Getting up to speed on a client’s world fast.' },
  { id: 'followthrough', re: /.*/, label: 'Following through on what matters', application: 'Seeing a deployment from first conversation to careful rollout.' },
]

export const PRACTICE_TODAY = ['Client discovery', 'Finding hard constraints', 'Evaluating AI outputs', 'Improving reliability', 'Deployment judgment']

/** Quote the phrase of her own words that triggered a rule. */
function quoteFrom(text: string, re: RegExp): string {
  const parts = text.split(/[,.;\n]|\band\b/i).map((p) => p.trim()).filter(Boolean)
  const hit = parts.find((p) => re.test(p))
  return (hit ?? text.trim()).slice(0, 90)
}

export function draftStrengths(background: string, proud: string, ai: AiExperience | null): Strength[] {
  const both = `${background}\n${proud}`
  const out: Strength[] = []
  for (const r of RULES) {
    if (out.length >= 3) break
    if (r.re.test(both)) {
      const src = r.re.test(background) ? background : proud
      out.push({ id: r.id, label: r.label, application: r.application, from: quoteFrom(src, r.re) })
    }
  }
  if (ai === 'built' && out.length < 3 && !out.some((s) => s.id === 'building')) {
    const b = RULES.find((r) => r.id === 'building')!
    out.push({ id: b.id, label: b.label, application: b.application, from: 'I have built or deployed AI systems' })
  }
  for (const f of FALLBACK) {
    if (out.length >= 2) break
    out.push({ id: f.id, label: f.label, application: f.application, from: (proud || background).trim().slice(0, 90) })
  }
  return out.slice(0, 3)
}
