import type { Phase } from './api/types'
import { N } from './voice/lines'

/**
 * One short lesson before each level (texts in voice/narration.json). PRODUCT KNOWLEDGE only, never how to
 * react to a drop or a raise, so the behaviour the levels measure is not biased.
 */
export interface Lesson {
  title: string
  points: string[]
  voiceKey: string
}

export const lessonFor = (phase: Phase): Lesson => ({ ...N.lessons[phase], voiceKey: `lesson_${phase}` })
