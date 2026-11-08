import 'server-only'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import type { Session, SessionView } from '@/lib/types'
import { stageIndex } from '@/lib/places'
import { BRIEF, FACTS } from './scenario'
import { hasAnthropic, hasVoice } from './ai'
import { voiceCreditsKnownOk } from './eleven'

const DIR = path.join(process.cwd(), '.sessions')
const COOKIE = 'dh_sid'
const ID_RE = /^[a-f0-9]{32}$/

export function freshSession(id: string): Session {
  const now = Date.now()
  return {
    id,
    createdAt: now,
    updatedAt: now,
    stage: 'onboarding',
    setupLater: false,
    skipped: [],
    setup: null,
    interview: { mode: null, status: 'idle', turns: [], revealed: {}, conversationIds: [], reconnects: 0, startedAt: null, endedAt: null, transcriptId: null },
    grade: null,
    gradeError: null,
    lab: { runs: [], spot: null, hintUsed: false, fix: { scheduleFilter: false, promptFix: false }, customs: [] },
    launch: { premortem: null, decision: null },
    report: null,
  }
}

const file = (id: string) => path.join(DIR, `${id}.json`)

async function read(id: string): Promise<Session | null> {
  if (!ID_RE.test(id)) return null
  try {
    return JSON.parse(await fs.readFile(file(id), 'utf8')) as Session
  } catch {
    return null
  }
}

export async function save(s: Session) {
  s.updatedAt = Date.now()
  await fs.mkdir(DIR, { recursive: true })
  const tmp = `${file(s.id)}.${process.pid}.tmp`
  await fs.writeFile(tmp, JSON.stringify(s, null, 1))
  await fs.rename(tmp, file(s.id))
}

/** Load the session for this browser, creating one if needed. */
export async function loadSession(create = true): Promise<Session | null> {
  const jar = await cookies()
  const id = jar.get(COOKIE)?.value
  if (id) {
    const s = await read(id)
    if (s) return s
  }
  if (!create) return null
  const s = freshSession(crypto.randomBytes(16).toString('hex'))
  await save(s)
  jar.set(COOKIE, s.id, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 90 })
  return s
}

export async function deleteSession() {
  const jar = await cookies()
  const id = jar.get(COOKIE)?.value
  if (id && ID_RE.test(id)) await fs.rm(file(id), { force: true })
  jar.delete(COOKIE)
}

// Serialize mutations per session so concurrent requests don't clobber each other.
const locks = new Map<string, Promise<unknown>>()
export async function withSession<T>(fn: (s: Session) => Promise<T> | T): Promise<{ session: Session; result: T }> {
  const s0 = await loadSession(true)
  const id = s0!.id
  const prev = locks.get(id) ?? Promise.resolve()
  let release!: () => void
  const mine = new Promise<void>((r) => (release = r))
  locks.set(id, prev.then(() => mine))
  await prev
  try {
    const s = (await read(id)) ?? s0!
    const result = await fn(s)
    await save(s)
    return { session: s, result }
  } finally {
    release()
    if (locks.get(id) === mine) locks.delete(id)
  }
}

/** The brief unlocks once the interview is over (graded or skipped). */
export function briefUnlocked(s: Session) {
  return stageIndex(s.stage) >= stageIndex('discovery_debrief') || s.skipped.includes('interview') || s.interview.status === 'ended'
}

export function toView(s: Session): SessionView {
  const { revealed: _r, ...interview } = s.interview
  void _r
  const discovered = new Set(s.grade?.discoveredFacts ?? [])
  return {
    ...s,
    interview,
    brief: briefUnlocked(s)
      ? { ...BRIEF, facts: FACTS.map((f) => ({ id: f.id, label: f.label, text: f.fact, discovered: discovered.has(f.id) })) }
      : null,
    ai: { anthropic: hasAnthropic(), voice: hasVoice() && voiceCreditsKnownOk() },
  }
}
