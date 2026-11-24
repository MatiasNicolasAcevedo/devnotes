import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../../test/render'
import { LinkDialog } from './LinkDialog'

describe('LinkDialog', () => {
  it('muestra diálogo para agregar enlace con texto seleccionado', () => {
    renderWithProviders(
      <LinkDialog open={true} selectedText="1279" onClose={vi.fn()} onSave={vi.fn()} />,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Agregar enlace')).toBeInTheDocument()
    expect(screen.getByText('«1279»')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /URL/ })).toBeInTheDocument()
  })

  it('muestra diálogo para editar enlace existente', () => {
    renderWithProviders(
      <LinkDialog
        open={true}
        selectedText="ABC-123"
        existingHref="https://jira.ejemplo.test/browse/ABC-123"
        onClose={vi.fn()}
        onSave={vi.fn()}
        onRemove={vi.fn()}
        onOpen={vi.fn()}
      />,
    )

    expect(screen.getByText('Editar enlace')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /URL/ })).toHaveValue(
      'https://jira.ejemplo.test/browse/ABC-123',
    )
    expect(screen.getByRole('button', { name: 'Quitar enlace' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abrir enlace' })).toBeInTheDocument()
  })

  it('guarda URL válida y cierra diálogo', async () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    const { user } = renderWithProviders(
      <LinkDialog open={true} selectedText="1279" onClose={onClose} onSave={onSave} />,
    )

    const urlInput = screen.getByRole('textbox', { name: /URL/ })
    await user.type(urlInput, 'https://ejemplo.com/pagina')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(onSave).toHaveBeenCalledWith('https://ejemplo.com/pagina')
    expect(onClose).toHaveBeenCalled()
  })

  it('guarda una dirección sin esquema normalizada con https', async () => {
    const onSave = vi.fn()
    const { user } = renderWithProviders(
      <LinkDialog open={true} selectedText="1279" onClose={vi.fn()} onSave={onSave} />,
    )

    const urlInput = screen.getByRole('textbox', { name: /URL/ })
    expect(urlInput).toHaveAttribute('placeholder', 'google.com')
    await user.type(urlInput, 'www.ejemplo.test')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(onSave).toHaveBeenCalledWith('https://www.ejemplo.test/')
  })

  it('rechaza un dominio inválido junto al campo sin guardar', async () => {
    const onSave = vi.fn()
    const { user } = renderWithProviders(
      <LinkDialog open={true} selectedText="1279" onClose={vi.fn()} onSave={onSave} />,
    )

    const urlInput = screen.getByRole('textbox', { name: /URL/ })
    await user.type(urlInput, 'mi_sitio.test')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(
      await screen.findByText('Ingresá una dirección web válida, por ejemplo google.com.'),
    ).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('valida que URL debe ser http:// o https://', async () => {
    const { user } = renderWithProviders(
      <LinkDialog open={true} selectedText="1279" onClose={vi.fn()} onSave={vi.fn()} />,
    )

    const urlInput = screen.getByRole('textbox', { name: /URL/ })
    await user.type(urlInput, 'ftp://ejemplo.com')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    const error = await screen.findByText('Solo se aceptan direcciones web (http o https).')
    expect(error).toBeInTheDocument()
  })

  it('rechaza URL javascript:', async () => {
    const { user } = renderWithProviders(
      <LinkDialog open={true} selectedText="1279" onClose={vi.fn()} onSave={vi.fn()} />,
    )

    const urlInput = screen.getByRole('textbox', { name: /URL/ })
    await user.type(urlInput, 'javascript:alert(1)')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    const error = await screen.findByText('Solo se aceptan direcciones web (http o https).')
    expect(error).toBeInTheDocument()
  })

  it('rechaza URL data:', async () => {
    const { user } = renderWithProviders(
      <LinkDialog open={true} selectedText="1279" onClose={vi.fn()} onSave={vi.fn()} />,
    )

    const urlInput = screen.getByRole('textbox', { name: /URL/ })
    await user.type(urlInput, 'data:text/html,<h1>xss</h1>')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    const error = await screen.findByText('Solo se aceptan direcciones web (http o https).')
    expect(error).toBeInTheDocument()
  })

  it('rechaza URL relativa', async () => {
    const { user } = renderWithProviders(
      <LinkDialog open={true} selectedText="1279" onClose={vi.fn()} onSave={vi.fn()} />,
    )

    const urlInput = screen.getByRole('textbox', { name: /URL/ })
    await user.type(urlInput, '/ruta/relativa')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    const error = await screen.findByText(
      'Ingresá una dirección web válida, por ejemplo google.com.',
    )
    expect(error).toBeInTheDocument()
  })

  it('rechaza URL mailto:', async () => {
    const { user } = renderWithProviders(
      <LinkDialog open={true} selectedText="1279" onClose={vi.fn()} onSave={vi.fn()} />,
    )

    const urlInput = screen.getByRole('textbox', { name: /URL/ })
    await user.type(urlInput, 'mailto:test@ejemplo.com')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    const error = await screen.findByText('Solo se aceptan direcciones web (http o https).')
    expect(error).toBeInTheDocument()
  })

  it('rechaza URL con credenciales', async () => {
    const { user } = renderWithProviders(
      <LinkDialog open={true} selectedText="1279" onClose={vi.fn()} onSave={vi.fn()} />,
    )

    const urlInput = screen.getByRole('textbox', { name: /URL/ })
    await user.type(urlInput, 'https://usuario:password@ejemplo.com')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    const error = await screen.findByText(/no puede contener credenciales/)
    expect(error).toBeInTheDocument()
  })

  it('quita enlace y cierra diálogo', async () => {
    const onRemove = vi.fn()
    const onClose = vi.fn()
    const { user } = renderWithProviders(
      <LinkDialog
        open={true}
        selectedText="ABC-123"
        existingHref="https://jira.ejemplo.test/browse/ABC-123"
        onClose={onClose}
        onSave={vi.fn()}
        onRemove={onRemove}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Quitar enlace' }))

    expect(onRemove).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('abre enlace existente en nueva pestaña', async () => {
    const windowOpen = vi.spyOn(window, 'open').mockReturnValue(null as unknown as Window)
    const onOpen = vi.fn((href) => windowOpen(href, '_blank', 'noopener,noreferrer'))

    renderWithProviders(
      <LinkDialog
        open={true}
        selectedText="ABC-123"
        existingHref="https://jira.ejemplo.test/browse/ABC-123"
        onClose={vi.fn()}
        onSave={vi.fn()}
        onOpen={onOpen}
      />,
    )

    const { user } = renderWithProviders(
      <LinkDialog
        open={true}
        selectedText="ABC-123"
        existingHref="https://jira.ejemplo.test/browse/ABC-123"
        onClose={vi.fn()}
        onSave={vi.fn()}
        onOpen={onOpen}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Abrir enlace' }))

    expect(onOpen).toHaveBeenCalledWith('https://jira.ejemplo.test/browse/ABC-123')
    windowOpen.mockRestore()
  })

  it('cancelar cierra diálogo sin guardar', async () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    const { user } = renderWithProviders(
      <LinkDialog open={true} selectedText="1279" onClose={onClose} onSave={onSave} />,
    )

    const urlInput = screen.getByRole('textbox', { name: /URL/ })
    await user.type(urlInput, 'https://ejemplo.com')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('no muestra Quitar enlace ni Abrir enlace al crear nuevo', () => {
    renderWithProviders(
      <LinkDialog open={true} selectedText="1279" onClose={vi.fn()} onSave={vi.fn()} />,
    )

    expect(screen.queryByRole('button', { name: 'Quitar enlace' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Abrir enlace' })).not.toBeInTheDocument()
  })

  it('valida longitud máxima de URL', async () => {
    const { user } = renderWithProviders(
      <LinkDialog open={true} selectedText="1279" onClose={vi.fn()} onSave={vi.fn()} />,
    )

    const longUrl = 'https://' + 'a'.repeat(2050) + '.com'
    await user.paste(longUrl)
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    const error = await screen.findByText(/no puede exceder 2048/)
    expect(error).toBeInTheDocument()
  })
})
