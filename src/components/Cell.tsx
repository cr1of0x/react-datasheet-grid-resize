import React, { FC, useEffect, useState } from 'react'
import cx from 'classnames'
import { Column } from '../types'

export const Cell: FC<{
  gutter: boolean
  stickyRight: boolean
  disabled?: boolean
  column: Column<any, any, any>
  className: string
  active?: boolean
  editing?: boolean
}> = ({
  children,
  gutter,
  stickyRight,
  column,
  active,
  editing,
  disabled,
  className,
}) => {
  return (
    <div
      className={cx(
        'dsg-cell',
        gutter && 'dsg-cell-gutter',
        disabled && !active && 'dsg-cell-disabled',
        gutter && active && 'dsg-cell-gutter-active',
        stickyRight && 'dsg-cell-sticky-right',
        active && !editing && 'dsg-cell-active-row',
        editing && 'dsg-cell-editing',
        className
      )}
      style={{
        flex: String(column.width),
        minWidth: column.minWidth,
        maxWidth: column.maxWidth,
      }}
    >
      {children}
    </div>
  )
}
