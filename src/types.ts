import React from 'react'

export type ColumnWidth = string | number

export type Cell = {
  col: number
  row: number
}

export type Selection = { min: Cell; max: Cell }

export type CellProps<T, C> = {
  rowData: T
  rowIndex: number
  columnIndex: number
  active: boolean
  focus: boolean
  disabled: boolean
  align?: AlignSetting
  columnData: C
  setRowData: (rowData: T) => void
  stopEditing: (opts?: { nextRow: boolean }) => void
  insertRowBelow: () => void
  duplicateRow: () => void
  deleteRow: () => void
  getContextMenuItems: () => ContextMenuItem[]
}

export type CellComponent<T, C> = (props: CellProps<T, C>) => JSX.Element

export type Column<T, C, PasteValue> = {
  id?: string
  headerClassName?: string
  title?: React.ReactNode
  width: ColumnWidth
  minWidth: number
  maxWidth?: number
  align?: AlignSetting
  renderWhenScrolling: boolean
  component: CellComponent<T, C>
  columnData?: C
  disableKeys: boolean
  disabled:
    | boolean
    | ((opt: { rowData: T; rowIndex: number; isCreating: boolean }) => boolean)
  cellClassName?:
    | string
    | ((opt: { rowData: T; rowIndex: number }) => string | undefined)
  keepFocus: boolean
  deleteValue: (opt: { rowData: T; rowIndex: number }) => T
  copyValue: (opt: { rowData: T; rowIndex: number }) => number | string | null
  pasteValue: (opt: { rowData: T; value: PasteValue; rowIndex: number }) => T
  prePasteValues: (values: string[]) => PasteValue[] | Promise<PasteValue[]>
  isCellEmpty: (opt: { rowData: T; rowIndex: number }) => boolean
}

export type ListItemData<T> = {
  data: T[]
  contentWidth?: number
  columns: Column<T, any, string>[]
  hasStickyRightColumn: boolean
  activeCell: Cell | null
  selectionMinRow?: number
  selectionMaxRow?: number
  isGridEditing: boolean
  editing: boolean
  newRowsTracker: number[]
  setRowData: (rowIndex: number, item: T, end: boolean) => void
  deleteRows: (
    rowMin: number,
    rowMax?: number,
    changeActiveCell?: boolean
  ) => void
  duplicateRows: (rowMin: number, rowMax?: number) => void
  insertRowAfter: (row: number, count?: number) => void
  stopEditing: (opts?: { nextRow?: boolean }) => void
  getContextMenuItems: () => ContextMenuItem[]
  onDoubleClickRow?: (rowData: T) => void
  rowClassName?:
    | string
    | ((opt: { rowData: T; rowIndex: number }) => string | undefined)
}

export type HeaderContextType<T> = {
  columns: Column<T, any, string>[]
  setColumnsWidth: any
  contentWidth?: number
  hasStickyRightColumn: boolean
  height: number
  activeColMin?: number
  activeColMax?: number
}

export type SelectionContextType = {
  columnRights?: number[]
  columnWidths?: number[]
  activeCell: Cell | null
  selection: Selection | null
  dataLength: number
  rowHeight: number
  hasStickyRightColumn: boolean
  editing: boolean
  isCellDisabled: (cell: Cell) => boolean
  headerRowHeight: number
  viewWidth?: number
  viewHeight?: number
  contentWidth?: number
  edges: { top: boolean; right: boolean; bottom: boolean; left: boolean }
  expandSelection: number | null
}

export type RowProps<T> = {
  index: number
  data: T
  style: React.CSSProperties
  isScrolling?: boolean
  columns: Column<T, any, string>[]
  hasStickyRightColumn: boolean
  active: boolean
  activeColIndex: number | null
  editing: boolean
  isGridEditing: boolean
  isCreating: boolean
  setRowData: (rowIndex: number, item: T, end: boolean) => void
  deleteRows: (rowMin: number, rowMax?: number) => void
  duplicateRows: (rowMin: number, rowMax?: number) => void
  insertRowAfter: (row: number, count?: number) => void
  stopEditing?: (opts?: { nextRow?: boolean }) => void
  getContextMenuItems: () => ContextMenuItem[]
  onDoubleClickRow?: (rowData: T) => void
  rowClassName?:
    | string
    | ((opt: { rowData: T; rowIndex: number }) => string | undefined)
}

export type SimpleColumn<T, C> = Partial<
  Pick<
    Column<T, C, string>,
    'title' | 'maxWidth' | 'minWidth' | 'width' | 'component' | 'columnData'
  >
>

export type AddRowsComponentProps = {
  addRows: (count?: number) => void
}

export type ContextMenuItem =
  | {
      type: 'INSERT_ROW_BELLOW' | 'DELETE_ROW' | 'DUPLICATE_ROW'
      action: () => void
    }
  | {
      type: 'DELETE_ROWS' | 'DUPLICATE_ROWS'
      action: () => void
      fromRow: number
      toRow: number
    }

export type ContextMenuComponentProps = {
  clientX: number
  clientY: number
  items: ContextMenuItem[]
  close: () => void
}

export type Operation = {
  type: 'UPDATE' | 'DELETE' | 'CREATE' | 'UPDATE_ROW'
  fromRowIndex: number
  toRowIndex: number
}

export type DataSheetGridProps<T> = {
  value?: T[]
  style?: React.CSSProperties
  className?: string
  rowClassName?:
    | string
    | ((opt: { rowData: T; rowIndex: number }) => string | undefined)
  onChange?: (value: T[], operations: Operation[]) => void
  onRowSubmit?: (
    prevValue: T[],
    newValue: T[],
    rowIndex: number
  ) => Promise<boolean>
  columns?: Partial<Column<T, any, any>>[]
  gutterColumn?: SimpleColumn<T, any> | false
  stickyRightColumn?: SimpleColumn<T, any>
  height?: number
  rowHeight?: number
  headerRowHeight?: number
  isRowEmpty?: (rowData: T, isCreating: boolean) => boolean
  addRowsComponent?: (props: AddRowsComponentProps) => JSX.Element
  createRow?: () => T
  duplicateRow?: (opts: { rowData: T; rowIndex: number }) => T
  autoAddRow?: boolean
  multipleNewRows?: boolean
  lockRows?: boolean
  showAddRowsComponent?: boolean
  disableContextMenu?: boolean
  disableExpandSelection?: boolean
  contextMenuComponent?: (props: ContextMenuComponentProps) => JSX.Element
  onFocus?: (opts: { cell: CellWithId }) => void
  onBlur?: (opts: { cell: CellWithId }) => void
  onActiveCellChange?: (opts: { cell: CellWithId | null }) => void
  onSelectionChange?: (opts: { selection: SelectionWithId | null }) => void
  onDoubleClickRow?: (dataRow: T) => void
  isEditing?: boolean
}

type CellWithIdInput = {
  col: number | string
  row: number
}

type SelectionWithIdInput = { min: CellWithIdInput; max: CellWithIdInput }

export type CellWithId = {
  colId?: string
  col: number
  row: number
}

export type SelectionWithId = { min: CellWithId; max: CellWithId }

export type DataSheetGridRef = {
  activeCell: CellWithId | null
  selection: SelectionWithId | null
  setActiveCell: (activeCell: CellWithIdInput | null) => void
  setSelection: (selection: SelectionWithIdInput | null) => void
}
