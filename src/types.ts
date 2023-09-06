import React from 'react'

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
  stopEditing: (opts?: { nextRow?: boolean }) => void
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
  /** @deprecated Use `basis`, `grow`, and `shrink` instead */
  width?: string | number
  basis: number
  grow: number
  shrink: number
  minWidth: number
  maxWidth?: number
<<<<<<< HEAD
  align?: AlignSetting
  renderWhenScrolling: boolean
=======
>>>>>>> a3f5701
  component: CellComponent<T, C>
  columnData?: C
  disableKeys: boolean
  required: boolean
  disabled:
    | boolean
    | ((opt: { rowData: T; rowIndex: number; isCreating: boolean }) => boolean)
  cellClassName?:
    | string
    | ((opt: {
        rowData: T
        rowIndex: number
        columnId?: string
      }) => string | undefined)
  keepFocus: boolean
  deleteValue: (opt: { rowData: T; rowIndex: number }) => T
  copyValue: (opt: { rowData: T; rowIndex: number }) => number | string | null
  pasteValue: (opt: { rowData: T; value: PasteValue; rowIndex: number }) => T
  prePasteValues: (values: string[]) => PasteValue[] | Promise<PasteValue[]>
  isCellEmpty: (opt: { rowData: T; rowIndex: number }) => boolean
}

<<<<<<< HEAD
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
  isDataEmpty: boolean
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

=======
>>>>>>> a3f5701
export type SelectionContextType = {
  columnRights?: number[]
  columnWidths?: number[]
  activeCell: Cell | null
  selection: Selection | null
  dataLength: number
  rowHeight: (index: number) => { height: number; top: number }
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

<<<<<<< HEAD
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
  isDataEmpty: boolean
  rowClassName?:
    | string
    | ((opt: { rowData: T; rowIndex: number }) => string | undefined)
}

=======
>>>>>>> a3f5701
export type SimpleColumn<T, C> = Partial<
  Pick<
    Column<T, C, string>,
    | 'title'
    | 'maxWidth'
    | 'minWidth'
    | 'basis'
    | 'grow'
    | 'shrink'
    | 'component'
    | 'columnData'
  >
>

export type AddRowsComponentProps = {
  addRows: (count?: number) => void
}

export type ContextMenuItem =
  // | {
  //     type:
  //       | 'INSERT_ROW_BELLOW'
  //       | 'DELETE_ROW'
  //       | 'DUPLICATE_ROW'
  //       | 'EXPORT_EXCEL'
  //     action: () => void
  //   }
  // | {
  {
    type: string //'DELETE_ROWS' | 'DUPLICATE_ROWS'
    action: () => void
    fromRow?: number
    toRow?: number
  }

export type ContextMenuComponentProps = {
  clientX: number
  clientY: number
  items: ContextMenuItem[]
  cursorIndex: Cell
  close: () => void
  isGridEditing: boolean
}

export type Operation = {
  type: 'UPDATE' | 'CREATE'
  fromRowIndex: number
  toRowIndex: number
}

export type OperationSubmit = {
  type: 'UPDATE' | 'CREATE' | 'DELETE' | 'DELETE_NEW'
  index: number
}

export type DataSheetGridProps<T> = {
  value?: T[]
  style?: React.CSSProperties
  className?: string
  rowClassName?:
    | string
    | ((opt: { rowData: T; rowIndex: number }) => string | undefined)
  cellClassName?:
    | string
    | ((opt: {
        rowData: unknown
        rowIndex: number
        columnId?: string
      }) => string | undefined)
  onChange?: (value: T[], operations: Operation[]) => void
  onRowSubmit?: (
    prevValue: T[],
    newValue: T[],
    rowIndex: number,
    operation: OperationSubmit
  ) => Promise<boolean>
  columns?: Partial<Column<T, any, any>>[]
  gutterColumn?: SimpleColumn<T, any> | false
  stickyRightColumn?: SimpleColumn<T, any>
  rowKey?: string | ((opts: { rowData: T; rowIndex: number }) => string)
  height?: number
  rowHeight?: number | ((opt: { rowData: T; rowIndex: number }) => number)
  headerRowHeight?: number
<<<<<<< HEAD
  isRowEmpty?: (rowData: T, isCreating: boolean) => boolean
  addRowsComponent?: (props: AddRowsComponentProps) => JSX.Element
  footerComponent?: (props: any) => JSX.Element
=======
  addRowsComponent?:
    | ((props: AddRowsComponentProps) => React.ReactElement | null)
    | false
>>>>>>> a3f5701
  createRow?: () => T
  duplicateRow?: (opts: { rowData: T; rowIndex: number }) => T
  autoAddRow?: boolean
  lockRows?: boolean
  showAddRowsComponent?: boolean
  disableContextMenu?: boolean
  disableExpandSelection?: boolean
<<<<<<< HEAD
  isLoading?: boolean
  contextMenuComponent?: (props: ContextMenuComponentProps) => JSX.Element
  createContextMenuItems?: (
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
    goTo: (line: number) => void,
    data: T[],
    isGridEditing: boolean,
    row?: number,
    selectionMinRow?: number,
    selectionMaxRow?: number
  ) => void
=======
  contextMenuComponent?: (
    props: ContextMenuComponentProps
  ) => React.ReactElement | null
>>>>>>> a3f5701
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
  submit: () => Promise<boolean>
  search: (search: string, caseSensitive: boolean) => boolean
  goTo: (line: number) => void
}
