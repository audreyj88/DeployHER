import { CHOICES } from '@/lib/rollout'
import { CAREERS, CAVEAT, STATUS_META, stampFacts } from '@/lib/report'
import type { Session, SessionView } from '@/lib/types'

export const ROOM_STAMPS = [
  { key: 'setup', icon: '🌱', title: 'The Greenhouse', color: '#2F7D4F', tilt: -6 },
  { key: 'interview', icon: '🤝', title: 'Pathways Forward', color: '#2A9D8F', tilt: 4 },
  { key: 'debrief', icon: '☕', title: 'The Coffee Break', color: '#9A5B3A', tilt: -3 },
  { key: 'lab', icon: '🛠️', title: 'Make It Work Lab', color: '#D9734A', tilt: 5 },
  { key: 'launch', icon: '🚀', title: 'Launch Pad', color: '#C8475D', tilt: -4 },
] as const

export const facts = (s: SessionView) => stampFacts(s as unknown as Session)

export function buildMarkdown(s: SessionView): string {
  const r = s.report!
  const f = facts(s)
  const out: string[] = []
  out.push(`# ${r.headline}`, '', r.summary, '')
  out.push('## Mission', '', 'Pathways Forward (fictional): discover the client’s real problem and improve a prebuilt recommendation assistant.', '')
  for (const st of ROOM_STAMPS) out.push(`- **${st.title}:** ${f[st.key] ?? 'Skipped · not assessed'}`)
  out.push('', '## What I brought', '')
  if (s.setup?.confirmed && s.setup.strengths.length) {
    for (const k of s.setup.strengths) out.push(`- **${k.label}** (I said: “${k.from}”) → ${k.application}`)
  } else out.push('- Setup skipped; no background assumed.')
  out.push('', '## Skills', '')
  for (const k of r.skills) out.push(`- **${k.label}**: ${STATUS_META[k.status].label}. ${k.explanation}`)
  out.push('', '## Results', '')
  out.push(`- Discovery score: ${s.grade ? `${s.grade.total}/100 (transcript ${s.grade.transcriptId})` : 'not assessed'}`)
  const runs = s.lab.runs
  if (runs.length) {
    const a = runs[0]
    const b = runs[runs.length - 1]
    out.push(`- Agent tests: ${a.coreScore}/5 (${a.version})${a !== b ? ` → ${b.coreScore}/5 (${b.version})` : ''}, checked by the policy code`)
  } else out.push('- Agent tests: not assessed')
  const d = s.launch.decision
  out.push(`- Rollout choice: ${d ? `${CHOICES.find((c) => c.key === d.choice)!.short} (practice only; not evidence of production safety)` : 'not assessed'}`)
  out.push('', '## Next steps', '')
  r.nextSteps.forEach((n, i) => out.push(`${i + 1}. ${n}`))
  out.push('', '## Roles to explore', '')
  for (const c of CAREERS) out.push(`- ${c}`)
  out.push('', `*${CAVEAT} All people, organisations and applicants are fictional. ${new Date(r.generatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}*`, '')
  return out.join('\n')
}

export function plainSummary(s: SessionView): string {
  const r = s.report!
  return [r.headline, '', r.summary, '', ...r.skills.map((k) => `• ${k.label}: ${STATUS_META[k.status].label}`), '', 'Next steps:', ...r.nextSteps.map((n, i) => `${i + 1}. ${n}`), '', CAVEAT].join('\n')
}
