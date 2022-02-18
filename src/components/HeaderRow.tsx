import React, { FC, useContext, useEffect, useRef, useState } from 'react'
import { HeaderContext } from '../contexts/HeaderContext'
import cx from 'classnames'
import { Cell } from './Cell'
import { Column } from '../types'

export const HeaderRow = React.memo(() => {
  const {
    columns,
    contentWidth,
    height,
    hasStickyRightColumn,
    activeColMin,
    activeColMax,
    setColumnsWidth,
  } = useContext(HeaderContext)

  return (
    <div
      className={cx('dsg-row', 'dsg-row-header')}
      style={{
        width: contentWidth ? contentWidth : '100%',
        height,
      }}
    >
      {columns.map((column, i) => (
        <Cell
          key={i}
          gutter={i === 0}
          stickyRight={hasStickyRightColumn && i === columns.length - 1}
          column={column}
          className={cx(
            'dsg-cell-header',
            activeColMin !== undefined &&
              activeColMax !== undefined &&
              activeColMin <= i - 1 &&
              activeColMax >= i - 1 &&
              'dsg-cell-header-active',
            column.headerClassName
          )}
        >
          <div className="dsg-cell-header-container">{column.title}</div>
          <Resizer
            column={column}
            setColumnWidth={setColumnsWidth}
            columnIndex={i}
          />
        </Cell>
      ))}
    </div>
  )
})

const Resizer: FC<{
  column: Column<any, any, any>
  setColumnWidth: any
  columnIndex: number
}> = ({ column, setColumnWidth, columnIndex }) => {
  // Track the current position of mouse

  const x = useRef(0)
  const w = useRef(0)
  const resizerRef = useRef<any>()

  useEffect(() => {
    resizerRef.current.addEventListener('mousedown', mouseDownHandler)

    return () => {
      document.removeEventListener('mousemove', mouseMoveHandler)
      document.removeEventListener('mouseup', mouseUpHandler)
    }
  }, [])

  const mouseDownHandler = function (e: any) {
    // Get the current mouse position
    x.current = e.clientX

    const width = resizerRef.current.parentElement.clientWidth

    w.current = width

    // Attach listeners for document's events
    document.addEventListener('mousemove', mouseMoveHandler)
    document.addEventListener('mouseup', mouseUpHandler)
  }

  const mouseMoveHandler = function (e: any) {
    // Determine how far the mouse has been moved
    const dx = e.clientX - x.current

    // Update the width of column
    setColumnWidth((cols: any) =>
      cols.map((x: any) => {
        if (x.colIndex === columnIndex) {
          x.width = w.current + dx
        }
        return x
      })
    )
  }

  // When user releases the mouse, remove the existing event listeners
  const mouseUpHandler = function () {
    document.removeEventListener('mousemove', mouseMoveHandler)
    document.removeEventListener('mouseup', mouseUpHandler)
  }

  return <div ref={resizerRef} className="dsg-resizer"></div>
}

HeaderRow.displayName = 'HeaderRow'
