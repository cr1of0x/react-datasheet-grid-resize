import { ContextMenuItem } from '../types'
import { encodeHtml } from '../utils/copyPasting'

export const CreateContextItems = <T extends any>(
  setContextMenuItems: (items: ContextMenuItem[]) => void,
  closeContextMenu: () => void,
  deleteRows: (
    rowMin: number,
    rowMax?: number,
    changeActiveCell?: boolean
  ) => Promise<void>,
  duplicateRows: (rowMin: number, rowMax?: number) => void,
  insertRowAfter: (
    row: number,
    count?: any,
    firstActiveCol?: boolean
  ) => Promise<void>,
  copyAll: () => void,
  searchText: (text: string, caseSensitive: boolean) => void,
  data: T[],
  isGridEditing: boolean,
  row?: number,
  selectionMinRow?: number,
  selectionMaxRow?: number
) => {
  const items: ContextMenuItem[] = []

  items.push({
    type: 'COPY_CLIPBOARD',
    action: () => {
      closeContextMenu()
      copyAll()
    },
  })

  items.push({
    type: 'SEARCH',
    action: () => {
      closeContextMenu()
      // searchText('a', false)
    },
  })

  if (selectionMaxRow !== undefined) {
    items.push({
      type: 'INSERT_ROW_BELLOW',
      action: () => {
        closeContextMenu()
        if (isGridEditing) {
          insertRowAfter(selectionMaxRow)
        }
      },
    })
  } else if (row !== undefined) {
    items.push({
      type: 'INSERT_ROW_BELLOW',
      action: () => {
        closeContextMenu()
        if (isGridEditing) {
          insertRowAfter(row)
        }
      },
    })
  }

  if (
    selectionMinRow !== undefined &&
    selectionMaxRow !== undefined &&
    selectionMinRow !== selectionMaxRow
  ) {
    items.push({
      type: 'DUPLICATE_ROWS',
      fromRow: selectionMinRow + 1,
      toRow: selectionMaxRow + 1,
      action: () => {
        closeContextMenu()
        if (isGridEditing) {
          duplicateRows(selectionMinRow, selectionMaxRow)
        }
      },
    })
  } else if (row !== undefined) {
    items.push({
      type: 'DUPLICATE_ROW',
      action: () => {
        closeContextMenu()
        if (isGridEditing) {
          duplicateRows(row)
        }
      },
    })
  }

  if (
    selectionMinRow !== undefined &&
    selectionMaxRow !== undefined &&
    selectionMinRow !== selectionMaxRow
  ) {
    items.push({
      type: 'DELETE_ROWS',
      fromRow: selectionMinRow + 1,
      toRow: selectionMaxRow + 1,
      action: () => {
        closeContextMenu()
        if (isGridEditing) {
          deleteRows(selectionMinRow, selectionMaxRow)
        }
      },
    })
  } else if (row !== undefined) {
    items.push({
      type: 'DELETE_ROW',
      action: () => {
        closeContextMenu()
        if (isGridEditing) {
          deleteRows(row)
        }
      },
    })
  }

  setContextMenuItems(items)
  if (!items.length) {
    closeContextMenu()
  }
}
