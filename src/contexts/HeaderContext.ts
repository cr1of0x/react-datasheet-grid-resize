import React from 'react'
import { HeaderContextType } from '../types'

export const HeaderContext = React.createContext<HeaderContextType<any>>({
  columns: [],
  setColumnsWidth: undefined,
  height: 0,
  hasStickyRightColumn: false,
})
