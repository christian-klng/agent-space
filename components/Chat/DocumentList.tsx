// Dokumenten-Liste

import React from 'react';
import { FileText, Table, Globe, ChevronRight } from 'lucide-react';
import { Document } from '../../types';
import { formatRelativeDate } from '../../utils/dateUtils';

interface DocumentListProps {
  documents: Document[];
  documentLastUpdated: Record<string, string>;
  onSelect: (doc: Document) => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({ 
  documents, 
  documentLastUpdated, 
  onSelect 
}) => {
  const getDocumentIcon = (type: Document['type']) => {
    switch (type) {
      case 'table':
        return <Table className="w-4 h-4" />;
      case 'webpage':
        return <Globe className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
      {documents.map((doc) => (
        <button
          key={doc.id}
          onClick={() => onSelect(doc)}
          className="w-full text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100 text-gray-500 group-hover:bg-gray-200 transition-colors">
                {getDocumentIcon(doc.type)}
              </div>
              <div className="min-w-0">
                <h5 className="font-medium text-sm text-gray-900 truncate">{doc.name}</h5>
                {documentLastUpdated[doc.id] && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatRelativeDate(documentLastUpdated[doc.id])}
                  </p>
                )}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
          </div>
        </button>
      ))}
    </div>
  );
};
