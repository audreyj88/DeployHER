import { deleteSession, loadSession, toView } from '@/server/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  const s = await loadSession(true)
  return Response.json({ session: toView(s!) })
}

export async function DELETE() {
  await deleteSession()
  return Response.json({ ok: true })
}
