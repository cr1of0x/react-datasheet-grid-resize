import React, { FC, useEffect, useState } from 'react'
import cx from 'classnames'

export const Cell: FC<{
  gutter: boolean
  stickyRight: boolean
  disabled?: boolean
  className?: string
  active?: boolean
  editing?: boolean
  children?: any
  width: number
  left: number
}> = ({
  children,
  gutter,
  stickyRight,
  active,
  editing,
  disabled,
  className,
  width,
  left,
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
        width,
        left: stickyRight ? undefined : left,
      }}
    >
      {children}
    </div>
  )
}
