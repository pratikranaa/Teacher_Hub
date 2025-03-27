import React from "react"

export function DataTable<T>({
  columns,
  data,
}: {
  columns: { header: string; accessorKey: string; cell?: (row: any) => React.ReactNode }[]
  data: T[]
}) {
  return (
    <table className="min-w-full border-collapse border border-gray-300">
      <thead>
        <tr>
          {columns.map((col, index) => (
            <th key={index} className="border border-gray-300 p-2 text-left">
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {columns.map((col, colIndex) => (
              <td key={colIndex} className="border border-gray-300 p-2">
                {col.cell ? col.cell({ row }) : (row as Record<string, any>)[col.accessorKey]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}