// Chat Hauptkomponente

import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, FileText, Table, Globe, ChevronDown, MessageCircle, GitCompare, Zap, Loader2, Download } from 'lucide-react';
import { Agent } from '../../types';
import { useMessages } from '../../hooks/useMessages';
import { useDocuments } from '../../hooks/useDocuments';
import { downloadAsXlsx, downloadAsDocx } from '../../utils/exportUtils';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { DocumentList } from './DocumentList';
import { TextDocument, hasPreviousVersion } from './TextDocument';
import { TableDocument } from './TableDocument';
import { WebpageDocument } from './WebpageDocument';

interface ChatProps {
  agent: Agent;
  userId: string;
  workspaceId: string;
  onBack: () => void;
}

export const Chat: React.FC<ChatProps> = ({ agent, userId, workspaceId, onBack }) => {
  // Hooks
  const {
    messages,
    loading,
    error,
    hasUnreadMessages,
    isAtBottom,
    setIsAtBottom,
    sendMessage,
    updateReadStatus
  } = useMessages({ agentId: agent.id, workspaceId, userId });

  const {
    documents,
    documentLastUpdated,
    selectedDocument,
    documentContent,
    contentHistory,
    tableEntries,
    webpageContent,
    webpageHistory,
    loadingContent,
    contentUpdated,
    selectDocument,
    clearSelection,
    setDocumentContent,
    setTableEntries,
    setWebpageContent
  } = useDocuments({ agentId: agent.id, workspaceId });

  // Local State
  const [mobileTab, setMobileTab] = useState<'chat' | 'documents'>('chat');
  const [showDiff, setShowDiff] = useState(false);
  const [tableViewMode, setTableViewMode] = useState<'table' | 'list'>('list');
  const [updatedRowId, setUpdatedRowId] = useState<string | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll-Position
  const scrollPositionKey = `chat-scroll-${agent.id}`;
  const hasRestoredScroll = useRef(false);

  // Resizable Panel
  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = localStorage.getItem('documents-panel-width');
    return saved ? parseInt(saved, 10) : 400;
  });
  const [isResizing, setIsResizing] = useState(false);

  // Scroll-Position speichern/wiederherstellen
  const saveScrollPosition = () => {
    const container = messagesContainerRef.current;
    if (container) {
      sessionStorage.setItem(scrollPositionKey, String(container.scrollTop));
    }
  };

  const restoreScrollPosition = () => {
    if (hasRestoredScroll.current) return;
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const savedPosition = sessionStorage.getItem(scrollPositionKey);
    if (savedPosition) {
      container.scrollTop = parseInt(savedPosition, 10);
      hasRestoredScroll.current = true;
      checkIfAtBottom();
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) saveScrollPosition();
    };

    window.addEventListener('beforeunload', saveScrollPosition);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      saveScrollPosition();
      window.removeEventListener('beforeunload', saveScrollPosition);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [scrollPositionKey]);

  useEffect(() => {
    if (messages.length > 0 && !hasRestoredScroll.current) {
      const timer = setTimeout(restoreScrollPosition, 50);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  // Resizer
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;
      const clampedWidth = Math.max(250, Math.min(containerRect.width * 0.6, newWidth));
      
      setPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        localStorage.setItem('documents-panel-width', String(panelWidth));
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, panelWidth]);

  // Scroll-Funktionen
  const checkIfAtBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const threshold = 100;
    const isBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    setIsAtBottom(isBottom);
    
    if (isBottom && hasUnreadMessages) {
      updateReadStatus();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    updateReadStatus();
  };

  // Message senden
  const handleSend = async (text: string) => {
    try {
      await sendMessage(text);
    } catch {
      // Error bereits im Hook gesetzt
    }
  };

  const hasDocuments = documents.length > 0;
  const previousVersionExists = hasPreviousVersion(documentContent, contentHistory);

  // === RENDER: Chat-Bereich ===
  const renderChat = () => (
    <div className="flex-1 flex flex-col min-w-0 relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3 sm:gap-4">
          <button 
            onClick={() => { saveScrollPosition(); onBack(); }}
            className="p-2 -ml-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <img src={agent.thumbnail} alt={agent.name} 
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border border-gray-200" />
              <span className="absolute bottom-0 right-0 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{agent.name}</h3>
              <p className="text-xs text-gray-500 hidden sm:block">{agent.role}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        onScroll={checkIfAtBottom}
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 relative"
      >
        <ChatMessages messages={messages} agent={agent} loading={loading} />
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to Bottom Button */}
      {!isAtBottom && messages.length > 0 && (
        <button
          onClick={scrollToBottom}
          className={`absolute bottom-24 right-4 sm:right-6 p-2 rounded-full shadow-md transition-all z-10 ${
            hasUnreadMessages
              ? 'bg-green-500 border border-green-400 text-white animate-pulse hover:bg-green-600'
              : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300'
          }`}
          title={hasUnreadMessages ? 'Neue Nachrichten' : 'Zum Ende springen'}
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      )}

      {/* Fehleranzeige */}
      {error && (
        <div className="mx-4 mb-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Input */}
      <ChatInput agentName={agent.name} loading={loading} onSend={handleSend} />
    </div>
  );

  // === RENDER: Dokumente-Bereich ===
  const renderDocuments = () => (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden min-h-0">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <h4 className="font-semibold text-sm text-gray-900">Dokumente</h4>
      </div>

      {selectedDocument ? (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Dokument-Header */}
          <div className="px-4 py-3 bg-white border-b border-gray-200">
            <button
              onClick={clearSelection}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 mb-2"
            >
              <ArrowLeft className="w-3 h-3" />
              Zurück zur Übersicht
            </button>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="min-w-0">
                  <h5 className="font-semibold text-gray-900 truncate">{selectedDocument.name}</h5>
                  {selectedDocument.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{selectedDocument.description}</p>
                  )}
                </div>
                {contentUpdated && (
                  <span className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full animate-pulse">
                    <Zap className="w-3 h-3" />
                    <span className="hidden sm:inline">Aktualisiert</span>
                  </span>
                )}
              </div>
              
              {/* Action-Buttons */}
              <div className="flex items-center gap-2">
                {selectedDocument.type === 'table' && tableEntries.length > 0 && (
                  <button
                    onClick={() => downloadAsXlsx(selectedDocument, tableEntries)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                    title="Als Excel herunterladen"
                  >
                    <Download className="w-3 h-3" />
                    <span className="hidden sm:inline">XLSX</span>
                  </button>
                )}

                {selectedDocument.type === 'text' && documentContent && (
                  <button
                    onClick={() => downloadAsDocx(selectedDocument, documentContent)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                    title="Als Word herunterladen"
                  >
                    <Download className="w-3 h-3" />
                    <span className="hidden sm:inline">DOCX</span>
                  </button>
                )}

                {selectedDocument.type === 'table' && tableEntries.length > 0 && (
                  <button
                    onClick={() => setTableViewMode(tableViewMode === 'table' ? 'list' : 'table')}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                      tableViewMode === 'table' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Table className="w-3 h-3" />
                    <span className="hidden sm:inline">Tabelle</span>
                  </button>
                )}
                
                {selectedDocument.type === 'text' && previousVersionExists && (
                  <button
                    onClick={() => setShowDiff(!showDiff)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                      showDiff 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <GitCompare className="w-3 h-3" />
                    <span className="hidden sm:inline">Diff</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Inhalt */}
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            {loadingContent ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : selectedDocument.type === 'table' ? (
              <div className={`bg-white rounded-lg border p-4 transition-all ${
                contentUpdated ? 'border-green-300 ring-2 ring-green-100' : 'border-gray-200'
              }`}>
                <TableDocument
                  document={selectedDocument}
                  tableEntries={tableEntries}
                  workspaceId={workspaceId}
                  viewMode={tableViewMode}
                  contentUpdated={contentUpdated}
                  updatedRowId={updatedRowId}
                  onEntriesChange={setTableEntries}
                />
              </div>
            ) : selectedDocument.type === 'webpage' ? (
              <WebpageDocument
                document={selectedDocument}
                webpageContent={webpageContent}
                webpageHistory={webpageHistory}
                workspaceId={workspaceId}
                contentUpdated={contentUpdated}
                onContentChange={setWebpageContent}
              />
            ) : (
              <TextDocument
                content={documentContent}
                contentHistory={contentHistory}
                showDiff={showDiff}
                contentUpdated={contentUpdated}
                onVersionSelect={setDocumentContent}
              />
            )}
          </div>
        </div>
      ) : (
        <DocumentList
          documents={documents}
          documentLastUpdated={documentLastUpdated}
          onSelect={selectDocument}
        />
      )}
    </div>
  );

  // === HAUPTLAYOUT ===
  return (
    <div className="flex flex-col h-full bg-white">
      
      {/* Mobile Tab-Bar */}
      {hasDocuments && (
        <div className="lg:hidden flex border-b border-gray-200 bg-white">
          <button
            onClick={() => setMobileTab('chat')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              mobileTab === 'chat'
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-500'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            Chat
          </button>
          <button
            onClick={() => setMobileTab('documents')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              mobileTab === 'documents'
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-500'
            }`}
          >
            <FileText className="w-4 h-4" />
            Dokumente
            <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">
              {documents.length}
            </span>
          </button>
        </div>
      )}

      {/* Content-Bereich */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* MOBILE */}
        <div className="lg:hidden flex-1 flex overflow-hidden">
          {mobileTab === 'chat' || !hasDocuments ? renderChat() : renderDocuments()}
        </div>

        {/* DESKTOP */}
        <div ref={containerRef} className="hidden lg:flex flex-1 overflow-hidden relative">
          {renderChat()}

          {hasDocuments && (
            <>
              <div
                onMouseDown={() => setIsResizing(true)}
                className={`
                  w-1 hover:w-1.5 cursor-col-resize flex-shrink-0 transition-all
                  ${isResizing ? 'bg-blue-400 w-1.5' : 'bg-gray-200 hover:bg-gray-300'}
                `}
                title="Breite anpassen"
              />
              
              <div style={{ width: panelWidth }} className="flex-shrink-0 flex flex-col overflow-hidden bg-gray-50">
                {renderDocuments()}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
