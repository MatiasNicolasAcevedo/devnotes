import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { buildAuthUser } from '../../../test/factories'
import { installAuthBackend } from '../../../test/msw/authBackend'
import { installReferenceBackend, referenceItem } from '../../../test/msw/referenceBackend'
import { renderWithProviders } from '../../../test/render'
import { AuthSessionProvider } from '../../auth/AuthSessionProvider'
import { DailyEditor } from './DailyEditor'
import { type DailyContent } from './dailyDocument'

// jsdom no calcula geometría ni hit-testing. Las medidas reales se comprueban con Playwright.
beforeAll(() => {
  Object.defineProperties(Range.prototype, {
    getClientRects: { configurable: true, value: () => [] },
    getBoundingClientRect: { configurable: true, value: () => new DOMRect() },
  })
  // ProseMirror consulta elementFromPoint en mousedown; sin coordenadas usa la selección del DOM.
  Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: () => null })
})
afterAll(() => {
  Reflect.deleteProperty(Range.prototype, 'getClientRects')
  Reflect.deleteProperty(Range.prototype, 'getBoundingClientRect')
  Reflect.deleteProperty(document, 'elementFromPoint')
})

const REF_ID = '01900000-0000-7000-8000-000000000301'

function setup(initialContent?: DailyContent) {
  const auth = installAuthBackend({ user: buildAuthUser() })
  installReferenceBackend(auth, [
    { owner: auth.state.user!.id, item: referenceItem({ id: REF_ID, title: 'Referencia E2E' }) },
  ])
  const onChange = vi.fn()
  const rendered = renderWithProviders(
    <AuthSessionProvider>
      <DailyEditor initialContent={initialContent} onChange={onChange} />
    </AuthSessionProvider>,
  )
  return { ...rendered, onChange }
}

/** Escribe @Referencia en la posición del cursor y elige el primer resultado con el mouse. */
async function pickFirstResult(
  user: ReturnType<typeof setup>['user'],
  caret?: { paragraph: number; offset: number },
) {
  const editor = await screen.findByRole('textbox', { name: 'Editor de nota diaria' })
  if (caret) {
    const target = editor.querySelectorAll('p')[caret.paragraph]
    await user.pointer({ keys: '[MouseLeft]', target, offset: caret.offset })
  } else {
    editor.focus()
  }
  await user.keyboard('@Referencia')
  const option = await screen.findByRole('button', { name: /Referencia E2E/ })
  await user.click(option)
}

describe('DailyEditor · inserción de referencia con @', () => {
  it('reemplaza @consulta al final del documento por el átomo y cierra el picker', async () => {
    const { user, onChange } = setup()
    await pickFirstResult(user)

    await waitFor(() => expect(document.querySelector('[data-reference-picker]')).toBeNull())
    expect(await screen.findByText('@Referencia E2E')).toBeInTheDocument()
    expect(onChange.mock.lastCall?.[0]).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'reference', attrs: { id: REF_ID } }] }],
    })
  })

  it('inserta el átomo donde estaba @consulta, sin desplazarlo sobre el texto posterior', async () => {
    const { user, onChange } = setup({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: ' cola' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'línea siguiente larga' }] },
      ],
    })
    await pickFirstResult(user, { paragraph: 0, offset: 0 })

    await waitFor(() => expect(document.querySelector('[data-reference-picker]')).toBeNull())
    expect(onChange.mock.lastCall?.[0]).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'reference', attrs: { id: REF_ID } },
            { type: 'text', text: ' cola' },
          ],
        },
        { type: 'paragraph', content: [{ type: 'text', text: 'línea siguiente larga' }] },
      ],
    })
  })
})
