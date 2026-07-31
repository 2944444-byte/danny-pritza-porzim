/**
 * DataGrid.tsx
 * -----------------------------------------------------------------------------
 * The editable table (Mantine Table). Header derived from COLUMNS, one row per
 * record with a delete action, and an EditableCell per column. Presentational —
 * all state/behavior arrive via props from usePhoneTable.
 */

import { ActionIcon, Table, Text } from '@mantine/core';
import { COLUMNS } from '../config/columns';
import { EditableCell } from './EditableCell';
import type { CellErrorsById, CellValue, GridRow, SchemaMeta } from '../types';

export interface DataGridProps {
  rows: GridRow[];
  errorsById: CellErrorsById;
  schemaOptions: SchemaMeta;
  onCellChange: (rowId: string, key: string, value: CellValue) => void;
  onDeleteRow: (rowId: string) => void;
}

export function DataGrid({
  rows,
  errorsById,
  schemaOptions,
  onCellChange,
  onDeleteRow,
}: DataGridProps) {
  return (
    <Table.ScrollContainer minWidth={820}>
      <Table verticalSpacing="xs" horizontalSpacing="xs" withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={40} ta="center">
              #
            </Table.Th>
            {COLUMNS.map((col) => (
              <Table.Th key={col.key}>
                {col.label}
                {col.required && (
                  <Text span c="red" title="Required">
                    {' '}
                    *
                  </Text>
                )}
              </Table.Th>
            ))}
            <Table.Th w={64} ta="center">
              Actions
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row, index) => {
            const rowErrors = errorsById[row._id] ?? {};
            return (
              <Table.Tr key={row._id}>
                <Table.Td ta="center" c="dimmed">
                  {index + 1}
                </Table.Td>
                {COLUMNS.map((col) => (
                  <EditableCell
                    key={col.key}
                    column={col}
                    rowId={row._id}
                    value={row[col.key]}
                    error={rowErrors[col.key]}
                    dropdownOptions={
                      col.type === 'dropdown'
                        ? schemaOptions[col.dropdownKey ?? col.key]
                        : undefined
                    }
                    onChange={onCellChange}
                  />
                ))}
                <Table.Td ta="center">
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() => onDeleteRow(row._id)}
                    aria-label={`Delete row ${index + 1}`}
                    title="Delete this row"
                  >
                    ✕
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
