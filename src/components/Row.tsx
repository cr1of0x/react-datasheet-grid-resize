import { areEqual, ListChildComponentProps } from 'react-window'
import { ListItemData, RowProps } from '../types'
import React, { useCallback, useEffect, useRef } from 'react'
import cx from 'classnames'
import { Cell } from './Cell'
import { useFirstRender } from '../hooks/useFirstRender'

const nullfunc = () => null

const RowComponent = React.memo(
  ({
    index,
    style,
    data,
    isScrolling,
    columns,
    hasStickyRightColumn,
    active,
    activeColIndex,
    isGridEditing,
    isCreating,
    editing,
    setRowData,
    deleteRows,
    insertRowAfter,
    duplicateRows,
    stopEditing,
    getContextMenuItems,
    onDoubleClickRow,
    rowClassName,
    isDataEmpty,
  }: RowProps<any>) => {
    const firstRender = useFirstRender()

    // True when we should render the light version (when we are scrolling)
    const renderLight = isScrolling && firstRender

    const lastActive = useRef<boolean>(active)

    const setGivenRowData = useCallback(
      (rowData: any) => {
        setRowData(index, rowData, !active)
      },
      [index, setRowData, active]
    )

    const deleteGivenRow = useCallback(() => {
      deleteRows(index)
    }, [deleteRows, index])

    const duplicateGivenRow = useCallback(() => {
      duplicateRows(index)
    }, [duplicateRows, index])

    const insertAfterGivenRow = useCallback(() => {
      insertRowAfter(index)
    }, [insertRowAfter, index])

    useEffect(() => {
      // Send onRowSubmit if it was active at the previous state and now is not active
      if (lastActive.current === true && !active && isGridEditing) {
        setGivenRowData(data)
      }

      lastActive.current = active
    }, [active, isGridEditing, setGivenRowData, data])

    return (
      <div
        className={cx(
          'dsg-row',
          typeof rowClassName === 'string' ? rowClassName : null,
          typeof rowClassName === 'function'
            ? rowClassName({ rowData: data, rowIndex: index })
            : null
        )}
        onDoubleClick={() => {
          if (onDoubleClickRow) onDoubleClickRow(data)
        }}
        style={style}
      >
        {columns.map((column, i) => {
          const Component = column.component

          const disabled =
            column.disabled === true ||
            (typeof column.disabled === 'function' &&
              column.disabled({ rowData: data, rowIndex: index, isCreating }))

          return (
            <Cell
              key={i}
              gutter={i === 0}
              disabled={disabled}
              stickyRight={hasStickyRightColumn && i === columns.length - 1}
              column={column}
              active={active}
              editing={editing && activeColIndex === i - 1}
              className={cx(
                !column.renderWhenScrolling && renderLight && 'dsg-cell-light',
                typeof column.cellClassName === 'function'
                  ? column.cellClassName({ rowData: data, rowIndex: index })
                  : column.cellClassName,
                isDataEmpty ? 'dsg-cell-initial' : null
              )}
            >
              {(column.renderWhenScrolling || !renderLight) && (
                <Component
                  rowData={data}
                  getContextMenuItems={getContextMenuItems}
                  disabled={disabled}
                  active={activeColIndex === i - 1}
                  columnIndex={i - 1}
                  rowIndex={index}
                  focus={activeColIndex === i - 1 && editing}
                  deleteRow={deleteGivenRow}
                  duplicateRow={duplicateGivenRow}
                  stopEditing={
                    activeColIndex === i - 1 && editing && stopEditing
                      ? stopEditing
                      : nullfunc
                  }
                  align={column.align}
                  insertRowBelow={insertAfterGivenRow}
                  setRowData={setGivenRowData}
                  columnData={column.columnData}
                />
              )}
            </Cell>
          )
        })}
      </div>
    )
  },
  (prevProps, nextProps) => {
    const { isScrolling: prevIsScrolling, ...prevRest } = prevProps
    const { isScrolling: nextIsScrolling, ...nextRest } = nextProps

    // When we are scrolling always re-use previous render, otherwise check props
    return nextIsScrolling || (!prevIsScrolling && areEqual(prevRest, nextRest))
  }
)

RowComponent.displayName = 'RowComponent'

export const Row = <T extends any>({
  index,
  style,
  data,
  isScrolling,
}: ListChildComponentProps<ListItemData<T>>) => {
  // Do not render header row, it is rendered by the InnerContainer
  if (index === 0) {
    return null
  }

  return (
    <RowComponent
      index={index - 1}
      data={data.data[index - 1]}
      isDataEmpty={data.isDataEmpty}
      columns={data.columns}
      style={{
        ...style,
        width: data.contentWidth ? data.contentWidth : '100%',
      }}
      hasStickyRightColumn={data.hasStickyRightColumn}
      isScrolling={isScrolling}
      active={Boolean(
        index - 1 >= (data.selectionMinRow ?? Infinity) &&
          index - 1 <= (data.selectionMaxRow ?? -Infinity) &&
          data.activeCell
      )}
      activeColIndex={
        data.activeCell?.row === index - 1 ? data.activeCell.col : null
      }
      editing={Boolean(data.activeCell?.row === index - 1 && data.editing)}
      setRowData={data.setRowData}
      deleteRows={data.deleteRows}
      insertRowAfter={data.insertRowAfter}
      duplicateRows={data.duplicateRows}
      stopEditing={
        data.activeCell?.row === index - 1 && data.editing
          ? data.stopEditing
          : undefined
      }
      getContextMenuItems={data.getContextMenuItems}
      rowClassName={data.rowClassName}
      onDoubleClickRow={data.onDoubleClickRow}
      isGridEditing={data.isGridEditing}
      isCreating={data.newRowsTracker.includes(index - 1)}
    />
  )
}
