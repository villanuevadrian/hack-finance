import { describe, expect, it } from 'vitest'
import { configureVoice, filesAreVega } from './engine'

describe("Vega's voice is always the same", () => {
  it('uses the pre-recorded files when the server has no voice', () => {
    configureVoice({ serverTts: false, serverVoice: null, fileVoice: null })
    expect(filesAreVega()).toBe(true)
  })
  it('uses the files only if they were made with the same voice as the server', () => {
    configureVoice({ serverTts: true, serverVoice: 'voz-vega', fileVoice: 'voz-vega' })
    expect(filesAreVega()).toBe(true)
    configureVoice({ serverTts: true, serverVoice: 'voz-vega', fileVoice: 'otra-voz' })
    expect(filesAreVega()).toBe(false)
    // Files of unknown voice are not mixed with the server's voice.
    configureVoice({ serverTts: true, serverVoice: 'voz-vega', fileVoice: null })
    expect(filesAreVega()).toBe(false)
  })
})
