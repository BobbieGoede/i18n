import { createHash } from 'node:crypto'

export type PrerenderTarget = {
  type: 'locale' | 'config'
  path: string
}

export function getHash(text: Buffer | string): string {
  return createHash('sha256').update(text).digest('hex').substring(0, 8)
}
