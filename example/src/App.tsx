import React, { useState } from 'react'
import {
  checkboxColumn,
  Column,
  DataSheetGrid,
  keyColumn,
  textColumn,
} from 'react-datasheet-grid'
import 'react-datasheet-grid/dist/style.css'
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

  const columns: Column<Row>[] = [
    {
      ...keyColumn<Row, 'active'>('active', checkboxColumn),
      title: 'Active',
      width: 0.5,
    },
    {
      ...keyColumn<Row, 'firstName'>('firstName', textColumn),
      title: 'First name',
    },
    {
      ...keyColumn<Row, 'lastName'>('lastName', textColumn),
      title: 'Last name',
      width: 2,
    },
  ]

  return (
    <div
      style={{
        margin: '50px',
        padding: '50px',
        maxWidth: '900px',
        background: '#f3f3f3',
      }}
    >
      <button onClick={() => setIsEditing((v) => !v)}>Toggle Edit</button>
      <DataSheetGrid
        value={data}
        onChange={setData}
        onRowSubmit={(prevValue: Row[], newValue: Row[], rowIndex: number) => {
          console.log('onRowSubmit: ', prevValue, newValue, rowIndex)
          setData(newValue)
        }}
        columns={columns}
        isEditing={isEditing}
        onActiveCellChange={(props: any) =>
          console.log('onActiveCellChange: ', props)
        }
        onSelectionChange={(props: any) =>
          console.log('onSelectionChange: ', props)
        }
        onDoubleClickRow={(e) => console.log('onRowDoubleClick: ', e)}
      />
    </div>
  )
}

export default App
