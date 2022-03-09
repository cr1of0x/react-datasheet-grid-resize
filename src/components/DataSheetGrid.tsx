import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Cell,
  Column,
  ContextMenuItem,
  DataSheetGridProps,
  DataSheetGridRef,
  HeaderContextType,
  ListItemData,
  Operation,
  OperationSubmit,
  Selection,
  SelectionContextType,
} from '../types'
import { VariableSizeList } from 'react-window'
import { Row } from './Row'
import { useColumnWidths } from '../hooks/useColumnWidths'
import { useResizeDetector } from 'react-resize-detector'
import { InnerContainer } from './InnerContainer'
import { HeaderContext } from '../contexts/HeaderContext'
import { useColumns } from '../hooks/useColumns'
import { useMemoObject } from '../hooks/useMemoObject'
import { SelectionContext } from '../contexts/SelectionContext'
import { useEdges } from '../hooks/useEdges'
import { useDeepEqualState } from '../hooks/useDeepEqualState'
import { useDocumentEventListener } from '../hooks/useDocumentEventListener'
import { useGetBoundingClientRect } from '../hooks/useGetBoundingClientRect'
import { AddRows } from './AddRows'
import { useDebounceState } from '../hooks/useDebounceState'
import deepEqual from 'fast-deep-equal'
import { ContextMenu } from './ContextMenu'
import {
  parseTextPlainData,
  parseTextHtmlData,
  encodeHtml,
  setClipboard,
} from '../utils/copyPasting'
import {
  getCell,
  getCellWithId,
  getSelection,
  getSelectionWithId,
} from '../utils/typeCheck'
import { getAllTabbableElements } from '../utils/tab'
import { CreateContextItems } from './CreateContextItems'

const DEFAULT_DATA: any[] = []
const DEFAULT_COLUMNS: Column<any, any, any>[] = []
const DEFAULT_CREATE_ROW: DataSheetGridProps<any>['createRow'] = () => ({})
const DEFAULT_EMPTY_CALLBACK: () => Promise<boolean> = async () => true
const DEFAULT_DUPLICATE_ROW: DataSheetGridProps<any>['duplicateRow'] = ({
  rowData,
}) => ({ ...rowData })

type ScrollBehavior = {
  doNotScrollX?: boolean
  doNotScrollY?: boolean
}

