// Shared helpers for voice-interview transcripts (client captions and server transcripts).

/**
 * True for "speech" that is only punctuation, like the "..." ElevenLabs logs when the learner
 * stays silent. These aren't questions and must never reach the transcript or the question count.
 */
export const isSilenceFiller = (text: string) => !/[\p{L}\p{N}]/u.test(text)
