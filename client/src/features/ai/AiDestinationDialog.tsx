import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useId, useState } from 'react'
import { AI_ACCENT, firstModel, useAi } from './aiContext'
import type { AiProviderOption } from './api'

export function AiDestinationDialog({ anchor }: { anchor: HTMLElement }) {
  const ai = useAi()
  const compact = useMediaQuery('(max-width: 599px)', { noSsr: true })
  const titleId = useId()
  const providerId = useId()
  const modelId = useId()
  const filterId = useId()
  const [provider, setProvider] = useState(ai?.destination?.provider ?? '')
  const [model, setModel] = useState(ai?.destination?.model ?? '')
  const [filter, setFilter] = useState('')
  if (!ai) return null

  const option = ai.options?.find((item) => item.id === provider)
  const candidates =
    option?.models.filter(
      (item) =>
        !filter ||
        item.id === model ||
        `${item.label} ${item.id}`.toLowerCase().includes(filter.toLowerCase().trim()),
    ) ?? []
  const rect = anchor.getBoundingClientRect()
  const valid = option?.available && candidates.some((item) => item.id === model && item.available)
  const groups = [
    ['light', 'Ligero'],
    ['alternative', 'Alternativas'],
    ['other', 'Otros modelos gratuitos'],
  ]

  function changeProvider(option: AiProviderOption | undefined) {
    setProvider(option?.id ?? '')
    setModel(firstModel(option))
    setFilter('')
  }

  return (
    <Dialog
      open
      onClose={ai.close}
      aria-labelledby={titleId}
      transitionDuration={0}
      slotProps={{
        paper: {
          sx: compact
            ? {
                position: 'absolute',
                bottom: 0,
                m: 0,
                width: '100%',
                maxWidth: 'none',
                borderRadius: '12px 12px 0 0',
                pb: 'env(safe-area-inset-bottom)',
              }
            : {
                position: 'absolute',
                top: Math.min(rect.bottom + 4, Math.max(8, window.innerHeight - 355)),
                right: Math.max(8, window.innerWidth - rect.right),
                m: 0,
                width: 320,
              },
        },
      }}
    >
      <DialogTitle id={titleId} sx={{ fontSize: '1rem', py: 1.5 }}>
        Proveedor y modelo
      </DialogTitle>
      <DialogContent sx={{ display: 'grid', pt: '8px !important', gap: 1.5 }}>
        <TextField
          autoFocus
          id={providerId}
          label="Proveedor"
          select
          value={provider}
          size="small"
          slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
          onChange={(event) =>
            changeProvider(ai.options?.find((item) => item.id === event.target.value))
          }
        >
          <option value="">Elegí un proveedor</option>
          {ai.options?.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
              {item.reason ? ` (${item.reason})` : ''}
            </option>
          ))}
        </TextField>
        <TextField
          id={modelId}
          label="Modelo"
          select
          value={candidates.some((item) => item.id === model) ? model : ''}
          size="small"
          slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}
          onChange={(event) => setModel(event.target.value)}
        >
          <option value="">Elegí un modelo</option>
          {groups.map(([category, label]) => {
            const choices = candidates.filter((item) => item.category === category)
            return (
              choices.length > 0 && (
                <optgroup key={category} label={label}>
                  {choices.map((item) => (
                    <option key={item.id} value={item.id} disabled={!item.available}>
                      {item.label}
                    </option>
                  ))}
                </optgroup>
              )
            )
          })}
        </TextField>
        {provider === 'openrouter' && (
          <TextField
            id={filterId}
            label="Filtrar modelos"
            value={filter}
            size="small"
            onChange={(event) => setFilter(event.target.value)}
          />
        )}
        {ai.failed && (
          <Typography role="status" variant="body2">
            No se pudo actualizar el catálogo.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        {provider === 'openrouter' && (
          <Button size="small" loading={ai.refreshing} onClick={() => void ai.refresh()}>
            Actualizar catálogo
          </Button>
        )}
        <Button onClick={ai.close}>Cerrar</Button>
        <Button
          disabled={!valid}
          sx={{ color: AI_ACCENT }}
          onClick={() => {
            ai.apply({ provider, model })
            ai.close()
          }}
        >
          Aplicar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
