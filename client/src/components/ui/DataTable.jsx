import React from 'react';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';

export const DataTable = ({
  headers = [],
  data = [],
  loading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There is no data to show in this table.',
  renderRow,
  className = '',
  tableClassName = '',
}) => {
  return (
    <div className={`table-container bg-dark-800 ${className}`}>
      <table className={`table ${tableClassName}`}>
        <thead>
          <tr>
            {headers.map((h, idx) => (
              <th
                key={idx}
                className={h.className || ''}
                style={h.style || {}}
              >
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            [...Array(5)].map((_, i) => (
              <tr key={i} className="hover:bg-transparent">
                <td colSpan={headers.length} className="px-4 py-3">
                  <div className="flex gap-4 items-center w-full">
                    <Skeleton className="w-6 h-6 flex-shrink-0" />
                    <Skeleton className="h-4 flex-1 w-full" />
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </div>
                </td>
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-4 py-8">
                <EmptyState
                  title={emptyTitle}
                  description={emptyDescription}
                  className="border-0 shadow-none bg-transparent py-4"
                />
              </td>
            </tr>
          ) : (
            data.map((item, idx) => renderRow(item, idx))
          )}
        </tbody>
      </table>
    </div>
  );
};
