import React, { useCallback, useMemo, useState } from 'react'
import { useRef } from 'react'
import {
  checkboxColumn,
  Column,
  createTextColumn,
  DynamicDataSheetGrid,
  intColumn,
  keyColumn,
  textColumn,
} from 'react-datasheet-grid'
import 'react-datasheet-grid/dist/style.css'
import AutoSizer, { Size } from 'react-virtualized-auto-sizer'
import { DataSheetGridRef, Operation, OperationSubmit } from '../../dist/types'
import './style.css'

type Row = {
  active: boolean
  firstName: string | null
  lastName: string | null
  age: number
  comptador: number
}

function App() {
  const [isEditing, setIsEditing] = useState(false)
  const [data, setData] = useState<Row[]>([
    // { active: true, firstName: 'Elon', lastName: 'Musk' },
    // { active: false, firstName: 'Jeff', lastName: 'Bezos' },
  ])

  const ref = useRef<DataSheetGridRef>(null)

  const [isGridLoading, setIsGridLoading] = useState(false)

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

  const columns: Column<any>[] = [
    {
      ...keyColumn<Row, 'active'>('active', checkboxColumn),
      title: 'Active',
      align: 'start',
      grow: 0.5,
    },
    {
      ...keyColumn<Row, 'firstName'>('firstName', textColumn),
      title: 'First name',
      disabled: false,
    },
    {
      ...keyColumn<Row, 'lastName'>('lastName', textColumn),
      title: 'Last name',
      grow: 2,
      // required: true,
      disableKeys: true,
    },
    {
      ...keyColumn('age', intColumn),
      title: 'Age',
      width: 2,
    },
  ]

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms))

  const onRowSubmit = useCallback(
    async (
      prevValue: Row[],
      newValue: Row[],
      rowIndex: number,
      operation: OperationSubmit
    ) => {
      console.log('onRowSubmit: ', prevValue, newValue, operation)
      // setIsGridLoading(true)
      await sleep(1000)
      // setData(newValue)

      const rdata = newValue[rowIndex]
      setData([
        ...newValue?.slice(0, rowIndex),
        { ...rdata, comptador: 3 },
        // { ...rdata },
        ...newValue?.slice(rowIndex + 1),
      ])

      // setIsGridLoading(false)
      return true
    },
    [setData]
  )

  return (
    <div style={{ display: 'flex' }}>
      <div
        style={{ height: '100%', width: '44px', backgroundColor: 'red' }}
      ></div>
      <div
        style={{
          left: '44px',
          maxWidth: '900px',
          background: '#f3f3f3',
          height: '300px',
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
        <button onClick={() => ref.current?.submit()}>Submit</button>
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
                ref={ref}
                style={{
                  height: height,
                  width: width,
                }}
                isRowEmpty={(rowData: any, isCreating: boolean) => {
                  return !rowData.firstName
                }}
                isLoading={isGridLoading}
                value={data}
                onChange={(value: any[], operations: Operation[]) => {
                  console.log('onChange grid: ', operations, value)
                  setData(value)
                }}
                onRowSubmit={onRowSubmit}
                columns={columns}
                isEditing={isEditing}
                onDoubleClickRow={(e) => console.log('onRowDoubleClick: ', e)}
                autoAddRow={true}
                height={height}
                footerComponent={() => (
                  <div>{isGridLoading ? 'true' : 'false'}</div>
                )}
                // width={width}
              />
            )}
          </AutoSizer>
        </div>
      </div>
    </div>
  )
}

export default App
