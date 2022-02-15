import React, { useMemo, useState } from 'react'
import {
  checkboxColumn,
  Column,
  DataSheetGrid,
  DynamicDataSheetGrid,
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

  const [activeVisible, setActiveVisible] = useState(true)
  const [firstNameVisible, setFirstNameVisible] = useState(true)
  const [lastNameVisible, setLastNameVisible] = useState(true)

  const columns: Column<Row>[] = useMemo(() => {
    let cols = []
    if (activeVisible) {
      cols.push({
        ...keyColumn<Row, 'active'>('active', checkboxColumn),
        title: 'Active',
        width: 0.5,
      })
    }

    if (firstNameVisible) {
      cols.push({
        ...keyColumn<Row, 'firstName'>('firstName', textColumn),
        title: 'First name',
      })
    }

    if (lastNameVisible) {
      cols.push({
        ...keyColumn<Row, 'lastName'>('lastName', textColumn),
        title: 'Last name',
        width: 2,
        disabled: true,
      })
    }

    return cols
  }, [activeVisible, firstNameVisible, lastNameVisible])

  return (
    <div
      style={{
        margin: '50px',
        padding: '50px',
        maxWidth: '900px',
        background: '#f3f3f3',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'row' }}>
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
      </div>
      <button onClick={() => setIsEditing((v) => !v)}>Toggle Edit</button>
      <DynamicDataSheetGrid
        value={data}
        onChange={setData}
        onRowSubmit={(prevValue: Row[], newValue: Row[], rowIndex: number) => {
          setData(newValue)
        }}
        columns={columns}
        isEditing={isEditing}
        onDoubleClickRow={(e) => console.log('onRowDoubleClick: ', e)}
        autoAddRow={true}
      />
    </div>
  )
}

export default App
