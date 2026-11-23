# Demo narrada de DevNotes

Recorrido completo en español, con la voz de Sofía (ElevenLabs), música de fondo suave y subtítulos. Es el entregable de [T-096](../../docs/tasks/T-096-narrated-demo.md). Se graba sobre la aplicación real en el stack E2E propio, con una cuenta ficticia, el proveedor OIDC de prueba y los dobles de Groq, OCR.space y los proveedores de IA. No usa datos reales ni Google real.

## Archivos

| Archivo | Qué es |
|---|---|
| [`script.json`](script.json) | Guion editable: capítulos y escenas con ID estable, ruta, gesto, diálogo, resultado y pausa |
| [`GUION.md`](GUION.md) | Guion legible generado desde `script.json`, con tiempos previstos y finales |
| [`MATRIZ.md`](MATRIZ.md) | Función → escena → acción → resultado visible, y exclusiones por entorno |
| [`../../e2e/tests/demo-tour.spec.ts`](../../e2e/tests/demo-tour.spec.ts) | El recorrido. Sin ritmo es un E2E funcional; con ritmo graba cuadros y marcas |
| `scripts/voice.mjs` | Voz: verificación de la voz y el saldo, muestra, un clip por escena con caché y alineación por carácter |
| `scripts/pacing.mjs` | Ritmo por escena: duración real del clip o estimación para el ensayo en silencio |
| `scripts/capture.sh` | Captura en el stack E2E propio y copia de cuadros y marcas a `build/capture` |
| `scripts/make-music.mjs` | Música de fondo determinista, misma armonía y timbres del tráiler v2, más lenta y sin batería marcada |
| `scripts/montage.mjs` | Montaje: video 1920×1080 a 30 fps, voz, música atenuada bajo la voz, SRT y pista de subtítulos |
| `scripts/guion.mjs` | Regenera `GUION.md` |

Todo lo generado queda en `build/` y está en `.gitignore`: clips de voz, captura, música y videos.

## Reproducir

Desde Git Bash, con Docker Desktop y Node 24, en la raíz del repositorio. La clave de ElevenLabs solo se inyecta en el entorno del proceso que genera la voz. Nunca se escribe en archivos ni se imprime.

```bash
cd media/demo
node scripts/voice.mjs check     # voz = Sofía, plan y saldo; no consume caracteres
node scripts/voice.mjs sample    # muestra corta
node scripts/voice.mjs clips     # un clip por escena; reusa los que ya existen para el mismo texto y voz
cd ../..
bash media/demo/scripts/capture.sh          # unos 10 minutos: build del stack E2E y recorrido con el ritmo real
node media/demo/scripts/montage.mjs --burn  # build/demo.mp4, build/demo.es.srt y build/demo-subtitulado.mp4
node media/demo/scripts/guion.mjs
cd media/demo/build
ffprobe -v error -show_entries stream=codec_type,width,height:format=duration -of json demo.mp4
ffprobe -v error -show_packets -select_streams s -show_entries packet=pts_time,duration_time -of csv demo.es.srt
```

Sin clips de voz, `capture.sh` y `montage.mjs` arman el ensayo en silencio con tiempos estimados. Si se agota el saldo, `voice.mjs clips` se detiene en la escena pendiente. `node scripts/voice.mjs plan` informa qué falta y la misma orden retoma desde ahí.

El recorrido funcional, sin grabar, corre con `bash scripts/e2e.sh --grep "demo tour" --project desktop`.
