// Tabellen-Dokument mit Inline-Editing

import React, { useState, useRef, useEffect } from 'react';
import { Table, List, Plus } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { Document, TableEntry, TableColumn } from '../../types';

interface TableDocumentProps {
  document: Document;
  tableEntries: TableEntry[];
  workspaceId: string;
  viewMode: 'table' | 'list';
  contentUpdated: boolean;
  updatedRowId: string | null;
  onEntriesChange: (entries: TableEntry[]) => void;
}

export const TableDocument: React.FC<TableDocumentProps> = ({
  document,
  tableEntries,
  workspaceId,
  viewMode,
  contentUpdated,
  updatedRowId,
  onEntriesChange
}) => {
  // Inline-Editing State
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnKey: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingCell, setSavingCell] = useState(false);
  const [savedCell, setSavedCell] = useState<{ rowId: string; columnKey: string } | null>(null);
  const editInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const isNavigatingRef = useRef(false);
  const rowRefs = useRef<Record<string, HTMLDivElement | HTMLTableRowElement | null>>({});

  // Fokus auf Edit-Input
  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.selectionStart = editInputRef.current.value.length;
    }
  }, [editingCell]);

  const columns = document.table_schema?.columns || [];

  // === EDITING FUNKTIONEN ===

  const startEditing = (rowId: string, columnKey: string, currentValue: string | number | null | undefined) => {
    setEditingCell({ rowId, columnKey });
    setEditValue(currentValue?.toString() || '');
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const getAdjacentCell = (direction: 'next' | 'prev'): { rowId: string; columnKey: string } | null => {
    if (!editingCell) return null;
    
    const currentRowIndex = tableEntries.findIndex(e => e.row_id === editingCell.rowId);
    const currentColIndex = columns.findIndex(c => c.key === editingCell.columnKey);
    
    if (currentRowIndex === -1 || currentColIndex === -1) return null;
    
    if (direction === 'next') {
      if (currentColIndex < columns.length - 1) {
        return { rowId: editingCell.rowId, columnKey: columns[currentColIndex + 1].key };
      }
      if (currentRowIndex < tableEntries.length - 1) {
        return { rowId: tableEntries[currentRowIndex + 1].row_id, columnKey: columns[0].key };
      }
    } else {
      if (currentColIndex > 0) {
        return { rowId: editingCell.rowId, columnKey: columns[currentColIndex - 1].key };
      }
      if (currentRowIndex > 0) {
        return { rowId: tableEntries[currentRowIndex - 1].row_id, columnKey: columns[columns.length - 1].key };
      }
    }
    
    return null;
  };

  const saveCellAndNavigate = async (direction: 'next' | 'prev' | null) => {
    if (!editingCell) return;
    
    if (direction !== null) {
      isNavigatingRef.current = true;
    }
    
    const { rowId, columnKey } = editingCell;
    const currentEntry = tableEntries.find(e => e.row_id === rowId);
    const nextCell = direction ? getAdjacentCell(direction) : null;
    
    if (!currentEntry) {
      cancelEditing();
      isNavigatingRef.current = false;
      return;
    }

    const oldValue = currentEntry.data[columnKey]?.toString() || '';
    
    if (oldValue !== editValue) {
      setSavingCell(true);

      const newData = { ...currentEntry.data, [columnKey]: editValue };

      const { error } = await supabase.from('table_entries').insert({
        document_id: currentEntry.document_id,
        workspace_id: workspaceId,
        row_id: rowId,
        data: newData,
        version: currentEntry.version + 1,
        position: currentEntry.position
      });

      if (!error) {
        onEntriesChange(tableEntries.map(e => 
          e.row_id === rowId ? { ...e, data: newData, version: e.version + 1 } : e
        ));
        
        setSavedCell({ rowId, columnKey });
        setTimeout(() => setSavedCell(null), 1000);
      }

      setSavingCell(false);
    }

    setEditingCell(null);
    setEditValue('');
    
    if (nextCell) {
      const nextEntry = tableEntries.find(e => e.row_id === nextCell.rowId);
      const nextValue = nextEntry?.data[nextCell.columnKey];
      setTimeout(() => {
        startEditing(nextCell.rowId, nextCell.columnKey, nextValue);
        isNavigatingRef.current = false;
      }, 50);
    } else {
      isNavigatingRef.current = false;
    }
  };

  const handleCellBlur = () => {
    if (isNavigatingRef.current) return;
    saveCellAndNavigate(null);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, columnType: string) => {
    if (e.key === 'Escape') {
      cancelEditing();
    } else if (e.key === 'Enter') {
      if (columnType === 'textarea' && !e.shiftKey) {
        e.preventDefault();
        saveCellAndNavigate(null);
      } else if (columnType !== 'textarea') {
        e.preventDefault();
        saveCellAndNavigate(null);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      saveCellAndNavigate(e.shiftKey ? 'prev' : 'next');
    }
  };

  const addNewRow = async () => {
    const emptyData: Record<string, string> = {};
    columns.forEach(col => { emptyData[col.key] = ''; });

    const newRowId = crypto.randomUUID();
    const maxPosition = tableEntries.length > 0 
      ? Math.max(...tableEntries.map(e => e.position)) 
      : 0;

    const { error } = await supabase.from('table_entries').insert({
      document_id: document.id,
      workspace_id: workspaceId,
      row_id: newRowId,
      data: emptyData,
      version: 1,
      position: maxPosition + 1
    });

    if (!error) {
      const newEntry: TableEntry = {
        id: crypto.randomUUID(),
        document_id: document.id,
        workspace_id: workspaceId,
        row_id: newRowId,
        data: emptyData,
        version: 1,
        position: maxPosition + 1,
        created_at: new Date().toISOString()
      };
      onEntriesChange([...tableEntries, newEntry]);
      
      setTimeout(() => {
        startEditing(newRowId, columns[0].key, '');
      }, 50);
    }
  };

  // === RENDER HELPERS ===

  const renderCellDisplayValue = (value: string | number | null | undefined, type: string) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-300 italic">Leer</span>;
    }

    switch (type) {
      case 'url':
        return (
          <a href={String(value)} target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-blue-600 hover:underline truncate block max-w-[200px]">
            {String(value)}
          </a>
        );
      case 'textarea':
        return <span className="whitespace-pre-wrap line-clamp-3">{String(value)}</span>;
      case 'email':
        return (
          <a href={`mailto:${value}`} onClick={(e) => e.stopPropagation()}
            className="text-blue-600 hover:underline">
            {String(value)}
          </a>
        );
      default:
        return String(value);
    }
  };

  const renderEditableCell = (entry: TableEntry, column: TableColumn) => {
    const value = entry.data[column.key];
    const isEditing = editingCell?.rowId === entry.row_id && editingCell?.columnKey === column.key;
    const justSaved = savedCell?.rowId === entry.row_id && savedCell?.columnKey === column.key;

    if (isEditing) {
      if (column.type === 'textarea') {
        return (
          <textarea
            ref={editInputRef as React.RefObject<HTMLTextAreaElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleCellBlur}
            onKeyDown={(e) => handleEditKeyDown(e, column.type)}
            className="w-full min-h-[60px] px-2 py-1 text-sm border border-blue-400 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 resize-y"
            disabled={savingCell}
          />
        );
      }

      return (
        <input
          ref={editInputRef as React.RefObject<HTMLInputElement>}
          type={column.type === 'number' ? 'number' : column.type === 'date' ? 'date' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleCellBlur}
          onKeyDown={(e) => handleEditKeyDown(e, column.type)}
          className="w-full px-2 py-1 text-sm border border-blue-400 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
          disabled={savingCell}
        />
      );
    }

    return (
      <div
        onClick={() => startEditing(entry.row_id, column.key, value)}
        className={`
          min-h-[28px] px-2 py-1 -mx-2 -my-1 rounded cursor-pointer transition-all
          hover:bg-blue-50 hover:ring-1 hover:ring-blue-200
          ${justSaved ? 'bg-green-100 ring-1 ring-green-300' : ''}
        `}
      >
        {renderCellDisplayValue(value, column.type)}
      </div>
    );
  };

  const getListItemTitle = (entry: TableEntry): string => {
    const schema = document.table_schema;
    if (!schema) return 'Eintrag';
    
    const data = entry.data;
    
    if (schema.title_columns && schema.title_columns.length > 0) {
      const titleParts = schema.title_columns
        .map(key => data[key])
        .filter(val => val !== null && val !== undefined && val !== '')
        .map(val => String(val));
      
      if (titleParts.length > 0) return titleParts.join(' ');
    }
    
    const titleParts: string[] = [];
    for (const col of columns) {
      const val = data[col.key];
      if (val !== null && val !== undefined && val !== '') {
        titleParts.push(String(val));
        if (titleParts.length >= 3) break;
      }
    }
    
    return titleParts.length > 0 ? titleParts.join(' ') : 'Eintrag ohne Titel';
  };

  // === RENDER ===

  if (!document.table_schema) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Table className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">Kein Schema definiert</p>
      </div>
    );
  }

  if (tableEntries.length === 0) {
    return (
      <div>
        <div className="text-center py-8 text-gray-500">
          <List className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Noch keine Einträge vorhanden</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">
            Klicke auf den Button, um einen Eintrag hinzuzufügen.
          </p>
        </div>
        <div className="mt-4 flex justify-end border-t border-gray-100 pt-3">
          <button onClick={addNewRow}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
            <Plus className="w-3.5 h-3.5" />
            Neuer Eintrag
          </button>
        </div>
      </div>
    );
  }

  // Listen-Ansicht
  if (viewMode === 'list') {
    return (
      <div>
        <div className="space-y-3">
          {tableEntries.map((entry) => {
            const title = getListItemTitle(entry);
            const isUpdated = updatedRowId === entry.row_id;
            
            return (
              <div
                key={entry.row_id}
                ref={(el) => { rowRefs.current[entry.row_id] = el; }}
                className={`bg-white border rounded-lg p-4 transition-all ${
                  isUpdated 
                    ? 'border-green-400 ring-2 ring-green-100 bg-green-50' 
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <h6 className="font-medium text-gray-900 mb-3 text-sm">{title}</h6>
                
                <div className="space-y-2">
                  {columns.map((col) => (
                    <div key={col.key} className="flex items-start gap-2 text-sm">
                      <span className="text-gray-500 min-w-[80px] flex-shrink-0">{col.label}:</span>
                      <div className="flex-1 min-w-0">{renderEditableCell(entry, col)}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
          <span className="text-xs text-gray-400">
            {tableEntries.length} {tableEntries.length === 1 ? 'Eintrag' : 'Einträge'}
          </span>
          <button onClick={addNewRow}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
            <Plus className="w-3.5 h-3.5" />
            Neuer Eintrag
          </button>
        </div>
      </div>
    );
  }

  // Tabellen-Ansicht
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              {columns.map((col) => (
                <th key={col.key} 
                  className="text-left py-2 px-3 font-medium text-gray-700 bg-gray-50 whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableEntries.map((entry) => {
              const isUpdated = updatedRowId === entry.row_id;
              return (
                <tr key={entry.row_id} 
                  ref={(el) => { rowRefs.current[entry.row_id] = el; }}
                  className={`border-b transition-all ${
                    isUpdated ? 'border-green-300 bg-green-50' : 'border-gray-100'
                  }`}>
                  {columns.map((col) => (
                    <td key={col.key} className="py-2 px-3 text-gray-900 align-top">
                      {renderEditableCell(entry, col)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
        <span className="text-xs text-gray-400">
          {tableEntries.length} {tableEntries.length === 1 ? 'Eintrag' : 'Einträge'}
        </span>
        <button onClick={addNewRow}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
          <Plus className="w-3.5 h-3.5" />
          Neue Zeile
        </button>
      </div>
    </div>
  );
};
