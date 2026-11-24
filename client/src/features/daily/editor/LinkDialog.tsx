import { zodResolver } from '@hookform/resolvers/zod'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import { useForm } from 'react-hook-form'
import { useEffect } from 'react'
import { z } from 'zod'
import { FormTextField } from '../../../shared/forms/FormTextField'
import { normalizeLinkHref } from './linkHref'

/**
 * Acepta direcciones con o sin esquema (T-100) y las normaliza con `normalizeLinkHref`:
 * el documento solo recibe hrefs HTTP/HTTPS absolutos que también acepta el servidor.
 */
const hrefSchema = z.string().superRefine((value, ctx) => {
  const result = normalizeLinkHref(value)
  if (!result.ok) ctx.addIssue({ code: 'custom', message: result.error })
})

const linkFormSchema = z.object({
  href: hrefSchema,
})

export type LinkFormValues = z.infer<typeof linkFormSchema>

export interface LinkDialogProps {
  /** Si true, el diálogo se muestra. */
  open: boolean
  /** Texto seleccionado actualmente (solo informativo). */
  selectedText: string
  /** href existente si el cursor está dentro de un enlace. */
  existingHref?: string
  /** Cierra el diálogo y restaura el foco al editor. */
  onClose: () => void
  /** Restablece el foco cuando termina la transición y se libera el foco modal. */
  onExited?: () => void
  /** Guarda el href en la selección actual. */
  onSave: (href: string) => void
  /** Quita el href de la selección actual, conservando el texto. */
  onRemove?: () => void
  /** Abre el href en una nueva pestaña. */
  onOpen?: (href: string) => void
}

export function LinkDialog({
  open,
  selectedText,
  existingHref,
  onClose,
  onExited,
  onSave,
  onRemove,
  onOpen,
}: LinkDialogProps) {
  const isEditing = existingHref != null

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
    reset,
  } = useForm<LinkFormValues>({
    resolver: zodResolver(linkFormSchema),
    defaultValues: {
      href: existingHref ?? '',
    },
  })

  useEffect(() => {
    if (open) reset({ href: existingHref ?? '' })
  }, [open, existingHref, reset])

  // Sincronizar href existente cuando se reabre el diálogo
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      onClose()
    }
  }

  const onSubmit = handleSubmit((values) => {
    const result = normalizeLinkHref(values.href)
    if (!result.ok) return
    onSave(result.href)
    onClose()
  })

  const handleRemove = () => {
    onRemove?.()
    onClose()
  }

  const handleOpenLink = () => {
    if (existingHref) {
      onOpen?.(existingHref)
    }
  }

  const handleReset = () => {
    reset({ href: existingHref ?? '' })
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleOpenChange}
      aria-labelledby="link-dialog-title"
      aria-describedby="link-dialog-description"
      fullWidth
      maxWidth="sm"
      slotProps={{ backdrop: { timeout: 100 }, transition: { onExited } }}
    >
      <form onSubmit={onSubmit}>
        <DialogTitle id="link-dialog-title">
          {isEditing ? 'Editar enlace' : 'Agregar enlace'}
          {selectedText && (
            <Box
              component="span"
              sx={{ display: 'block', fontSize: '0.875rem', color: 'text.secondary', mt: 1 }}
            >
              «{selectedText}»
            </Box>
          )}
        </DialogTitle>
        <DialogContent>
          <Box id="link-dialog-description" sx={{ mt: 1, mb: 2 }}>
            <FormTextField
              control={control}
              name="href"
              label="URL"
              placeholder="google.com"
              fullWidth
              autoFocus
              disabled={isSubmitting}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 1, p: 2 }}>
          {isEditing && onRemove ? (
            <Button onClick={handleRemove} disabled={isSubmitting}>
              Quitar enlace
            </Button>
          ) : null}
          {isEditing && onOpen && existingHref ? (
            <Button onClick={handleOpenLink} disabled={isSubmitting}>
              Abrir enlace
            </Button>
          ) : null}
          <Button onClick={handleReset} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            Guardar
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
