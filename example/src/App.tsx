import React, { useMemo, useState } from 'react'
import {
  checkboxColumn,
  Column,
  createTextColumn,
  DynamicDataSheetGrid,
  keyColumn,
  textColumn,
} from 'react-datasheet-grid'
import 'react-datasheet-grid/dist/style.css'
import AutoSizer, { Size } from 'react-virtualized-auto-sizer'
import { Operation } from '../../dist/types'
import './style.css'

type Row = {
  active: boolean
  firstName: string | null
  lastName: string | null
}

function App() {
  const [isEditing, setIsEditing] = useState(false)
  const [data, setData] = useState<Row[]>([
    { active: true, firstName: 'Elon', lastName: 'Musk' },
    { active: false, firstName: 'Jeff', lastName: 'Bezos' },
  ])

  const [activeVisible, setActiveVisible] = useState(true)
  const [firstNameVisible, setFirstNameVisible] = useState(true)
  const [lastNameVisible, setLastNameVisible] = useState(true)

  // const columns: Column<Row>[] = useMemo(() => {
  //   let cols = []
  //   if (activeVisible) {
  //     cols.push({
  //       ...keyColumn<Row, 'active'>('active', checkboxColumn),
  //       title: 'Active',
  //       width: 0.5,
  //       align: 'center',
  //     })
  //   }

  //   if (firstNameVisible) {
  //     cols.push({
  //       ...keyColumn<Row, 'firstName'>('firstName', textColumn),
  //       title: 'First name',
  //       align: 'center',
  //     })
  //   }

  //   if (lastNameVisible) {
  //     cols.push({
  //       ...keyColumn<Row, 'lastName'>('lastName', textColumn),
  //       title: 'Last name',
  //       width: 2,
  //       disabled: true,
  //       align: 'center',
  //     })
  //   }

  //   return cols
  // }, [activeVisible, firstNameVisible, lastNameVisible])

  const columns: Column<Row>[] = [
    {
      ...keyColumn<Row, 'active'>('active', checkboxColumn),
      title: 'Active',
      width: 0.5,
      align: 'start',
    },
    {
      ...createTextColumn({}),
      // ...keyColumn<Row, 'firstName'>('firstName', textColumn),
      title: 'First name',
    },
    {
      ...keyColumn<Row, 'lastName'>('lastName', textColumn),
      title: 'Last name',
      width: 2,
      disabled: ({ rowData, rowIndex, isCreating }) => {
        return false
        // return false;
      },
    },
  ]

  return (
    <div
      style={{
        maxWidth: '900px',
        background: '#f3f3f3',
        height: '500px',
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
      }}
    >
      {/* <div style={{ display: 'flex', flexDirection: 'row' }}>
        <button
          onClick={() => {
            setActiveVisible((v) => !v)
          }}
        >
          Toggle active
        </button>
        <button
          onClick={() => {
            setFirstNameVisible((v) => !v)
          }}
        >
          Toggle first name
        </button>
        <button
          onClick={() => {
            setLastNameVisible((v) => !v)
          }}
        >
          Toggle last name
        </button>
      </div> */}
      <button onClick={() => setIsEditing((v) => !v)}>Toggle Edit</button>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
        }}
      >
        <AutoSizer>
          {({ height, width }: Size) => (
            <DynamicDataSheetGrid
              style={{
                height: height,
                width: width,
              }}
              isRowEmpty={(rowData: any, isCreating: boolean) => {
                return true
              }}
              value={data}
              onChange={(value: any[], operations: Operation[]) => {
                console.log('onChange grid: ', operations, value)
                setData(value)
              }}
              onRowSubmit={async (
                prevValue: Row[],
                newValue: Row[],
                rowIndex: number
              ) => {
                console.log('onRowSubmit: ', prevValue, newValue)
                setData(newValue)
                return true
              }}
              columns={columns}
              isEditing={isEditing}
              onDoubleClickRow={(e) => console.log('onRowDoubleClick: ', e)}
              autoAddRow={true}
              height={height}
              // width={width}
            />
          )}
        </AutoSizer>
      </div>
    </div>
  )
}

export default App