// eslint-disable-next-line react/display-name
export const DataSheetGrid = React.memo(
  React.forwardRef<DataSheetGridRef, DataSheetGridProps<any>>(
    <T extends any>(
      {
        value: datagrid = DEFAULT_DATA,
        className,
        style,
        height: maxHeight, //= 400,
        onChange = DEFAULT_EMPTY_CALLBACK,
        onRowSubmit = DEFAULT_EMPTY_CALLBACK,
        columns: rawColumns = DEFAULT_COLUMNS,
        rowHeight = 40,
        headerRowHeight = rowHeight,
        gutterColumn,
        stickyRightColumn,
        addRowsComponent: AddRowsComponent = AddRows,
        footerComponent: FooterComponent,
        isRowEmpty,
        createRow = DEFAULT_CREATE_ROW as () => T,
        autoAddRow = false,
        lockRows = false,
        showAddRowsComponent = false,
        disableExpandSelection = true,
        isLoading = false,
        duplicateRow = DEFAULT_DUPLICATE_ROW,
        contextMenuComponent: ContextMenuComponent = ContextMenu,
        createContextMenuItems: CreateContextMenuItems = CreateContextItems,
        disableContextMenu: disableContextMenuRaw = false,
        onFocus = DEFAULT_EMPTY_CALLBACK,
        onBlur = DEFAULT_EMPTY_CALLBACK,
        onActiveCellChange = DEFAULT_EMPTY_CALLBACK,
        onSelectionChange = DEFAULT_EMPTY_CALLBACK,
        onDoubleClickRow = DEFAULT_EMPTY_CALLBACK,
        rowClassName,
        isEditing = false,
      }: DataSheetGridProps<T>,
      ref: React.ForwardedRef<DataSheetGridRef>
    ): JSX.Element => {
      const lastEditingCellRef = useRef<Cell | null>(null)
      const disableContextMenu = disableContextMenuRaw || lockRows
      const [columns, setColumnsWidth] = useColumns(
        rawColumns,
        gutterColumn,
        stickyRightColumn
      )
      const hasStickyRightColumn = Boolean(stickyRightColumn)
      const listRef = useRef<VariableSizeList>(null)
      const innerRef = useRef<HTMLElement>(null)
      const outerRef = useRef<HTMLElement>(null)
      const beforeTabIndexRef = useRef<HTMLDivElement>(null)
      const afterTabIndexRef = useRef<HTMLDivElement>(null)
      // Control the data of a row edited before submitting
      const rowDataInit = useRef<{ data: T; rowIndex: number }>()

      const data: T[] = useMemo((): T[] => {
        return datagrid.length === 0 ? [{} as any] : datagrid
      }, [datagrid])

      const isDataEmpty = useRef(false)
      useEffect(() => {
        // If the datagrid lenght is 0 and no row was changed it means the data we received new data from outside
        // so we initialize the isDataEmpty

        if (!rowDataInit.current) {
          isDataEmpty.current =
            datagrid.length === 0 ||
            (datagrid.length === 1 &&
              Object.keys(datagrid[0] as any).length === 0)
        }
      }, [datagrid, rowDataInit])

      useEffect(() => {
        listRef.current?.resetAfterIndex(0)
      }, [headerRowHeight, rowHeight])

      useEffect(() => {
        if (!isEditing) setEditing(false)
      }, [isEditing])

      const isLoadingRef = useRef<boolean>(isLoading)
      isLoadingRef.current = isLoading

      // Default value is 1 for the border
      const [heightDiff, setHeightDiff] = useDebounceState(1, 100)

      // Height of the list (including scrollbars and borders) to display
      // const displayHeight = Math.min(
      //   maxHeight,
      //   headerRowHeight + data.length * rowHeight + heightDiff
      // )
      const displayHeight =
        maxHeight ??
        Math.min(400, headerRowHeight + data.length * rowHeight + heightDiff)

      // Width and height of the scrollable area
      const { width, height } = useResizeDetector({
        targetRef: outerRef,
        refreshMode: 'throttle',
        refreshRate: 100,
      })

      setHeightDiff(height ? displayHeight - Math.ceil(height) : 0)

      const edges = useEdges(outerRef, width, height)

      const {
        fullWidth,
        totalWidth: contentWidth,
        columnWidths,
        columnRights,
      } = useColumnWidths(columns, width)

      // x,y coordinates of the right click
      const [contextMenu, setContextMenu] = useState<{
        x: number
        y: number
      } | null>(null)

      // Items of the context menu
      const [contextMenuItems, setContextMenuItems] = useState<
        ContextMenuItem[]
      >([])

      // True when the active cell is being edited
      const [editing, setEditing] = useState(false)

      // Number of rows the user is expanding the selection by, always a number, even when not expanding selection
      const [expandSelectionRowsCount, setExpandSelectionRowsCount] =
        useState<number>(0)

      // When not null, represents the index of the row from which we are expanding
      const [
        expandingSelectionFromRowIndex,
        setExpandingSelectionFromRowIndex,
      ] = useState<number | null>(null)

      // Highlighted cell, null when not focused
      const [activeCell, setActiveCell] = useDeepEqualState<
        (Cell & ScrollBehavior) | null
      >({ col: 0, row: 0, doNotScrollX: true })

      // The selection cell and the active cell are the two corners of the selection, null when nothing is selected
      const [selectionCell, setSelectionCell] = useDeepEqualState<
        (Cell & ScrollBehavior) | null
      >(null)

      const newRowsTracker = useRef<number[]>([])

      // Min and max of the current selection (rectangle defined by the active cell and the selection cell), null when nothing is selected
      const selection = useMemo<Selection | null>(() => {
        // return (
        //   activeCell &&
        //   selectionCell && {
        //     min: {
        //       col: Math.min(activeCell.col, selectionCell.col),
        //       row: Math.min(activeCell.row, selectionCell.row),
        //     },
        //     max: {
        //       col: Math.max(activeCell.col, selectionCell.col),
        //       row: Math.max(activeCell.row, selectionCell.row),
        //     },
        //   }
        // )

        // Només volem tenir navegació de cel·la
        return (
          activeCell &&
          selectionCell && {
            min: {
              col: activeCell.col,
              row: activeCell.row,
            },
            max: {
              col: activeCell.col,
              row: activeCell.row,
            },
          }
        )
      }, [activeCell, selectionCell])

      // Behavior of the selection when the user drags the mouse around
      const [selectionMode, setSelectionMode] = useDeepEqualState({
        // True when the position of the cursor should impact the columns of the selection
        columns: false,
        // True when the position of the cursor should impact the rows of the selection
        rows: false,
        // True when the user is dragging the mouse around to select
        active: false,
      })

      // Same as expandSelectionRowsCount but is null when we should not be able to expand the selection
      const expandSelection =
        disableExpandSelection ||
        editing ||
        selectionMode.active ||
        activeCell?.row === data?.length - 1 ||
        selection?.max.row === data?.length - 1 ||
        (activeCell &&
          columns
            .slice(
              (selection?.min.col ?? activeCell.col) + 1,
              (selection?.max.col ?? activeCell.col) + 2
            )
            .every((column) => column.disabled === true))
          ? null
          : expandSelectionRowsCount

      const getInnerBoundingClientRect = useGetBoundingClientRect(innerRef)
      const getOuterBoundingClientRect = useGetBoundingClientRect(outerRef)

      // Blur any element on focusing the grid
      useEffect(() => {
        if (activeCell !== null) {
          ;(document.activeElement as HTMLElement).blur()
          window.getSelection()?.removeAllRanges()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [activeCell !== null])

      // Extract the coordinates of the cursor from a mouse event
      const getCursorIndex = useCallback(
        (
          event: MouseEvent,
          force: boolean = false,
          includeSticky: boolean = false
        ): Cell | null => {
          const innerBoundingClientRect = getInnerBoundingClientRect(force)
          const outerBoundingClientRect =
            includeSticky && getOuterBoundingClientRect(force)

          if (innerBoundingClientRect && columnRights && columnWidths) {
            let x = event.clientX - innerBoundingClientRect.left
            let y = event.clientY - innerBoundingClientRect.top

            if (outerBoundingClientRect) {
              if (
                event.clientY - outerBoundingClientRect.top <=
                headerRowHeight
              ) {
                y = 0
              }

              if (
                event.clientX - outerBoundingClientRect.left <=
                columnWidths[0]
              ) {
                x = 0
              }

              if (
                hasStickyRightColumn &&
                outerBoundingClientRect.right - event.clientX <=
                  columnWidths[columnWidths.length - 1]
              ) {
                x = columnRights[columnRights.length - 2] + 1
              }
            }

            return {
              col: columnRights.findIndex((right) => x < right) - 1,
              row: Math.min(
                data.length - 1,
                Math.max(-1, Math.floor((y - headerRowHeight) / rowHeight))
              ),
            }
          }

          return null
        },
        [
          columnRights,
          columnWidths,
          data.length,
          getInnerBoundingClientRect,
          getOuterBoundingClientRect,
          headerRowHeight,
          rowHeight,
          hasStickyRightColumn,
        ]
      )

      const dataRef = useRef(data)
      dataRef.current = data

      const isCellDisabled = useCallback(
        (cell: Cell): boolean => {
          const disabled = columns[cell.col + 1].disabled

          return Boolean(
            typeof disabled === 'function'
              ? disabled({
                  rowData: dataRef.current[cell.row],
                  rowIndex: cell.row,
                  isCreating: newRowsTracker.current?.includes(cell.row),
                })
              : disabled
          )
        },
        [columns, newRowsTracker]
      )

      const deleteRows = useCallback(
        async (
          rowMin: number,
          rowMax: number = rowMin,
          changeActiveCell: boolean = true
        ) => {
          if (lockRows || isDataEmpty.current) {
            return
          }

          setEditing(false)

          setSelectionCell(null)

          let operation: OperationSubmit
          if (newRowsTracker.current?.includes(rowMin)) {
            operation = { type: 'DELETE_NEW', index: rowMin }
          } else {
            operation = { type: 'DELETE', index: rowMin }
          }

          // Get before onRowSubmit
          const dataLength = dataRef.current.length

          if (
            await onRowSubmit(
              [...dataRef.current],
              [
                ...dataRef.current.slice(0, rowMin),
                ...dataRef.current.slice(rowMax + 1),
              ],
              rowMin,
              operation
            )
          ) {
            // Only change active cell if set to true or the current active cell row is bigger than
            // the lenght of the rows
            if (changeActiveCell || activeCell?.row === dataLength - 1) {
              setActiveCell((a) => {
                const row = Math.min(dataLength - 2 - rowMax + rowMin, rowMin)

                if (row < 0) {
                  return null
                }
                return a && { col: a.col, row }
              })
            }
          } else {
            // return to the cell that we tried to submit
            setActiveCell((a) => {
              const row = rowMin

              if (row < 0) {
                return null
              }
              return a && { col: a.col, row }
            })
          }
        },
        [
          lockRows,
          setActiveCell,
          setSelectionCell,
          onRowSubmit,
          activeCell,
          isDataEmpty,
        ]
      )

      // True when an error ocurred on submit, used to disable submittion of another row when navigating back
      // to the row that gave error
      const forbidSubmitOnError = useRef(false)

      const submitRowData = useCallback(
        async (rowIndex: number, item: T, iniItem?: T) => {
          if (forbidSubmitOnError.current) {
            forbidSubmitOnError.current = false
            return false
          }

          const row = data.slice(rowIndex, rowIndex + 1)

          const satisfiesRequiredCols = row.every((rowData, i) => {
            return columns.every((column) => {
              if (column.required) {
                return !column.isCellEmpty({ rowData, rowIndex: i + rowIndex })
              }
              return true
            })
          })

          // If there are empty cells on the row that are required we do not submit and return false
          if (!satisfiesRequiredCols) {
            forbidSubmitOnError.current = true

            // return to the cell that we tried to submit
            setActiveCell((a) => {
              const row = rowIndex

              if (row < 0) {
                return null
              }
              return a && { col: a.col, row }
            })
            return false
          }

          const isEmpty = row.every((rowData, i) => {
            if (isRowEmpty) {
              return isRowEmpty(
                rowData,
                newRowsTracker.current?.includes(rowIndex + i)
              )
            } else {
              return columns.every((column) =>
                column.isCellEmpty({ rowData, rowIndex: i + rowIndex })
              )
            }
          })

          // check if the row has changed and is not empty
          if (iniItem && !isEmpty && !deepEqual(iniItem, item)) {
            // The row we we're editing has changed

            let operation: OperationSubmit
            if (
              newRowsTracker.current?.includes(rowIndex) ||
              isDataEmpty.current
            ) {
              operation = { index: rowIndex, type: 'CREATE' }
            } else {
              operation = { index: rowIndex, type: 'UPDATE' }
            }

            const submitted = await onRowSubmit(
              [
                ...dataRef.current?.slice(0, rowIndex),
                iniItem,
                ...dataRef.current?.slice(rowIndex + 1),
              ],
              [
                ...dataRef.current?.slice(0, rowIndex),
                item,
                ...dataRef.current?.slice(rowIndex + 1),
              ],
              rowIndex,
              operation
            )

            if (submitted) {
              // If we submitted succesfully data is no longer empty
              isDataEmpty.current = false
              // If not error on submitted remove row from the creating rows tracker
              newRowsTracker.current = newRowsTracker.current?.filter(
                (f) => f !== rowIndex
              )
              rowDataInit.current = undefined
            } else {
              forbidSubmitOnError.current = true

              // return to the cell that we tried to submit
              setActiveCell((a) => {
                const row = rowIndex

                if (row < 0) {
                  return null
                }
                return a && { col: a.col, row }
              })
            }

            return submitted
          } else {
            // The row we we're editing was not changed, we check if the row is a new one
            const isCreating = newRowsTracker.current?.includes(rowIndex)

            // We check if the row we we're editing is new
            if (isCreating) {
              //If we are creating the row and if not all the required cols are set or the row is empty we delete the row
              if (!satisfiesRequiredCols || isEmpty) {
                deleteRows(rowIndex, rowIndex, false)
                // Remove the index from the tracker
                newRowsTracker.current = newRowsTracker.current?.filter(
                  (f) => f !== rowIndex
                )
              } else {
                // If we can create multiple rows we submit the changes
                const created = await onRowSubmit(
                  [
                    ...dataRef.current?.slice(0, rowIndex),
                    item,
                    ...dataRef.current?.slice(rowIndex + 1),
                  ],
                  [
                    ...dataRef.current?.slice(0, rowIndex),
                    item,
                    ...dataRef.current?.slice(rowIndex + 1),
                  ],
                  rowIndex,
                  { type: 'CREATE', index: rowIndex }
                )

                if (created) {
                  // If we submitted succesfully data is no longer empty

                  isDataEmpty.current = false
                  // If not error on submitted remove row from the creating rows tracker
                  newRowsTracker.current = newRowsTracker.current?.filter(
                    (f) => f !== rowIndex
                  )
                  rowDataInit.current = undefined
                } else {
                  forbidSubmitOnError.current = true

                  // return to the cell that we tried to submit
                  setActiveCell((a) => {
                    const row = rowIndex

                    if (row < 0) {
                      return null
                    }
                    return a && { col: a.col, row }
                  })
                }

                return created
              }
            } else if (isDataEmpty.current) {
              console.log("DIDN'T SUBMIT DATA IS EMPTY")
              // If we are adding the first row and the row is empty we return false
              return false
            }

            // If we don't do anything return true
            return true
          }
        },
        [onRowSubmit, columns, data, deleteRows, isRowEmpty, setActiveCell]
      )

      const insertRowAfter = useCallback(
        async (row: number, count = 1, firstActiveCol: boolean = false) => {
          // If data is empty don't allow to insert new rows
          if (lockRows) {
            return
          }

          // submit row data before creating a new row
          if (activeCell) {
            const success = await submitRowData(
              activeCell.row,
              data.slice(activeCell.row, activeCell.row + 1)[0],
              rowDataInit.current?.data
            )

            // If we cannot submit do not create the row
            if (!success) return
            else isDataEmpty.current = false
          }

          setSelectionCell(null)
          setEditing(false)

          onChange(
            [
              ...dataRef.current.slice(0, row + 1),
              ...new Array(count).fill(0).map(createRow),
              ...dataRef.current.slice(row + 1),
            ],
            [
              {
                type: 'CREATE',
                fromRowIndex: row + 1,
                toRowIndex: row + 1 + count,
              },
            ]
          )

          // Add row index to the creating tracker rows
          newRowsTracker.current = newRowsTracker.current
            ?.filter((f) => f !== row + 1)
            .concat(row + 1)

          setActiveCell((a) => ({
            col: firstActiveCol ? 0 : a?.col || 0,
            row: row + count,
            doNotScrollX: true,
          }))
        },
        [
          createRow,
          lockRows,
          onChange,
          setActiveCell,
          setSelectionCell,
          activeCell,
          data,
          submitRowData,
        ]
      )

      const duplicateRows = useCallback(
        (rowMin: number, rowMax: number = rowMin) => {
          if (lockRows) {
            return
          }

          onChange(
            [
              ...dataRef.current.slice(0, rowMax + 1),
              ...dataRef.current
                .slice(rowMin, rowMax + 1)
                .map((rowData, i) =>
                  duplicateRow({ rowData, rowIndex: i + rowMin })
                ),
              ...dataRef.current.slice(rowMax + 1),
            ],
            [
              {
                type: 'CREATE',
                fromRowIndex: rowMax + 1,
                toRowIndex: rowMax + 2 + rowMax - rowMin,
              },
            ]
          )
          setActiveCell({ col: 0, row: rowMax + 1, doNotScrollX: true })
          setSelectionCell({
            col: columns.length - (hasStickyRightColumn ? 3 : 2),
            row: 2 * rowMax - rowMin + 1,
            doNotScrollX: true,
          })
          setEditing(false)
        },
        [
          columns.length,
          duplicateRow,
          lockRows,
          onChange,
          setActiveCell,
          setSelectionCell,
          hasStickyRightColumn,
        ]
      )

      // Scroll to any given cell making sure it is in view
      const scrollTo = useCallback(
        (cell: Cell & ScrollBehavior) => {
          if (!height || !width) {
            return
          }

          if (!cell.doNotScrollY) {
            // Align top
            const topMax = cell.row * rowHeight
            // Align bottom
            const topMin =
              (cell.row + 1) * rowHeight + headerRowHeight - height + 1
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const scrollTop = listRef.current?.state.scrollOffset as number

            if (scrollTop > topMax) {
              listRef.current?.scrollTo(topMax)
            } else if (scrollTop < topMin) {
              listRef.current?.scrollTo(topMin)
            }
          }

          if (
            columnRights &&
            columnWidths &&
            outerRef.current &&
            !cell.doNotScrollX
          ) {
            // Align left
            const leftMax = columnRights[cell.col] - columnRights[0]
            // Align right
            const leftMin =
              columnRights[cell.col] +
              columnWidths[cell.col + 1] +
              (hasStickyRightColumn
                ? columnWidths[columnWidths.length - 1]
                : 0) -
              width +
              1

            const scrollLeft = outerRef.current.scrollLeft

            if (scrollLeft > leftMax) {
              outerRef.current.scrollLeft = leftMax
            } else if (scrollLeft < leftMin) {
              outerRef.current.scrollLeft = leftMin
            }
          }
        },
        [
          height,
          width,
          rowHeight,
          headerRowHeight,
          columnRights,
          columnWidths,
          hasStickyRightColumn,
        ]
      )

      // Scroll to the selectionCell cell when it changes
      useEffect(() => {
        if (selectionCell) {
          scrollTo(selectionCell)
        }
      }, [selectionCell, scrollTo])

      // Scroll to the active cell when it changes
      useEffect(() => {
        if (activeCell) {
          scrollTo(activeCell)
        }
      }, [activeCell, scrollTo])

      const setRowData = useCallback(
        async (rowIndex: number, item: T, submit: boolean) => {
          console.log('==== SET ROW DATA ==== ', submit, rowDataInit.current)
          // if (rowDataInit?.current?.rowIndex != rowIndex)
          //   return;

          if (submit) {
            await submitRowData(rowIndex, item, rowDataInit.current?.data)
          } else {
            if (!rowDataInit.current) {
              // On row change we set the rowDataInit value to track the initial value of the row
              rowDataInit.current = {
                data: dataRef.current?.slice(rowIndex, rowIndex + 1)[0],
                rowIndex: rowIndex,
              }
            }

            onChange(
              [
                ...dataRef.current?.slice(0, rowIndex),
                item,
                ...dataRef.current?.slice(rowIndex + 1),
              ],
              [
                {
                  type: 'UPDATE',
                  fromRowIndex: rowIndex,
                  toRowIndex: rowIndex + 1,
                },
              ]
            )
          }
        },
        [onChange, submitRowData]
      )

      const deleteSelection = useCallback(
        (smartDelete = true) => {
          if (!activeCell) {
            return
          }

          const min: Cell = selection?.min || activeCell
          const max: Cell = selection?.max || activeCell

          if (
            data.slice(min.row, max.row + 1).every((rowData, i) => {
              if (isRowEmpty) {
                return isRowEmpty(
                  rowData,
                  newRowsTracker.current?.includes(min.row + i)
                )
              } else {
                return columns.every((column) =>
                  column.isCellEmpty({ rowData, rowIndex: i + min.row })
                )
              }
            })
          ) {
            if (smartDelete) {
              deleteRows(min.row)
            }
            return
          }

          const newData = [...data]

          for (let row = min.row; row <= max.row; ++row) {
            for (let col = min.col; col <= max.col; ++col) {
              if (!isCellDisabled({ col, row })) {
                const { deleteValue = ({ rowData }) => rowData } =
                  columns[col + 1]
                newData[row] = deleteValue({
                  rowData: newData[row],
                  rowIndex: row,
                })
              }
            }
          }

          if (smartDelete && deepEqual(newData, data)) {
            setActiveCell({ col: 0, row: min.row, doNotScrollX: true })
            setSelectionCell({
              col: columns.length - (hasStickyRightColumn ? 3 : 2),
              row: max.row,
              doNotScrollX: true,
            })
            return
          }

          onChange(newData, [
            {
              type: 'UPDATE',
              fromRowIndex: min.row,
              toRowIndex: max.row + 1,
            },
          ])
        },
        [
          activeCell,
          columns,
          data,
          deleteRows,
          isCellDisabled,
          onChange,
          selection?.max,
          selection?.min,
          setActiveCell,
          setSelectionCell,
          hasStickyRightColumn,
          isRowEmpty,
        ]
      )

      const stopEditing = useCallback(
        ({ nextRow = true } = { nextRow: Boolean }) => {
          if (
            activeCell?.row === dataRef.current.length - 1 &&
            activeCell?.col === columns.length - 2
          ) {
            if (nextRow && autoAddRow) {
              insertRowAfter(activeCell.row)
            } else {
              insertRowAfter(activeCell.row, 1, true)
            }
          } else {
            setEditing(false)

            if (nextRow) {
              setActiveCell((a) => a && { col: a.col, row: a.row + 1 })
            } else {
              setActiveCell((a) => {
                let col = 0
                let row = 0
                if (a) {
                  if (a.col === columns.length - 2) {
                    col = 0
                    row = a.row + 1
                  } else {
                    col = a.col + 1
                    row = a.row
                  }
                }

                return a && { col: col, row: row }
              })
            }
          }
        },
        [activeCell, autoAddRow, insertRowAfter, setActiveCell, columns.length]
      )

      const onCopy = useCallback(
        (event: ClipboardEvent) => {
          if (!editing && activeCell) {
            const copyData: Array<Array<number | string | null>> = []

            const min: Cell = selection?.min || activeCell
            const max: Cell = selection?.max || activeCell

            for (let row = min.row; row <= max.row; ++row) {
              copyData.push([])

              for (let col = min.col; col <= max.col; ++col) {
                const { copyValue = () => null } = columns[col + 1]
                copyData[row - min.row].push(
                  copyValue({ rowData: data[row], rowIndex: row })
                )
              }
            }

            event.clipboardData?.setData(
              'text/plain',
              copyData.map((row) => row.join('\t')).join('\n')
            )
            event.clipboardData?.setData(
              'text/html',
              `<table>${copyData
                .map(
                  (row) =>
                    `<tr>${row
                      .map(
                        (cell) =>
                          `<td>${encodeHtml(String(cell ?? '')).replace(
                            /\n/g,
                            '<br/>'
                          )}</td>`
                      )
                      .join('')}</tr>`
                )
                .join('')}</table>`
            )
            event.preventDefault()
          }
        },
        [activeCell, columns, data, editing, selection]
      )
      useDocumentEventListener('copy', onCopy)

      const copyAll = useCallback(async () => {
        if (!editing && activeCell) {
          const copyData: Array<Array<number | string | null>> = []

          for (let row = 0; row <= data.length; ++row) {
            copyData.push([])

            for (let col = 0; col <= columns.length - 2; ++col) {
              const { copyValue = () => null } = columns[col + 1]
              if (data[row]) {
                copyData[row].push(
                  copyValue({ rowData: data[row], rowIndex: row })
                )
              }
            }
          }

          await setClipboard(
            'text/plain',
            copyData.map((row) => row.join('\t')).join('\n')
          )

          const header = columns.slice(1)

          const tbl: string = `<table>
          <tr>${header.map((c) => `<th>${c.title}</th>`).join('')}</tr>
          ${copyData
            .map(
              (row) =>
                `<tr>${row
                  .map(
                    (cell) =>
                      `<td>${encodeHtml(String(cell ?? '')).replace(
                        /\n/g,
                        '<br/>'
                      )}</td>`
                  )
                  .join('')}</tr>`
            )
            .join('')}</table>`

          await setClipboard('text/html', tbl)
        }
      }, [activeCell, columns, data, editing])

      const onCut = useCallback(
        (event: ClipboardEvent) => {
          if (!editing && activeCell) {
            onCopy(event)
            deleteSelection(false)
            event.preventDefault()
          }
        },
        [activeCell, deleteSelection, editing, onCopy]
      )
      useDocumentEventListener('cut', onCut)

      const onPaste = useCallback(
        async (event: ClipboardEvent) => {
          if (!editing && activeCell) {
            let pasteData = [['']]

            if (event.clipboardData?.types.includes('text/html')) {
              pasteData = parseTextHtmlData(
                event.clipboardData?.getData('text/html')
              )
            } else if (event.clipboardData?.types.includes('text/plain')) {
              pasteData = parseTextPlainData(
                event.clipboardData?.getData('text/plain')
              )
            } else if (event.clipboardData?.types.includes('text')) {
              pasteData = parseTextPlainData(
                event.clipboardData?.getData('text')
              )
            }

            const min: Cell = selection?.min || activeCell
            const max: Cell = selection?.max || activeCell

            const results = await Promise.all(
              pasteData[0].map((_, columnIndex) => {
                const prePasteValues =
                  columns[min.col + columnIndex + 1]?.prePasteValues

                const values = pasteData.map((row) => row[columnIndex])
                return prePasteValues?.(values) ?? values
              })
            )

            pasteData = pasteData.map((_, rowIndex) =>
              results.map((column) => column[rowIndex])
            )

            // Paste single row
            if (pasteData.length === 1) {
              const newData = [...data]

              for (
                let columnIndex = 0;
                columnIndex < pasteData[0].length;
                columnIndex++
              ) {
                const pasteValue =
                  columns[min.col + columnIndex + 1]?.pasteValue

                if (pasteValue) {
                  for (
                    let rowIndex = min.row;
                    rowIndex <= max.row;
                    rowIndex++
                  ) {
                    if (
                      !isCellDisabled({
                        col: columnIndex + min.col,
                        row: rowIndex,
                      })
                    ) {
                      newData[rowIndex] = await pasteValue({
                        rowData: newData[rowIndex],
                        value: pasteData[0][columnIndex],
                        rowIndex,
                      })
                    }
                  }
                }
              }

              onChange(newData, [
                {
                  type: 'UPDATE',
                  fromRowIndex: min.row,
                  toRowIndex: max.row + 1,
                },
              ])
              setActiveCell({ col: min.col, row: min.row })
              setSelectionCell({
                col: Math.min(
                  min.col + pasteData[0].length - 1,
                  columns.length - (hasStickyRightColumn ? 3 : 2)
                ),
                row: max.row,
              })
            } else {
              // Paste multiple rows
              let newData = [...data]
              const missingRows = min.row + pasteData.length - data.length

              if (missingRows > 0) {
                if (!lockRows) {
                  newData = [
                    ...newData,
                    ...new Array(missingRows).fill(0).map(() => createRow()),
                  ]
                } else {
                  pasteData.splice(pasteData.length - missingRows, missingRows)
                }
              }

              for (
                let columnIndex = 0;
                columnIndex < pasteData[0].length &&
                min.col + columnIndex <
                  columns.length - (hasStickyRightColumn ? 2 : 1);
                columnIndex++
              ) {
                const pasteValue =
                  columns[min.col + columnIndex + 1]?.pasteValue

                if (pasteValue) {
                  for (
                    let rowIndex = 0;
                    rowIndex < pasteData.length;
                    rowIndex++
                  ) {
                    if (
                      !isCellDisabled({
                        col: min.col + columnIndex,
                        row: min.row + rowIndex,
                      })
                    ) {
                      newData[min.row + rowIndex] = await pasteValue({
                        rowData: newData[min.row + rowIndex],
                        value: pasteData[rowIndex][columnIndex],
                        rowIndex: min.row + rowIndex,
                      })
                    }
                  }
                }
              }

              const operations: Operation[] = [
                {
                  type: 'UPDATE',
                  fromRowIndex: min.row,
                  toRowIndex:
                    min.row +
                    pasteData.length -
                    (!lockRows && missingRows > 0 ? missingRows : 0),
                },
              ]

              if (missingRows > 0 && !lockRows) {
                operations.push({
                  type: 'CREATE',
                  fromRowIndex: min.row + pasteData.length - missingRows,
                  toRowIndex: min.row + pasteData.length,
                })
              }

              onChange(newData, operations)
              setActiveCell({ col: min.col, row: min.row })
              setSelectionCell({
                col: Math.min(
                  min.col + pasteData[0].length - 1,
                  columns.length - (hasStickyRightColumn ? 3 : 2)
                ),
                row: min.row + pasteData.length - 1,
              })
            }

            event.preventDefault()
          }
        },
        [
          activeCell,
          columns,
          createRow,
          data,
          editing,
          hasStickyRightColumn,
          isCellDisabled,
          lockRows,
          onChange,
          selection?.max,
          selection?.min,
          setActiveCell,
          setSelectionCell,
        ]
      )
      useDocumentEventListener('paste', onPaste)

      const isLeftMouseButtonPressed = useRef<boolean>(false)
      const onMouseDown = useCallback(
        (event: MouseEvent) => {
          if (
            (contextMenu && contextMenuItems.length) ||
            isLoadingRef.current === true
          ) {
            return
          }

          const rightClick = event.button === 2
          const leftClick = event.button === 0
          const clickInside =
            innerRef.current?.contains(event.target as Node) || false

          const cursorIndex = clickInside
            ? getCursorIndex(event, true, true)
            : null

          if (
            !clickInside &&
            editing &&
            activeCell &&
            columns[activeCell.col + 1].keepFocus
          ) {
            return
          }

          // Detect if we pressed the left mouse button
          isLeftMouseButtonPressed.current = leftClick

          if (
            event.target instanceof HTMLElement &&
            event.target.className.includes('dsg-expand-rows-indicator')
          ) {
            setExpandingSelectionFromRowIndex(
              Math.max(activeCell?.row ?? 0, selection?.max.row ?? 0)
            )
            return
          }

          const clickOnActiveCell =
            cursorIndex &&
            activeCell &&
            activeCell.col === cursorIndex.col &&
            activeCell.row === cursorIndex.row &&
            !isCellDisabled(activeCell)

          if (clickOnActiveCell && editing) {
            return
          }

          const clickOnStickyRightColumn =
            cursorIndex?.col === columns.length - 2 && hasStickyRightColumn

          const rightClickInSelection =
            rightClick &&
            selection &&
            cursorIndex &&
            cursorIndex.row >= selection.min.row &&
            cursorIndex.row <= selection.max.row &&
            cursorIndex.col >= selection.min.col &&
            cursorIndex.col <= selection.max.col

          const rightClickOnSelectedHeaders =
            rightClick &&
            selection &&
            cursorIndex &&
            cursorIndex.row === -1 &&
            cursorIndex.col >= selection.min.col &&
            cursorIndex.col <= selection.max.col

          const rightClickOnSelectedGutter =
            rightClick &&
            selection &&
            cursorIndex &&
            cursorIndex.row >= selection.min.row &&
            cursorIndex.row <= selection.max.row &&
            cursorIndex.col === -1

          const clickOnSelectedStickyRightColumn =
            clickOnStickyRightColumn &&
            selection &&
            cursorIndex &&
            cursorIndex.row >= selection.min.row &&
            cursorIndex.row <= selection.max.row

          if (rightClick && !disableContextMenu) {
            if (contRef.current) {
              const rect = contRef.current.getBoundingClientRect()
              const x = event.clientX - rect.left
              const y = event.clientY - rect.top
              setContextMenu({ x: x, y: y })
            }
          }

          if (
            (!(event.shiftKey && activeCell) || rightClick) &&
            data.length > 0
          ) {
            if (cursorIndex) {
              setActiveCell(
                cursorIndex && {
                  col:
                    (rightClickInSelection || rightClickOnSelectedHeaders) &&
                    activeCell
                      ? activeCell.col
                      : Math.max(
                          0,
                          clickOnStickyRightColumn ? 0 : cursorIndex.col
                        ),
                  row:
                    (rightClickInSelection ||
                      rightClickOnSelectedGutter ||
                      clickOnSelectedStickyRightColumn) &&
                    activeCell
                      ? activeCell.row
                      : Math.max(0, cursorIndex.row),
                  doNotScrollX: Boolean(
                    (rightClickInSelection && activeCell) ||
                      clickOnStickyRightColumn ||
                      cursorIndex.col === -1
                  ),
                  doNotScrollY: Boolean(
                    (rightClickInSelection && activeCell) ||
                      cursorIndex.row === -1
                  ),
                }
              )
            }
          }

          if (clickOnActiveCell && !rightClick) {
            lastEditingCellRef.current = activeCell
          }

          setEditing(Boolean(isEditing && clickOnActiveCell && !rightClick))
          setSelectionMode(
            cursorIndex && !rightClick
              ? {
                  columns:
                    (cursorIndex.col !== -1 && !clickOnStickyRightColumn) ||
                    Boolean(event.shiftKey && activeCell),
                  rows:
                    cursorIndex.row !== -1 ||
                    Boolean(event.shiftKey && activeCell),
                  active: true,
                }
              : {
                  columns: false,
                  rows: false,
                  active: false,
                }
          )

          if (event.shiftKey && activeCell && !rightClick) {
            setSelectionCell(
              cursorIndex && {
                col: Math.max(
                  0,
                  cursorIndex.col - (clickOnStickyRightColumn ? 1 : 0)
                ),
                row: Math.max(0, cursorIndex.row),
              }
            )
          } else if (!rightClickInSelection) {
            if (
              cursorIndex &&
              (cursorIndex?.col === -1 ||
                cursorIndex?.row === -1 ||
                clickOnStickyRightColumn)
            ) {
              let col = cursorIndex.col
              let row = cursorIndex.row
              let doNotScrollX = false
              let doNotScrollY = false

              if (cursorIndex.col === -1 || clickOnStickyRightColumn) {
                col = columns.length - (hasStickyRightColumn ? 3 : 2)
                doNotScrollX = true
              }

              if (cursorIndex.row === -1) {
                row = data.length - 1
                doNotScrollY = true
              }

              if (rightClickOnSelectedHeaders && selectionCell) {
                col = selectionCell.col
                doNotScrollY = true
              }

              if (
                (rightClickOnSelectedGutter ||
                  clickOnSelectedStickyRightColumn) &&
                selectionCell
              ) {
                row = selectionCell.row
                doNotScrollX = true
              }
              setSelectionCell({ col, row, doNotScrollX, doNotScrollY })
            } else {
              setSelectionCell(null)
            }

            if (clickInside) {
              event.preventDefault()
            }
          }
        },
        [
          contextMenu,
          contextMenuItems.length,
          getCursorIndex,
          editing,
          activeCell,
          columns,
          isCellDisabled,
          selection,
          hasStickyRightColumn,
          disableContextMenu,
          setSelectionMode,
          setActiveCell,
          setSelectionCell,
          selectionCell,
          data.length,
          isEditing,
        ]
      )
      useDocumentEventListener('mousedown', onMouseDown)

      const onMouseUp = useCallback(
        (event: MouseEvent) => {
          // Detect if we stopped pressing the left mouse button
          if (event.button === 0) isLeftMouseButtonPressed.current = false

          if (expandingSelectionFromRowIndex !== null) {
            if (expandSelectionRowsCount > 0 && activeCell) {
              let copyData: Array<Array<string>> = []

              const min: Cell = selection?.min || activeCell
              const max: Cell = selection?.max || activeCell

              for (let row = min.row; row <= max.row; ++row) {
                copyData.push([])

                for (let col = min.col; col <= max.col; ++col) {
                  const { copyValue = () => null } = columns[col + 1]
                  copyData[row - min.row].push(
                    String(
                      copyValue({ rowData: data[row], rowIndex: row }) ?? ''
                    )
                  )
                }
              }

              Promise.all(
                copyData[0].map((_, columnIndex) => {
                  const prePasteValues =
                    columns[min.col + columnIndex + 1]?.prePasteValues

                  const values = copyData.map((row) => row[columnIndex])
                  return prePasteValues?.(values) ?? values
                })
              ).then((results) => {
                copyData = copyData.map((_, rowIndex) =>
                  results.map((column) => column[rowIndex])
                )

                const newData = [...data]

                for (
                  let columnIndex = 0;
                  columnIndex < copyData[0].length;
                  columnIndex++
                ) {
                  const pasteValue =
                    columns[min.col + columnIndex + 1]?.pasteValue

                  if (pasteValue) {
                    for (
                      let rowIndex = max.row + 1;
                      rowIndex <= max.row + expandSelectionRowsCount;
                      rowIndex++
                    ) {
                      if (
                        !isCellDisabled({
                          col: columnIndex + min.col,
                          row: rowIndex,
                        })
                      ) {
                        newData[rowIndex] = pasteValue({
                          rowData: newData[rowIndex],
                          value:
                            copyData[
                              (rowIndex - max.row - 1) % copyData.length
                            ][columnIndex],
                          rowIndex,
                        })
                      }
                    }
                  }
                }

                onChange(newData, [
                  {
                    type: 'UPDATE',
                    fromRowIndex: max.row + 1,
                    toRowIndex: max.row + 1 + expandSelectionRowsCount,
                  },
                ])
              })

              setExpandSelectionRowsCount(0)
              setActiveCell({
                col: Math.min(
                  activeCell?.col ?? Infinity,
                  selection?.min.col ?? Infinity
                ),
                row: Math.min(
                  activeCell?.row ?? Infinity,
                  selection?.min.row ?? Infinity
                ),
                doNotScrollX: true,
                doNotScrollY: true,
              })
              setSelectionCell({
                col: Math.max(activeCell?.col ?? 0, selection?.max.col ?? 0),
                row:
                  Math.max(activeCell?.row ?? 0, selection?.max.row ?? 0) +
                  expandSelectionRowsCount,
              })
            }
            setExpandingSelectionFromRowIndex(null)
          }

          setSelectionMode({
            columns: false,
            rows: false,
            active: false,
          })
        },
        [
          expandingSelectionFromRowIndex,
          setSelectionMode,
          expandSelectionRowsCount,
          activeCell,
          selection?.min,
          selection?.max,
          data,
          onChange,
          setActiveCell,
          setSelectionCell,
          columns,
          isCellDisabled,
        ]
      )
      useDocumentEventListener('mouseup', onMouseUp)

      const onMouseMove = useCallback(
        (event: MouseEvent) => {
          if (expandingSelectionFromRowIndex !== null) {
            const cursorIndex = getCursorIndex(event)

            if (cursorIndex) {
              setExpandSelectionRowsCount(
                Math.max(0, cursorIndex.row - expandingSelectionFromRowIndex)
              )

              scrollTo({
                col: cursorIndex.col,
                row: Math.max(cursorIndex.row, expandingSelectionFromRowIndex),
              })
            }
          }

          if (selectionMode.active) {
            const cursorIndex = getCursorIndex(event)

            const lastColumnIndex =
              columns.length - (hasStickyRightColumn ? 3 : 2)

            setSelectionCell(
              cursorIndex && {
                col: selectionMode.columns
                  ? Math.max(0, Math.min(lastColumnIndex, cursorIndex.col))
                  : lastColumnIndex,
                row: selectionMode.rows
                  ? Math.max(0, cursorIndex.row)
                  : data.length - 1,
                doNotScrollX: !selectionMode.columns,
                doNotScrollY: !selectionMode.rows,
              }
            )

            setEditing(false)
          }

          // Change the active cell when dragging the mouse and when the grid is not loading
          if (isLeftMouseButtonPressed.current && !isLoading && activeCell) {
            const cursorIndex = getCursorIndex(event)
            if (
              cursorIndex &&
              (cursorIndex.col != activeCell.col ||
                cursorIndex.row != activeCell.row) &&
              cursorIndex.col >= 0 &&
              cursorIndex.row >= 0
            ) {
              setActiveCell({ col: cursorIndex?.col, row: cursorIndex?.row })
            }
          }
        },
        [
          scrollTo,
          selectionMode.active,
          selectionMode.columns,
          selectionMode.rows,
          getCursorIndex,
          columns.length,
          hasStickyRightColumn,
          setSelectionCell,
          data.length,
          expandingSelectionFromRowIndex,
          activeCell,
          isLoading,
          setActiveCell,
        ]
      )
      useDocumentEventListener('mousemove', onMouseMove)

      const onWheel = useCallback(
        (event: WheelEvent) => {
          if (activeCell && isLoadingRef.current === false) {
            if ((event as any).wheelDelta > 100) {
              setActiveCell((a) => {
                if (!a) return a

                const row = a.row === 0 ? a.row : a.row - 1

                return a && { col: a.col, row }
              })
            } else if ((event as any).wheelDelta < -100) {
              setActiveCell((a) => {
                if (!a) return a

                const row = Math.min(dataRef.current.length - 1, a.row + 1)

                return a && { col: a.col, row }
              })
            }
          }
        },
        [activeCell, setActiveCell]
      )
      useDocumentEventListener('wheel', onWheel)

      const onKeyDown = useCallback(
        (event: KeyboardEvent) => {
          if (!activeCell || isLoadingRef.current === true) {
            return
          }

          // Tab from last cell of a row
          if (
            event.key === 'Tab' &&
            !event.shiftKey &&
            activeCell.col ===
              columns.length - (hasStickyRightColumn ? 3 : 2) &&
            !columns[activeCell.col + 1].disableKeys
          ) {
            // Last row
            if (activeCell.row === data.length - 1) {
              if (afterTabIndexRef.current) {
                event.preventDefault()

                setActiveCell(null)
                setSelectionCell(null)
                setEditing(false)

                const allElements = getAllTabbableElements()
                const index = allElements.indexOf(afterTabIndexRef.current)

                allElements[(index + 1) % allElements.length].focus()

                return
              }
            } else {
              setActiveCell((cell) => ({ col: 0, row: (cell?.row ?? 0) + 1 }))
              setSelectionCell(null)
              setEditing(false)
              event.preventDefault()

              return
            }
          }

          // Shift+Tab from first cell of a row
          if (
            event.key === 'Tab' &&
            event.shiftKey &&
            activeCell.col === 0 &&
            !columns[activeCell.col + 1].disableKeys
          ) {
            // First row
            if (activeCell.row === 0) {
              if (beforeTabIndexRef.current) {
                event.preventDefault()

                setActiveCell(null)
                setSelectionCell(null)
                setEditing(false)

                const allElements = getAllTabbableElements()
                const index = allElements.indexOf(beforeTabIndexRef.current)

                allElements[
                  (index - 1 + allElements.length) % allElements.length
                ].focus()

                return
              }
            } else {
              setActiveCell((cell) => ({
                col: columns.length - (hasStickyRightColumn ? 3 : 2),
                row: (cell?.row ?? 1) - 1,
              }))
              setSelectionCell(null)
              setEditing(false)
              event.preventDefault()

              return
            }
          }

          if (event.key.startsWith('Arrow') || event.key === 'Tab') {
            if (editing && columns[activeCell.col + 1].disableKeys) {
              return
            }

            if (editing && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
              return
            }

            const add = (
              [x, y]: [number, number],
              cell: Cell | null
            ): Cell | null =>
              cell && {
                col: Math.max(
                  0,
                  Math.min(
                    columns.length - (hasStickyRightColumn ? 3 : 2),
                    cell.col + x
                  )
                ),
                row: Math.max(0, Math.min(data.length - 1, cell.row + y)),
              }

            if (event.key === 'Tab' && event.shiftKey) {
              setActiveCell((cell) => add([-1, 0], cell))
              setSelectionCell(null)
            } else {
              const direction = {
                ArrowDown: [0, 1],
                ArrowUp: [0, -1],
                ArrowLeft: [-1, 0],
                ArrowRight: [1, 0],
                Tab: [1, 0],
              }[event.key] as [number, number]

              if (event.ctrlKey || event.metaKey) {
                direction[0] *= columns.length
                direction[1] *= data.length
              }

              if (event.shiftKey) {
                setSelectionCell((cell) => add(direction, cell || activeCell))
              } else {
                setActiveCell((cell) => add(direction, cell))
                setSelectionCell(null)

                if (
                  isEditing &&
                  ['ArrowDown'].includes(event.key) &&
                  activeCell.row == data.length - 1 &&
                  !newRowsTracker.current?.includes(activeCell.row)
                ) {
                  insertRowAfter(selection?.max.row || activeCell.row)
                }

                if (
                  isEditing &&
                  ['ArrowUp'].includes(event.key) &&
                  activeCell.row == data.length - 1 &&
                  newRowsTracker.current?.includes(activeCell.row) &&
                  data
                    .slice(activeCell.row, activeCell.row + 1)
                    .every((rowData, i) => {
                      if (isRowEmpty) {
                        return isRowEmpty(
                          rowData,
                          newRowsTracker.current?.includes(activeCell.row)
                        )
                      } else {
                        return columns.every((column) =>
                          column.isCellEmpty({
                            rowData,
                            rowIndex: i + activeCell.row,
                          })
                        )
                      }
                    })
                ) {
                  // We don't have to delete since when navigating it deletes automatically
                  //console.log('delete arrow up')
                  // deleteRows(activeCell.row, activeCell.row, true)
                }
              }
            }
            setEditing(false)

            event.preventDefault()
          } else if (event.key === 'Escape') {
            setEditing(false)
          } else if (
            event.key === 'Enter' &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey &&
            !event.shiftKey
          ) {
            setSelectionCell(null)
            if (editing || isCellDisabled(activeCell)) {
              if (!columns[activeCell.col + 1].disableKeys) {
                stopEditing({ nextRow: false })
              }
            } else if (!isCellDisabled(activeCell)) {
              lastEditingCellRef.current = activeCell

              // Només canviem l'estat de la cel·la a editar si estem editant el grid
              if (isEditing) {
                setEditing(true)
              }
              scrollTo(activeCell)
            }
          } else if (
            isEditing &&
            newRowsTracker.current.length === 0 &&
            ((event.key === 'Enter' &&
              !event.ctrlKey &&
              !event.metaKey &&
              !event.altKey &&
              event.shiftKey) ||
              event.key === 'Insert')
          ) {
            // Only insert row when editing and when there is no new rows already created
            insertRowAfter(selection?.max.row || activeCell.row)
          }
          // else if (
          //   event.key === 'd' &&
          //   (event.ctrlKey || event.metaKey) &&
          //   !event.altKey &&
          //   !event.shiftKey
          // ) {
          //   duplicateRows(
          //     selection?.min.row || activeCell.row,
          //     selection?.max.row
          //   )
          //   event.preventDefault()
          // }
          else if (
            event.key.match(/^[ -~]$/) &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey
          ) {
            if (!editing && !isCellDisabled(activeCell)) {
              lastEditingCellRef.current = activeCell
              setSelectionCell(null)
              // Només canviem l'estat de la cel·la a editar si estem editant el grid
              if (isEditing) {
                setEditing(true)
              }
              scrollTo(activeCell)
            }
          }
          // else if (['Backspace'].includes(event.key)) {
          //   if (!editing && isEditing) {
          //     deleteSelection()
          //     event.preventDefault()
          //   }
          // }
          else if (['Delete'].includes(event.key)) {
            if (!editing && isEditing) {
              deleteRows(activeCell.row)
              event.preventDefault()
            }
          } else if (event.key === 'a' && (event.ctrlKey || event.metaKey)) {
            if (!editing) {
              setActiveCell({
                col: 0,
                row: 0,
                doNotScrollY: true,
                doNotScrollX: true,
              })
              setSelectionCell({
                col: columns.length - (hasStickyRightColumn ? 3 : 2),
                row: data.length - 1,
                doNotScrollY: true,
                doNotScrollX: true,
              })
              event.preventDefault()
            }
          }
        },
        [
          activeCell,
          columns,
          data,
          // deleteSelection,
          // duplicateRows,
          editing,
          insertRowAfter,
          isCellDisabled,
          scrollTo,
          selection?.max.row,
          // selection?.min.row,
          setActiveCell,
          setSelectionCell,
          stopEditing,
          hasStickyRightColumn,
          isEditing,
          deleteRows,
          isRowEmpty,
        ]
      )
      useDocumentEventListener('keydown', onKeyDown)

      const find = useCallback(
        (
          search: string,
          caseSensitive: boolean,
          startingRow: number,
          startingCol: number
        ): { row: number; col: number } => {
          for (let r = startingRow; r <= data.length; ++r) {
            for (
              let c = r === startingRow ? startingCol : 0;
              c <= columns.length - 2;
              ++c
            ) {
              const dataRow = data[r]
              if (dataRow) {
                const { columnData } = columns[c + 1]

                const compare = (dataRow as any)[columnData.key]
                if (caseSensitive) {
                  if (compare && compare.toString().includes(search)) {
                    return { row: r, col: c }
                  }
                } else {
                  if (
                    compare &&
                    compare
                      .toString()
                      .toUpperCase()
                      .includes(search.toUpperCase())
                  ) {
                    return { row: r, col: c }
                  }
                }
              }
            }
          }

          return { row: -1, col: -1 }
        },
        [columns, data]
      )

      const searchText = useRef<string | null>(null)
      const searchIndexRow = useRef(-1)
      const searchIndexCol = useRef(-1)
      const onSearch = useCallback(
        (search: string, caseSensitive = false): boolean => {
          let initRow = 0
          let initCol = 0

          if (!searchText.current || searchText.current !== search) {
            searchText.current = search
            searchIndexRow.current = -1
            searchIndexCol.current = -1
          }

          if (searchIndexRow.current > -1) {
            if (searchIndexCol.current + 1 === columns.length) {
              if (searchIndexRow.current + 1 === data.length) {
                initRow = 0
              } else {
                initRow = searchIndexRow.current + 1
              }
            } else {
              initRow = searchIndexRow.current
            }
          }

          if (searchIndexCol.current > -1) {
            if (searchIndexCol.current + 1 === columns.length) initCol = 0
            else initCol = searchIndexCol.current + 1
          }

          const { row, col } = find(search, caseSensitive, initRow, initCol)

          searchIndexRow.current = row
          searchIndexCol.current = col

          if (searchIndexRow.current > -1 && searchIndexCol.current > -1) {
            setActiveCell({
              col: searchIndexCol.current,
              row: searchIndexRow.current,
            })
          }

          return searchIndexRow.current !== -1 && searchIndexCol.current !== -1
        },
        [
          data,
          searchText,
          searchIndexRow,
          searchIndexCol,
          setActiveCell,
          columns,
          find,
        ]
      )

      const goTo = useCallback(
        (line: number) => {
          console.log('goTo: ', line)
          if (!isEditing && line <= data.length) {
            setActiveCell((a) => {
              if (!a) return a
              return { ...a, row: line - 1 }
            })
          }
        },
        [setActiveCell, data, isEditing]
      )

      const onContextMenu = useCallback(
        (event: MouseEvent) => {
          const clickInside =
            innerRef.current?.contains(event.target as Node) || false

          const cursorIndex = clickInside
            ? getCursorIndex(event, true, true)
            : null

          const clickOnActiveCell =
            cursorIndex &&
            activeCell &&
            activeCell.col === cursorIndex.col &&
            activeCell.row === cursorIndex.row &&
            editing

          if (clickInside && !clickOnActiveCell) {
            event.preventDefault()
          }
        },
        [getCursorIndex, activeCell, editing]
      )
      useDocumentEventListener('contextmenu', onContextMenu)

      useEffect(() => {
        CreateContextMenuItems(
          setContextMenuItems,
          () => setContextMenu(null),
          deleteRows,
          duplicateRows,
          insertRowAfter,
          copyAll,
          onSearch,
          goTo,
          data,
          isEditing,
          activeCell?.row,
          selection?.min.row,
          selection?.max.row
        )

        // const items: ContextMenuItem[] = []

        // if (selection?.max.row !== undefined) {
        //   items.push({
        //     type: 'INSERT_ROW_BELLOW',
        //     action: () => {
        //       setContextMenu(null)
        //       insertRowAfter(selection.max.row)
        //     },
        //   })
        // } else if (activeCell?.row !== undefined) {
        //   items.push({
        //     type: 'INSERT_ROW_BELLOW',
        //     action: () => {
        //       setContextMenu(null)
        //       insertRowAfter(activeCell.row)
        //     },
        //   })
        // }

        // if (
        //   selection?.min.row !== undefined &&
        //   selection?.min.row !== selection.max.row
        // ) {
        //   items.push({
        //     type: 'DUPLICATE_ROWS',
        //     fromRow: selection.min.row + 1,
        //     toRow: selection.max.row + 1,
        //     action: () => {
        //       setContextMenu(null)
        //       duplicateRows(selection.min.row, selection.max.row)
        //     },
        //   })
        // } else if (activeCell?.row !== undefined) {
        //   items.push({
        //     type: 'DUPLICATE_ROW',
        //     action: () => {
        //       setContextMenu(null)
        //       duplicateRows(activeCell.row)
        //     },
        //   })
        // }

        // if (
        //   selection?.min.row !== undefined &&
        //   selection.min.row !== selection.max.row
        // ) {
        //   items.push({
        //     type: 'DELETE_ROWS',
        //     fromRow: selection.min.row + 1,
        //     toRow: selection.max.row + 1,
        //     action: () => {
        //       setContextMenu(null)
        //       deleteRows(selection.min.row, selection.max.row)
        //     },
        //   })
        // } else if (activeCell?.row !== undefined) {
        //   items.push({
        //     type: 'DELETE_ROW',
        //     action: () => {
        //       setContextMenu(null)
        //       deleteRows(activeCell.row)
        //     },
        //   })
        // }

        // setContextMenuItems(items)
        // if (!items.length) {
        //   setContextMenu(null)
        // }
      }, [
        activeCell?.row,
        deleteRows,
        duplicateRows,
        insertRowAfter,
        selection?.min.row,
        selection?.max.row,
        CreateContextMenuItems,
        data,
        isEditing,
        copyAll,
        onSearch,
      ])

      const headerContext = useMemoObject<HeaderContextType<T>>({
        hasStickyRightColumn,
        height: headerRowHeight,
        contentWidth: fullWidth ? undefined : contentWidth,
        columns,
        setColumnsWidth: setColumnsWidth,
        activeColMin: selection?.min.col ?? activeCell?.col,
        activeColMax: selection?.max.col ?? activeCell?.col,
      })

      const selectionContext = useMemoObject<SelectionContextType>({
        columnRights,
        columnWidths,
        activeCell,
        selection,
        headerRowHeight,
        rowHeight,
        hasStickyRightColumn,
        dataLength: data.length,
        viewHeight: height,
        viewWidth: width,
        contentWidth: fullWidth ? undefined : contentWidth,
        edges,
        editing,
        isCellDisabled,
        expandSelection,
      })

      const contextMenuItemsRef = useRef(contextMenuItems)
      contextMenuItemsRef.current = contextMenuItems

      const getContextMenuItems = useCallback(
        () => contextMenuItemsRef.current,
        []
      )

      const itemData = useMemoObject<ListItemData<T>>({
        data,
        contentWidth: fullWidth ? undefined : contentWidth,
        columns,
        hasStickyRightColumn,
        activeCell,
        selectionMinRow: selection?.min.row ?? activeCell?.row,
        selectionMaxRow: selection?.max.row ?? activeCell?.row,
        isGridEditing: isEditing,
        newRowsTracker: newRowsTracker.current,
        editing,
        setRowData,
        deleteRows,
        duplicateRows,
        insertRowAfter,
        stopEditing,
        isDataEmpty: isDataEmpty.current,
        getContextMenuItems,
        rowClassName,
        onDoubleClickRow,
      })

      const itemSize = useCallback(
        (index) => (index === 0 ? headerRowHeight : rowHeight),
        [headerRowHeight, rowHeight]
      )

      useImperativeHandle(ref, () => ({
        activeCell: getCellWithId(activeCell, columns),
        selection: getSelectionWithId(
          selection ??
            (activeCell ? { min: activeCell, max: activeCell } : null),
          columns
        ),
        setSelection: (value) => {
          const selection = getSelection(
            value,
            columns.length - (hasStickyRightColumn ? 2 : 1),
            data.length,
            columns
          )

          setActiveCell(selection?.min || null)
          setEditing(false)
          setSelectionMode({ columns: false, active: false, rows: false })
          setSelectionCell(selection?.max || null)
        },
        setActiveCell: (value) => {
          const cell = getCell(
            value,
            columns.length - (hasStickyRightColumn ? 2 : 1),
            data.length,
            columns
          )

          setActiveCell(cell)
          setEditing(false)
          setSelectionMode({ columns: false, active: false, rows: false })
          setSelectionCell(null)
        },
        // Submits the current editing row
        submit: async () => {
          // Only submit if the current row has been modified
          if (activeCell) {
            forbidSubmitOnError.current = false

            const row = data.slice(activeCell.row, activeCell.row + 1)
            const satisfiesRequiredCols = row.every((rowData, i) => {
              return columns.every((column) => {
                if (column.required) {
                  return !column.isCellEmpty({
                    rowData,
                    rowIndex: i + activeCell.row,
                  })
                }
                return true
              })
            })

            const cReqCols = columns.filter((c) => c.required).length

            const success = await submitRowData(
              activeCell.row,
              row[0],
              rowDataInit.current?.data
            )

            // Check why it can give failure
            if (!success) {
              if (
                isDataEmpty.current &&
                (!satisfiesRequiredCols || cReqCols === 0)
              ) {
                // If is the first row of the grid and the required rows are not set or there aren't required rows
                // set the value of the row to its initial value and return true
                onChange(
                  [
                    // ...dataRef.current?.slice(0, activeCell.row),
                    // rowDataInit.current?.data ?? createRow(),
                    // ...dataRef.current?.slice(activeCell.row + 1),
                  ],
                  [
                    {
                      type: 'UPDATE',
                      fromRowIndex: activeCell.row,
                      toRowIndex: activeCell.row + 1,
                    },
                  ]
                )
                return true
              }
            }

            return success
          }
          return true
        },
        search: (search: string, caseSensitive = false) => {
          return onSearch(search, caseSensitive)
        },
        goTo: (line: number) => {
          goTo(line)
        },
      }))

      const callbacksRef = useRef({
        onFocus,
        onBlur,
        onActiveCellChange,
        onSelectionChange,
      })
      callbacksRef.current.onFocus = onFocus
      callbacksRef.current.onBlur = onBlur
      callbacksRef.current.onActiveCellChange = onActiveCellChange
      callbacksRef.current.onSelectionChange = onSelectionChange

      useEffect(() => {
        if (lastEditingCellRef.current) {
          if (editing) {
            callbacksRef.current.onFocus({
              cell: getCellWithId(lastEditingCellRef.current, columns),
            })
          } else {
            callbacksRef.current.onBlur({
              cell: getCellWithId(lastEditingCellRef.current, columns),
            })
          }
        }
      }, [editing, columns])

      useEffect(() => {
        callbacksRef.current.onActiveCellChange({
          cell: getCellWithId(activeCell, columns),
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [activeCell?.col, activeCell?.row, columns])

      useEffect(() => {
        callbacksRef.current.onSelectionChange({
          selection: getSelectionWithId(
            selection ??
              (activeCell ? { min: activeCell, max: activeCell } : null),
            columns
          ),
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [
        // eslint-disable-next-line react-hooks/exhaustive-deps
        selection?.min.col ?? activeCell?.col,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        selection?.min.row ?? activeCell?.row,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        selection?.max.col ?? activeCell?.col,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        selection?.max.row ?? activeCell?.row,
        activeCell?.col,
        activeCell?.row,
        columns,
        data,
      ])

      const footerRef = useRef<HTMLDivElement>(null)
      const contRef = useRef<HTMLDivElement>(null)
      console.log('render grid')
      return (
        <div ref={contRef} className={className} style={style}>
          <div
            ref={beforeTabIndexRef}
            tabIndex={rawColumns.length && data.length ? 0 : undefined}
            onFocus={(e) => {
              e.target.blur()
              setActiveCell({ col: 0, row: 0 })
            }}
          />
          <HeaderContext.Provider value={headerContext}>
            <SelectionContext.Provider value={selectionContext}>
              <VariableSizeList<ListItemData<T>>
                className="dsg-container"
                ref={listRef}
                width={'100%'}
                height={displayHeight - (footerRef.current?.clientHeight ?? 0)}
                itemCount={data.length + 1}
                itemSize={itemSize}
                estimatedItemSize={rowHeight}
                itemData={itemData}
                outerRef={outerRef}
                innerRef={innerRef}
                innerElementType={InnerContainer}
                children={Row}
                useIsScrolling={columns.some(
                  ({ renderWhenScrolling }) => !renderWhenScrolling
                )}
              />
            </SelectionContext.Provider>
          </HeaderContext.Provider>

          <div
            ref={afterTabIndexRef}
            tabIndex={rawColumns.length && data.length ? 0 : undefined}
            onFocus={(e) => {
              e.target.blur()
              setActiveCell({
                col: columns.length - (hasStickyRightColumn ? 3 : 2),
                row: data.length - 1,
              })
            }}
          />
          {FooterComponent && (
            <div ref={footerRef}>
              <FooterComponent />
            </div>
          )}
          {showAddRowsComponent && !lockRows && (
            <AddRowsComponent
              addRows={(count) => insertRowAfter(data.length - 1, count)}
            />
          )}
          {contextMenu && contextMenuItems.length > 0 && (
            <ContextMenuComponent
              clientX={contextMenu.x}
              clientY={contextMenu.y}
              items={contextMenuItems}
              close={() => setContextMenu(null)}
              isGridEditing={isEditing}
            />
          )}
        </div>
      )
    }
  )
) as <T extends any>(
  props: DataSheetGridProps<T> & { ref?: React.ForwardedRef<DataSheetGridRef> }
) => JSX.Element

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
DataSheetGrid.displayName = 'DataSheetGrid'
