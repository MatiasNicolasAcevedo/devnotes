import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '../../test/render'
import { DemoPage } from './DemoPage'

const list = () => screen.getByRole('list', { name: 'Videos' })
const item = (name: RegExp) => within(list()).getByRole('button', { name })

describe('DemoPage', () => {
  it('abre con el tráiler elegido, su portada y sin ningún iframe de YouTube', () => {
    const { container } = renderWithProviders(<DemoPage />, { route: '/demo' })

    expect(screen.getByRole('heading', { level: 1, name: 'Demo' })).toBeVisible()
    expect(screen.getByText('Mirá el tráiler o el recorrido completo de DevNotes.')).toBeVisible()
    const buttons = within(list()).getAllByRole('button')
    expect(buttons).toHaveLength(2)
    expect(buttons[0]).toHaveAccessibleName(/^Tráiler/)
    expect(buttons[1]).toHaveAccessibleName(/^Demo completa/)
    expect(buttons[0]).toHaveAttribute('aria-current', 'true')
    expect(buttons[1]).not.toHaveAttribute('aria-current')
    expect(buttons[0]).toHaveTextContent('0:46')
    expect(buttons[1]).toHaveTextContent('5:53')
    expect(buttons[1]).toHaveTextContent(
      'Todas las funciones paso a paso, narrada y con subtítulos.',
    )
    for (const button of buttons) expect(button.querySelector('img')).toHaveAttribute('alt', '')
    expect(screen.getByRole('button', { name: 'Reproducir Tráiler' })).toBeVisible()
    expect(container.querySelector('iframe')).toBeNull()
    // Portadas locales: ninguna imagen apunta a un host de YouTube.
    for (const img of container.querySelectorAll('img')) {
      expect(img.getAttribute('src')).not.toMatch(/youtube|ytimg/)
    }
  })

  it('reproduce al clic y cambia de video desde la lista sin duplicar el reproductor', async () => {
    const { user, container } = renderWithProviders(<DemoPage />, { route: '/demo' })

    await user.click(screen.getByRole('button', { name: 'Reproducir Tráiler' }))
    const trailer = screen.getByTitle('Tráiler de DevNotes')
    expect(trailer.tagName).toBe('IFRAME')
    expect(trailer).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/-xhokMtK-Hw?autoplay=1&rel=0',
    )
    expect(trailer).toHaveAttribute(
      'allow',
      'autoplay; encrypted-media; picture-in-picture; fullscreen',
    )
    expect(trailer).toHaveAttribute('allowfullscreen')
    expect(trailer).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin')
    expect(screen.queryByRole('button', { name: /^Reproducir/ })).not.toBeInTheDocument()

    // Volver a elegir el que suena no lo reinicia: el mismo elemento sigue montado.
    await user.click(item(/^Tráiler/))
    expect(screen.getByTitle('Tráiler de DevNotes')).toBe(trailer)

    await user.click(item(/^Demo completa/))
    const frames = container.querySelectorAll('iframe')
    expect(frames).toHaveLength(1)
    expect(frames[0]).toHaveAttribute('title', 'Demo completa de DevNotes')
    expect(frames[0]).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/XAIHdmHAhA0?autoplay=1&rel=0',
    )
    expect(item(/^Demo completa/)).toHaveAttribute('aria-current', 'true')
    expect(item(/^Tráiler/)).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('heading', { level: 2, name: 'Demo completa' })).toBeVisible()
    const watch = screen.getByRole('link', { name: 'Ver en YouTube' })
    expect(watch).toHaveAttribute('href', 'https://youtu.be/XAIHdmHAhA0')
    expect(watch).toHaveAttribute('target', '_blank')
    expect(watch).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('un clic en un ítem sin reproducir lo reproduce directamente, sin pasar por la portada', async () => {
    const { user } = renderWithProviders(<DemoPage />, { route: '/demo' })

    await user.click(item(/^Demo completa/))

    expect(screen.getByTitle('Demo completa de DevNotes')).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/XAIHdmHAhA0?autoplay=1&rel=0',
    )
    expect(screen.queryByRole('button', { name: /^Reproducir/ })).not.toBeInTheDocument()
  })
})
