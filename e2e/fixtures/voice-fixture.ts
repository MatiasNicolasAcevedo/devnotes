// T-037 · Fixture de voz para Playwright (S-105 v2, VO-01…07).
// Micrófono sintético de Chromium (tono generado por el propio navegador, sin voz personal ni archivo de audio),
// permisos de micrófono/portapapeles limitados al origen de la SPA y una sonda de solo lectura sobre los tracks.
// getUserMedia, MediaRecorder y la API propia siguen siendo los reales: la sonda solo observa el stream que el
// navegador entrega para comprobar que la captura termina sus tracks. No exporta audio ni trazas.
import type { BrowserContext, Page } from '@playwright/test';
import { test as base, expect } from '../tests/fixtures';

export const origin = 'http://localhost';

/** Flags de Chromium: dispositivo de captura ficticio y aceptación del permiso sin diálogo nativo. */
export const fakeMicrophone = {
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
};

/** Doble externo de Groq: solo alcanzable en la red privada del proyecto Compose propio. */
const provider = 'http://voice-provider:8091/healthz';

export async function providerScenario(scenario: '429' | 'timeout' | 'reset') {
  const response = await fetch(`${provider}?scenario=${scenario}`);
  expect(response.status, 'Own fake provider accepted the scenario').toBe(200);
}

/** Permisos solo para el origen de la SPA y sonda de tracks antes de cualquier script de la página. */
export async function prepareVoiceContext(context: BrowserContext) {
  await context.grantPermissions(['microphone', 'clipboard-read', 'clipboard-write'], { origin });
  await context.addInitScript(() => {
    const devices = navigator.mediaDevices;
    if (!devices?.getUserMedia) return;
    const real = devices.getUserMedia.bind(devices);
    const tracks: MediaStreamTrack[] = [];
    Object.defineProperty(window, '__voiceTracks', { value: tracks });
    devices.getUserMedia = async (constraints?: MediaStreamConstraints) => {
      const stream = await real(constraints);
      tracks.push(...stream.getTracks());
      return stream;
    };
  });
}

/** Estado de cada track entregado por getUserMedia en esta página, en orden de captura. */
export async function trackStates(page: Page) {
  return page.evaluate(() =>
    ((window as unknown as { __voiceTracks?: MediaStreamTrack[] }).__voiceTracks ?? [])
      .map(track => `${track.kind}:${track.readyState}`));
}

export const test = base.extend<{ voiceContext: void }>({
  voiceContext: [async ({ context }, use) => {
    await providerScenario('reset');
    await prepareVoiceContext(context);
    await use();
    await providerScenario('reset');
  }, { auto: true }],
});

export { expect };
