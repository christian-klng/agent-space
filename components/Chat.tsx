import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { Agent, Message, Document, Content, Workspace, TableEntry } from '../types';
import { Send, ArrowLeft, Loader2, FileText, ChevronRight, Clock, GitCompare, Zap, MessageCircle, ChevronDown, Table } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import * as Diff from 'diff';

interface ChatProps {
  agent: Agent;
  userId: string;
  workspaceId: string;
  onBack: () => void;
}

export const Chat: React.FC<ChatProps> = ({ agent, userId, workspaceId, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Scroll-Position State
  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollPositionKey = `chat-scroll-${agent.id}`;
  const hasRestoredScroll = useRef(false);

  // Ungelesene Nachrichten State
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const lastReadAtRef = useRef<string | null>(null);

  // Lesestatus aktualisieren
  const updateReadStatus = async () => {
    const { error } = await supabase
      .from('message_read_status')
      .upsert({
        user_id: userId,
        agent_id: agent.id,
        workspace_id: workspaceId,
        last_read_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,agent_id,workspace_id'
      });

    if (error) {
      console.error('Error updating read status:', error);
    }
    
    lastReadAtRef.current = new Date().toISOString();
    setHasUnreadMessages(false);
  };

  // Lesestatus laden beim Öffnen
  useEffect(() => {
    const loadReadStatus = async () => {
      const { data } = await supabase
        .from('message_read_status')
        .select('last_read_at')
        .eq('user_id', userId)
        .eq('agent_id', agent.id)
        .eq('workspace_id', workspaceId)
        .single();

      lastReadAtRef.current = data?.last_read_at || null;
    };

    loadReadStatus();
  }, [userId, agent.id, workspaceId]);

  // Lesestatus aktualisieren wenn am Ende gescrollt
  useEffect(() => {
    if (isAtBottom && messages.length > 0) {
      updateReadStatus();
    }
  }, [isAtBottom, messages.length]);

  // Scroll-Position speichern
  const saveScrollPosition = () => {
    const container = messagesContainerRef.current;
    if (container) {
      sessionStorage.setItem(scrollPositionKey, String(container.scrollTop));
    }
  };

  // Scroll-Position wiederherstellen
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

  // Event Listener für Speichern
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveScrollPosition();
      }
    };

    window.addEventListener('beforeunload', saveScrollPosition);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      saveScrollPosition();
      window.removeEventListener('beforeunload', saveScrollPosition);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [scrollPositionKey]);

  // Wiederherstellen nach Messages laden
  useEffect(() => {
    if (messages.length > 0 && !hasRestoredScroll.current) {
      // Warten bis DOM aktualisiert ist
      const timer = setTimeout(() => {
        restoreScrollPosition();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  // Mobile Tab State: 'chat' oder 'documents'
  const [mobileTab, setMobileTab] = useState<'chat' | 'documents'>('chat');

  // Workspace mit Webhook URL
  const [workspace, setWorkspace] = useState<Workspace | null>(null);

  // Dokumente State
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentLastUpdated, setDocumentLastUpdated] = useState<Record<string, string>>({});
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [documentContent, setDocumentContent] = useState<Content | null>(null);
  const [contentHistory, setContentHistory] = useState<Content[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  
  // Tabellen-Einträge State
  const [tableEntries, setTableEntries] = useState<TableEntry[]>([]);
  
  // Realtime-Indikator
  const [contentUpdated, setContentUpdated] = useState(false);

  // Workspace laden (für Webhook URL)
  useEffect(() => {
    fetchWorkspace();
  }, [workspaceId]);

  const fetchWorkspace = async () => {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single();

    if (error) {
      console.error('Error fetching workspace:', error);
    } else {
      setWorkspace(data);
    }
  };

  // Realtime für Messages
  useEffect(() => {
    fetchMessages();
    fetchDocuments();

    const messageSubscription = supabase
      .channel(`messages:${workspaceId}:${agent.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'messages'
      }, (payload) => {
        const newMessage = payload.new as Message;
        // Manuell filtern (zuverlässiger als Supabase Filter)
        if (newMessage.workspace_id !== workspaceId) return;
        if (newMessage.agent_id !== agent.id) return;
        
        if (payload.eventType === 'INSERT') {
          setMessages(prev => {
            if (prev.find(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
          
          // Wenn Assistant-Nachricht und User nicht am Ende: als ungelesen markieren
          if (newMessage.role === 'assistant' && !isAtBottom) {
            setHasUnreadMessages(true);
          }
        }
      })
      .subscribe((status) => {
        console.log('Messages Realtime Status:', status);
      });

    return () => {
      supabase.removeChannel(messageSubscription);
    };
  }, [agent.id, workspaceId]);

  // Realtime für Contents (Dokumentenänderungen)
  useEffect(() => {
    if (!selectedDocument) return;

    const contentSubscription = supabase
      .channel(`contents:${selectedDocument.id}:${workspaceId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'contents'
      }, (payload) => {
        if (payload.eventType !== 'INSERT') return;
        
        const newContent = payload.new as Content;
        // Manuell filtern
        if (newContent.document_id !== selectedDocument.id) return;
        if (newContent.workspace_id !== workspaceId) return;
        
        setContentHistory(prev => {
          if (prev.find(c => c.id === newContent.id)) return prev;
          return [newContent, ...prev];
        });
        setDocumentContent(newContent);
        
        // Letztes Update-Datum aktualisieren
        setDocumentLastUpdated(prev => ({
          ...prev,
          [newContent.document_id]: newContent.created_at
        }));
        
        setContentUpdated(true);
        setTimeout(() => setContentUpdated(false), 2000);
      })
      .subscribe((status) => {
        console.log('Contents Realtime Status:', status);
      });

    return () => {
      supabase.removeChannel(contentSubscription);
    };
  }, [selectedDocument?.id, workspaceId]);

  // Realtime für table_entries
  useEffect(() => {
    if (!selectedDocument || selectedDocument.type !== 'table') return;

    const tableSubscription = supabase
      .channel(`table_entries:${selectedDocument.id}:${workspaceId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'table_entries'
      }, (payload) => {
        if (payload.eventType !== 'INSERT') return;
        
        const newEntry = payload.new as TableEntry;
        if (newEntry.document_id !== selectedDocument.id) return;
        if (newEntry.workspace_id !== workspaceId) return;
        
        // Aktualisiere die Einträge mit der neuesten Version
        setTableEntries(prev => {
          const existingIndex = prev.findIndex(e => e.row_id === newEntry.row_id);
          if (existingIndex >= 0) {
            // Ersetze nur wenn neue Version höher
            if (newEntry.version > prev[existingIndex].version) {
              const updated = [...prev];
              updated[existingIndex] = newEntry;
              return updated;
            }
            return prev;
          }
          return [...prev, newEntry].sort((a, b) => a.position - b.position);
        });
        
        setContentUpdated(true);
        setTimeout(() => setContentUpdated(false), 2000);
      })
      .subscribe((status) => {
        console.log('Table Entries Realtime Status:', status);
      });

    return () => {
      supabase.removeChannel(tableSubscription);
    };
  }, [selectedDocument?.id, selectedDocument?.type, workspaceId]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      setMessages(data || []);
    }
  };

  const fetchDocuments = async () => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .contains('agent_ids', [agent.id]);

    if (error) {
      console.error('Error fetching documents:', error);
    } else {
      setDocuments(data || []);
      
      // Letztes Update-Datum für jedes Dokument laden
      if (data && data.length > 0) {
        const lastUpdatedMap: Record<string, string> = {};
        
        for (const doc of data) {
          if (doc.type === 'table') {
            // Für Tabellen: letzten table_entry prüfen
            const { data: entryData } = await supabase
              .from('table_entries')
              .select('created_at')
              .eq('document_id', doc.id)
              .eq('workspace_id', workspaceId)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            
            if (entryData) {
              lastUpdatedMap[doc.id] = entryData.created_at;
            }
          } else {
            // Für Text-Dokumente: contents prüfen
            const { data: contentData } = await supabase
              .from('contents')
              .select('created_at')
              .eq('document_id', doc.id)
              .eq('workspace_id', workspaceId)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            
            if (contentData) {
              lastUpdatedMap[doc.id] = contentData.created_at;
            }
          }
        }
        
        setDocumentLastUpdated(lastUpdatedMap);
      }
    }
  };

  const fetchDocumentContent = async (doc: Document) => {
    setLoadingContent(true);
    setSelectedDocument(doc);
    setTableEntries([]);
    setDocumentContent(null);
    setContentHistory([]);

    if (doc.type === 'table') {
      // Tabellen-Einträge laden (nur neueste Version pro row_id)
      const { data, error } = await supabase
        .from('table_entries')
        .select('*')
        .eq('document_id', doc.id)
        .eq('workspace_id', workspaceId)
        .order('row_id')
        .order('version', { ascending: false });

      if (error) {
        console.error('Error fetching table entries:', error);
      } else if (data) {
        // Nur die neueste Version pro row_id behalten
        const latestByRowId = new Map<string, TableEntry>();
        for (const entry of data) {
          if (!latestByRowId.has(entry.row_id) || entry.version > latestByRowId.get(entry.row_id)!.version) {
            latestByRowId.set(entry.row_id, entry);
          }
        }
        const entries = Array.from(latestByRowId.values()).sort((a, b) => a.position - b.position);
        setTableEntries(entries);
      }
    } else {
      // Text-Dokument: Contents laden
      const { data: latestData, error: latestError } = await supabase
        .from('contents')
        .select('*')
        .eq('document_id', doc.id)
        .eq('workspace_id', workspaceId)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (latestError && latestError.code !== 'PGRST116') {
        console.error('Error fetching content:', latestError);
      }
      setDocumentContent(latestData || null);

      const { data: historyData } = await supabase
        .from('contents')
        .select('*')
        .eq('document_id', doc.id)
        .eq('workspace_id', workspaceId)
        .order('version', { ascending: false });

      setContentHistory(historyData || []);
    }
    
    setLoadingContent(false);
  };

  const loadVersion = (content: Content) => {
    setDocumentContent(content);
  };

  const getPreviousVersion = (): Content | null => {
    if (!documentContent || contentHistory.length < 2) return null;
    const currentIndex = contentHistory.findIndex(c => c.id === documentContent.id);
    if (currentIndex === -1 || currentIndex >= contentHistory.length - 1) return null;
    return contentHistory[currentIndex + 1];
  };

  const renderDiffContent = () => {
    const previousVersion = getPreviousVersion();
    if (!documentContent) return null;

    if (!showDiff || !previousVersion) {
      return (
        <div className="prose prose-sm max-w-none text-gray-700">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {documentContent.content}
          </ReactMarkdown>
        </div>
      );
    }

    const differences = Diff.diffWords(previousVersion.content, documentContent.content);

    return (
      <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
        {differences.map((part, index) => {
          if (part.added) {
            return (
              <span 
                key={index} 
                className="bg-green-100 text-green-800 px-0.5 rounded"
              >
                {part.value}
              </span>
            );
          }
          if (part.removed) {
            return (
              <span 
                key={index} 
                className="bg-red-100 text-red-800 line-through px-0.5 rounded"
              >
                {part.value}
              </span>
            );
          }
          return <span key={index}>{part.value}</span>;
        })}
      </div>
    );
  };

  // Tabelle rendern
  const renderTableContent = () => {
    if (!selectedDocument?.table_schema) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Table className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Kein Schema definiert</p>
        </div>
      );
    }

    const columns = selectedDocument.table_schema.columns;

    if (tableEntries.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Table className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Noch keine Einträge vorhanden</p>
          <p className="text-xs text-gray-400 mt-1">
            Der Agent kann Einträge zu dieser Tabelle hinzufügen.
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              {columns.map((col) => (
                <th 
                  key={col.key} 
                  className="text-left py-2 px-3 font-medium text-gray-700 bg-gray-50 whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableEntries.map((entry) => (
              <tr key={entry.row_id} className="border-b border-gray-100 hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={col.key} className="py-2 px-3 text-gray-900">
                    {renderCellValue(entry.data[col.key], col.type)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 text-xs text-gray-400 text-right">
          {tableEntries.length} {tableEntries.length === 1 ? 'Eintrag' : 'Einträge'}
        </div>
      </div>
    );
  };

  // Zellwert je nach Typ rendern
  const renderCellValue = (value: string | number | null | undefined, type: string) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-300">—</span>;
    }

    switch (type) {
      case 'url':
        return (
          <a 
            href={String(value)} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline truncate block max-w-[200px]"
          >
            {String(value)}
          </a>
        );
      case 'textarea':
        return (
          <span className="whitespace-pre-wrap line-clamp-3">
            {String(value)}
          </span>
        );
      case 'email':
        return (
          <a 
            href={`mailto:${value}`}
            className="text-blue-600 hover:underline"
          >
            {String(value)}
          </a>
        );
      default:
        return String(value);
    }
  };

  // Prüfen ob User ganz unten ist
  const checkIfAtBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const threshold = 100; // Pixel-Toleranz
    const isBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    setIsAtBottom(isBottom);
    
    // Wenn am Ende angekommen, Ungelesen-Status zurücksetzen
    if (isBottom && hasUnreadMessages) {
      setHasUnreadMessages(false);
      updateReadStatus();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setHasUnreadMessages(false);
    updateReadStatus();
  };

  const sendToWebhook = async (text: string) => {
    if (!workspace?.webhook_url) {
      throw new Error('Keine Webhook URL konfiguriert');
    }

    const payload = {
      text: text,
      user_id: userId,
      agent_id: agent.id,
      agent_workflow_id: agent.workflow_id || null,
      workspace_id: workspaceId
    };

    const response = await fetch(workspace.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorMessage = `Fehler ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // JSON parsing fehlgeschlagen
      }
      throw new Error(errorMessage);
    }

    return response;
  };

  const handleSend = async () => {
    if (!inputValue.trim() || loading) return;

    const userContent = inputValue.trim();
    setInputValue('');
    
    // Textarea-Höhe zurücksetzen
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    setLoading(true);
    setError(null);

    try {
      await sendToWebhook(userContent);
    } catch (err) {
      console.error('Fehler beim Senden der Nachricht:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(errorMessage);
      setInputValue(userContent);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffSec < 60) return 'Gerade eben';
    if (diffMin < 60) return `Vor ${diffMin} ${diffMin === 1 ? 'Minute' : 'Minuten'}`;
    if (diffHours < 24) return `Vor ${diffHours} ${diffHours === 1 ? 'Stunde' : 'Stunden'}`;
    if (diffDays < 7) return `Vor ${diffDays} ${diffDays === 1 ? 'Tag' : 'Tagen'}`;
    if (diffWeeks < 4) return `Vor ${diffWeeks} ${diffWeeks === 1 ? 'Woche' : 'Wochen'}`;
    return `Vor ${diffMonths} ${diffMonths === 1 ? 'Monat' : 'Monaten'}`;
  };

  const previousVersion = getPreviousVersion();
  const hasDocuments = documents.length > 0;

  // === RENDER: Chat-Bereich ===
  const renderChat = () => (
    <div className="flex-1 flex flex-col min-w-0 relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3 sm:gap-4">
          <button 
            onClick={() => {
              saveScrollPosition();
              onBack();
            }}
            className="p-2 -ml-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative">
              <img 
                src={agent.thumbnail} 
                alt={agent.name} 
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border border-gray-200"
              />
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
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="relative mb-4">
              <img 
                src={agent.thumbnail} 
                alt={agent.name} 
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-gray-100"
              />
              <span className="absolute bottom-1 right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 border-2 border-white rounded-full"></span>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">{agent.name}</h3>
            {agent.user_instruction && (
              <p className="text-sm text-gray-500 max-w-md">{agent.user_instruction}</p>
            )}
          </div>
        )}
        
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : msg.role === 'system' ? 'justify-center' : 'justify-start'}`}
          >
            {msg.role === 'system' ? (
              <div className="text-xs text-gray-400 italic py-1">
                {msg.content}
              </div>
            ) : (
              <div 
                className={`
                  max-w-[85%] sm:max-w-[70%] px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-sm leading-relaxed
                  ${msg.role === 'user' 
                    ? 'bg-gray-900 text-white rounded-tr-sm' 
                    : 'bg-gray-100 text-gray-900 rounded-tl-sm'
                  }
                `}
              >
                <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : ''}`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-50 border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to Bottom Button - Grün und blinkend bei ungelesenen Nachrichten */}
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
      <div className="p-3 sm:p-4 bg-white border-t border-gray-100 safe-area-bottom">
        <div className="max-w-4xl mx-auto relative flex items-end">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              // Auto-resize
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={`Nachricht an ${agent.name}...`}
            className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-all placeholder:text-gray-400 resize-none overflow-y-auto"
            disabled={loading}
            rows={1}
            style={{ maxHeight: '200px' }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || loading}
            className="absolute right-2 bottom-2 p-1.5 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-gray-900 hover:border-gray-300 disabled:opacity-50 disabled:hover:text-gray-400 transition-all shadow-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );

  // === RENDER: Dokumente-Bereich ===
  const renderDocuments = () => (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden min-h-0">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <h4 className="font-semibold text-sm text-gray-900">Dokumente</h4>
      </div>

      {/* Dokument ausgewählt: Inhalt anzeigen */}
      {selectedDocument ? (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Dokument-Header */}
          <div className="px-4 py-3 bg-white border-b border-gray-200">
            <button
              onClick={() => {
                setSelectedDocument(null);
                setDocumentContent(null);
                setTableEntries([]);
              }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 mb-2"
            >
              <ArrowLeft className="w-3 h-3" />
              Zurück zur Übersicht
            </button>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h5 className="font-semibold text-gray-900 truncate">{selectedDocument.name}</h5>
                    {selectedDocument.type === 'table' && (
                      <span className="flex-shrink-0 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                        Tabelle
                      </span>
                    )}
                  </div>
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
              {selectedDocument.type === 'text' && previousVersion && (
                <button
                  onClick={() => setShowDiff(!showDiff)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                    showDiff 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title="Änderungen anzeigen"
                >
                  <GitCompare className="w-3 h-3" />
                  <span className="hidden sm:inline">Diff</span>
                </button>
              )}
            </div>
          </div>

          {/* Inhalt */}
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            {loadingContent ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : selectedDocument.type === 'table' ? (
              /* Tabellen-Inhalt */
              <div className={`bg-white rounded-lg border p-4 transition-all ${
                contentUpdated ? 'border-green-300 ring-2 ring-green-100' : 'border-gray-200'
              }`}>
                {renderTableContent()}
              </div>
            ) : documentContent ? (
              /* Text-Inhalt */
              <div className="space-y-4">
                <div className={`bg-white rounded-lg border p-4 transition-all ${
                  contentUpdated ? 'border-green-300 ring-2 ring-green-100' : 'border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">
                        Version {documentContent.version}
                      </span>
                      {showDiff && previousVersion && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                          vs. V{previousVersion.version}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {formatDate(documentContent.created_at)}
                    </span>
                  </div>
                  {renderDiffContent()}
                </div>

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
                          onClick={() => loadVersion(version)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            documentContent.id === version.id
                              ? 'bg-gray-900 text-white'
                              : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>Version {version.version}</span>
                            <span className={`text-xs ${
                              documentContent.id === version.id ? 'text-gray-300' : 'text-gray-400'
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
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Noch kein Inhalt vorhanden</p>
                <p className="text-xs text-gray-400 mt-1">
                  Für diesen Workspace wurde noch kein Inhalt erstellt.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Dokumenten-Liste */
        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
          {documents.map((doc) => (
            <button
              key={doc.id}
              onClick={() => fetchDocumentContent(doc)}
              className="w-full text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg transition-colors ${
                    doc.type === 'table' 
                      ? 'bg-blue-100 text-blue-600 group-hover:bg-blue-200' 
                      : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                  }`}>
                    {doc.type === 'table' ? (
                      <Table className="w-4 h-4" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
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
      )}
    </div>
  );

  // === HAUPTLAYOUT ===
  return (
    <div className="flex flex-col h-full bg-white">
      
      {/* Mobile Tab-Bar (nur wenn Dokumente vorhanden) */}
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
        
        {/* MOBILE: Tab-basierte Ansicht */}
        <div className="lg:hidden flex-1 flex overflow-hidden">
          {mobileTab === 'chat' || !hasDocuments ? (
            renderChat()
          ) : (
            renderDocuments()
          )}
        </div>

        {/* DESKTOP: Side-by-Side Layout */}
        <div className="hidden lg:flex flex-1 overflow-hidden">
          {/* Chat-Bereich */}
          {renderChat()}

          {/* Dokumente-Panel (Desktop) */}
          {hasDocuments && (
            <div className="w-[40%] max-w-md border-l border-gray-200 flex flex-col overflow-hidden">
              {renderDocuments()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
