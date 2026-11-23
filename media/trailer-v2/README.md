# Tráiler v2 de escritorio

Composición [HyperFrames](https://hyperframes.heygen.com) de 46 s en 16:9 (1920×1080) con música sintetizada y sin locución. Es el entregable de [T-095](../../docs/tasks/T-095-trailer-v2.md). Por decisión del dueño del 2026-11-23 hay un único corte de escritorio. La ventana que se achica y el paso a móvil forman parte del relato.

Parte de la adaptación horizontal de la v1 local (`trailer/landscape/`, sin versionar). Conserva su paleta, tipografía (Space Grotesk y Roboto Mono), logo, gancho, cierre y su banda a 120 BPM. Los originales de la v1 no se modifican.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | Composición raíz, `data-duration="46"`, una línea de tiempo GSAP determinista |
| `scripts/make-soundtrack.mjs` | Generador determinista de la banda sonora (música y efectos) en `assets/soundtrack.wav` |
| `package.json` | Scripts con HyperFrames fijado en `0.9.37`, la misma versión que la v1 |
| `STORYBOARD.md` | Timecodes, gesto visible, función demostrada y evidencia de cada rótulo |

La banda sonora, los renders y las cachés de `.hyperframes/` se generan en local y están en `.gitignore`.

## Reproducir

Requiere Node 24 y conexión para el primer `npx`, que descarga HyperFrames y su Chrome. La composición carga Space Grotesk y Roboto Mono desde Google Fonts y GSAP 3.15.0 desde jsDelivr, igual que la v1.

```bash
cd media/trailer-v2
npm run check    # regenera assets/soundtrack.wav y ejecuta lint, runtime, layout, motion y contraste
npm run render   # regenera la banda y escribe renders/devnotes-trailer-v2-16x9.mp4
cd renders
ffprobe -v error -show_entries stream=codec_type,width,height:format=duration -of json devnotes-trailer-v2-16x9.mp4
```

`npm run dev` abre la vista previa interactiva. Para revisar fotogramas sueltos: `npx --yes hyperframes@0.9.37 snapshot --at 9.6,24.9,29.5,33.5,37.4`.
