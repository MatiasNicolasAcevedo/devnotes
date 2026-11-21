import { createContext } from 'react'

export const ImageDraftContext = createContext<{
  imageEdited: boolean
  setImageEdited: (edited: boolean) => void
}>({
  imageEdited: false,
  setImageEdited: () => {},
})
