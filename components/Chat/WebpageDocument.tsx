// Webseiten-Dokument mit URL-Bearbeitung

import React, { useState } from 'react';
import { Globe, ExternalLink, Clock, Link2, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { Document, WebpageEntry } from '../../types';
import { formatDate, formatDateFull } from '../../utils/dateUtils';

interface WebpageDocumentProps {
  document: Document;
  webpageContent: WebpageEntry | null;
  webpageHistory: WebpageEntry[];
  workspaceId: string;
  contentUpdated: boolean;
  onContentChange: (content: WebpageEntry | null) => void;
}

export const WebpageDocument: React.FC<WebpageDocumentProps> = ({
  document,
  webpageContent,
  webpageHistory,
  workspaceId,
  contentUpdated,
  onContentChange
}) => {
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState(webpageContent?.url || '');
  const [savingUrl, setSavingUrl] = useState(false);

  // URL normalisieren
  const normalizeUrl = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return trimmed;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    return `https://${trimmed}`;
  };

  // URL speichern
  const saveUrl = async () => {
    if (!urlInputValue.trim()) return;
    
    setSavingUrl(true);
    
    const newVersion = webpageContent ? webpageContent.version + 1 : 1;
    const normalizedUrl = normalizeUrl(urlInputValue);
    
    const { error } = await supabase.from('webpages').insert({
      document_id: document.id,
      workspace_id: workspaceId,
      url: normalizedUrl,
      title: webpageContent?.title || null,
      thumbnail: webpageContent?.thumbnail || null,
      description: webpageContent?.description || null,
      content: webpageContent?.content || null,
      links: webpageContent?.links || [],
      version: newVersion
    });

    if (!error) {
      setEditingUrl(false);
    }
    
    setSavingUrl(false);
  };

  // Version auswählen
  const loadVersion = (version: WebpageEntry) => {
    onContentChange(version);
    setUrlInputValue(version.url || '');
  };

  return (
    <div className="space-y-4">
      {/* URL-Eingabe */}
      <div className={`bg-white rounded-lg border p-4 transition-all ${
        contentUpdated ? 'border-green-300 ring-2 ring-green-100' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">URL</span>
        </div>
        
        {editingUrl ? (
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInputValue}
              onChange={(e) => setUrlInputValue(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 px-3 py-2 text-sm border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveUrl();
                if (e.key === 'Escape') {
                  setEditingUrl(false);
                  setUrlInputValue(webpageContent?.url || '');
                }
              }}
              autoFocus
            />
            <button
              onClick={saveUrl}
              disabled={savingUrl || !urlInputValue.trim()}
              className="px-3 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {savingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Speichern'}
            </button>
            <button
              onClick={() => {
                setEditingUrl(false);
                setUrlInputValue(webpageContent?.url || '');
              }}
              className="px-3 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        ) : (
          <div
            onClick={() => setEditingUrl(true)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors group"
          >
            {webpageContent?.url ? (
              <>
                <span className="text-sm text-blue-600 truncate flex-1">{webpageContent.url}</span>
                <a
                  href={normalizeUrl(webpageContent.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </>
            ) : (
              <span className="text-sm text-gray-400 italic">Klicken zum Eingeben der URL...</span>
            )}
          </div>
        )}
      </div>

      {/* Webseiten-Infos */}
      {webpageContent && (webpageContent.title || webpageContent.thumbnail || webpageContent.description) && (
        <div className={`bg-white rounded-lg border p-4 transition-all ${
          contentUpdated ? 'border-green-300 ring-2 ring-green-100' : 'border-gray-200'
        }`}>
          {webpageContent.thumbnail && (
            <div className="mb-4">
              <img
                src={webpageContent.thumbnail}
                alt={webpageContent.title || 'Vorschaubild'}
                className="w-full h-40 object-cover rounded-lg"
              />
            </div>
          )}

          {webpageContent.title && (
            <h3 className="font-semibold text-gray-900 mb-2">{webpageContent.title}</h3>
          )}

          {webpageContent.description && (
            <p className="text-sm text-gray-600 mb-3">{webpageContent.description}</p>
          )}

          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            <span>Aktualisiert am {formatDateFull(webpageContent.created_at)}</span>
          </div>
        </div>
      )}

      {/* Ausgehende Links */}
      {webpageContent?.links && webpageContent.links.length > 0 && (
        <div className={`bg-white rounded-lg border p-4 transition-all ${
          contentUpdated ? 'border-green-300 ring-2 ring-green-100' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ausgehende Links ({webpageContent.links.length})
            </span>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {webpageContent.links.map((link, index) => (
              <a
                key={index}
                href={normalizeUrl(link)}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-blue-600 hover:underline truncate"
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Leerer Zustand */}
      {!webpageContent && (
        <div className="text-center py-8 text-gray-500">
          <Globe className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Noch keine Webseite erfasst</p>
          <p className="text-xs text-gray-400 mt-1">
            Gib eine URL ein, um zu beginnen.
          </p>
        </div>
      )}

      {/* Versionshistorie */}
      {webpageHistory.length > 1 && (
        <div className="mt-6">
          <h6 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Versionshistorie
          </h6>
          <div className="space-y-1">
            {webpageHistory.map((version) => (
              <button
                key={version.id}
                onClick={() => loadVersion(version)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  webpageContent?.id === version.id
                    ? 'bg-gray-900 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>Version {version.version}</span>
                  <span className={`text-xs ${
                    webpageContent?.id === version.id ? 'text-gray-300' : 'text-gray-400'
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
