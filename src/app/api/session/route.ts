import { voiceCreditsOk } from '@/server/eleven'
import { deleteSession, loadSession, toView } from '@/server/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  const s = await loadSession(true)
  await voiceCreditsOk().catch(() => true)
  return Response.json({ session: toView(s!) })
}

export async function DELETE() {
  await deleteSession()
  return Response.json({ ok: true })
}
