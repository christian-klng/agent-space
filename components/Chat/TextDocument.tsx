// Text-Dokument mit Diff-Ansicht und Versionshistorie

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import * as Diff from 'diff';
import { Clock, FileText } from 'lucide-react';
import { Content } from '../../types';
import { formatDate } from '../../utils/dateUtils';

interface TextDocumentProps {
  content: Content | null;
  contentHistory: Content[];
  showDiff: boolean;
  contentUpdated: boolean;
  onVersionSelect: (content: Content) => void;
}

export const TextDocument: React.FC<TextDocumentProps> = ({
  content,
  contentHistory,
  showDiff,
  contentUpdated,
  onVersionSelect
}) => {
  // Vorherige Version finden
  const getPreviousVersion = (): Content | null => {
    if (!content || contentHistory.length < 2) return null;
    const currentIndex = contentHistory.findIndex(c => c.id === content.id);
    if (currentIndex === -1 || currentIndex >= contentHistory.length - 1) return null;
    return contentHistory[currentIndex + 1];
  };

  const previousVersion = getPreviousVersion();

  // Diff-Inhalt rendern
  const renderDiffContent = () => {
    if (!content) return null;

    if (!showDiff || !previousVersion) {
      return (
        <div className="prose prose-sm max-w-none text-gray-700">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content.content}
          </ReactMarkdown>
        </div>
      );
    }

    const differences = Diff.diffWords(previousVersion.content, content.content);

    return (
      <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
        {differences.map((part, index) => {
          if (part.added) {
            return (
              <span key={index} className="bg-green-100 text-green-800 px-0.5 rounded">
                {part.value}
              </span>
            );
          }
          if (part.removed) {
            return (
              <span key={index} className="bg-red-100 text-red-800 line-through px-0.5 rounded">
                {part.value}
              </span>
            );
          }
          return <span key={index}>{part.value}</span>;
        })}
      </div>
    );
  };

  if (!content) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">Noch kein Inhalt vorhanden</p>
        <p className="text-xs text-gray-400 mt-1">
          Für diesen Workspace wurde noch kein Inhalt erstellt.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Aktueller Inhalt */}
      <div className={`bg-white rounded-lg border p-4 transition-all ${
        contentUpdated ? 'border-green-300 ring-2 ring-green-100' : 'border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">
              Version {content.version}
            </span>
            {showDiff && previousVersion && (
              <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                vs. V{previousVersion.version}
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400">
            {formatDate(content.created_at)}
          </span>
        </div>
        {renderDiffContent()}
      </div>

      {/* Versionshistorie */}
      {contentHistory.length > 1 && (
        <div className="mt-6">
          <h6 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Versionshistorie
          </h6>
          <div className="space-y-1">
            {contentHistory.map((version) => (
              <button
                key={version.id}
                onClick={() => onVersionSelect(version)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  content.id === version.id
                    ? 'bg-gray-900 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>Version {version.version}</span>
                  <span className={`text-xs ${
                    content.id === version.id ? 'text-gray-300' : 'text-gray-400'
                  }`}>
                    {formatDate(version.created_at)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper: Hat vorherige Version?
export const hasPreviousVersion = (content: Content | null, history: Content[]): boolean => {
  if (!content || history.length < 2) return false;
  const currentIndex = history.findIndex(c => c.id === content.id);
  return currentIndex !== -1 && currentIndex < history.length - 1;
};
