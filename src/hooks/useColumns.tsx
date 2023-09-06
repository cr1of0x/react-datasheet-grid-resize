import React, { useEffect, useMemo, useState } from 'react';
import { CellProps, Column, SimpleColumn } from '../types';

const defaultComponent = () => <></>;
const defaultIsCellEmpty = () => false;
const identityRow = <T extends any>({ rowData }: { rowData: T }) => rowData;
const defaultCopyValue = () => null;
const defaultGutterComponent = ({ rowIndex }: CellProps<any, any>) => (
  <>{rowIndex + 1}</>
);
const cellAlwaysEmpty = () => true;
const defaultPrePasteValues = (values: string[]) => values;

export const parseFlexValue = (value: string | number) => {
  if (typeof value === 'number') {
    return {
      basis: 0,
      grow: value,
      shrink: 1,
    }
  }

  if (value.match(/^ *\d+(\.\d*)? *$/)) {
    return {
      basis: 0,
      grow: parseFloat(value.trim()),
      shrink: 1,
    }
  }

  if (value.match(/^ *\d+(\.\d*)? *px *$/)) {
    return {
      basis: parseFloat(value.trim()),
      grow: 1,
      shrink: 1,
    }
  }

  if (value.match(/^ *\d+(\.\d*)? \d+(\.\d*)? *$/)) {
    const [grow, shrink] = value.trim().split(' ')
    return {
      basis: 0,
      grow: parseFloat(grow),
      shrink: parseFloat(shrink),
    }
  }

  if (value.match(/^ *\d+(\.\d*)? \d+(\.\d*)? *px *$/)) {
    const [grow, basis] = value.trim().split(' ')
    return {
      basis: parseFloat(basis),
      grow: parseFloat(grow),
      shrink: 1,
    }
  }

  if (value.match(/^ *\d+(\.\d*)? \d+(\.\d*)? \d+(\.\d*)? *px *$/)) {
    const [grow, shrink, basis] = value.trim().split(' ')
    return {
      basis: parseFloat(basis),
      grow: parseFloat(grow),
      shrink: parseFloat(shrink),
    }
  }

  return {
    basis: 0,
    grow: 1,
    shrink: 1,
  }
};

export const useColumns = <T extends any>(
  columns: Partial<Column<T, any, any>>[],
  gutterColumn?: SimpleColumn<T, any> | false,
  stickyRightColumn?: SimpleColumn<T, any>
): [
  Column<T, any, any>[],
  React.Dispatch<
    React.SetStateAction<
      {
        colIndex: number;
        width: number;
      }[]
    >
  >
] => {
  const [columnsWidth, setColumnsWidth] = useState<
    { colIndex: number; width: number }[]
  >(
    columns.map((column, index) => {
      let width = 1;
      if (typeof column.width === 'string') {
        width = parseInt(column.width);
      }
      return { colIndex: index + 1, width: width };
    })
  );

  return [
    useMemo<Column<T, any, any>[]>(() => {
      const partialColumns: Partial<Column<T, any, any>>[] = [
        gutterColumn === false
          ? {
              width: 0,
              minWidth: 0,
              component: () => <></>,
              headerClassName: 'dsg-hidden-cell',
              cellClassName: 'dsg-hidden-cell',
              isCellEmpty: cellAlwaysEmpty,
            }
          : {
              ...gutterColumn,
              width: gutterColumn?.width ?? '0 0 40px',
              minWidth: gutterColumn?.minWidth ?? 0,
              title: gutterColumn?.title ?? <div className="dsg-corner-indicator" />,
              component: gutterColumn?.component ?? defaultGutterComponent,
              isCellEmpty: cellAlwaysEmpty,
            },
        ...columns,
      ];

      if (stickyRightColumn) {
        partialColumns.push({
          ...stickyRightColumn,
          width: stickyRightColumn.width ?? '0 0 40px',
          minWidth: stickyRightColumn.minWidth ?? 0,
          isCellEmpty: cellAlwaysEmpty,
        });
      }

      return partialColumns.map<Column<T, any, any>>((column, index) => {
        let width = column.width ?? 1;
        const col = columnsWidth?.find((x) => x.colIndex === index);
        if (col && col.width) {
          width = `0 0 ${col?.width}px`;
        }

        return {
          ...column,
          width: width,
          minWidth: column.minWidth ?? 100,
          renderWhenScrolling: column.renderWhenScrolling ?? true,
          component: column.component ?? defaultComponent,
          disableKeys: column.disableKeys ?? false,
          disabled: column.disabled ?? false,
          required: column.required ?? false,
          keepFocus: column.keepFocus ?? false,
          deleteValue: column.deleteValue ?? identityRow,
          copyValue: column.copyValue ?? defaultCopyValue,
          pasteValue: column.pasteValue ?? identityRow,
          prePasteValues: column.prePasteValues ?? defaultPrePasteValues,
          isCellEmpty: column.isCellEmpty ?? defaultIsCellEmpty,
        };
      });
    }, [gutterColumn, stickyRightColumn, columns, columnsWidth]),
    setColumnsWidth,
  ];
};
