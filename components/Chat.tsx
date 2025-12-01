import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { Agent, Message, Document, Content, Workspace } from '../types';
import { Send, ArrowLeft, Loader2, FileText, ChevronRight, Clock, GitCompare, Zap } from 'lucide-react';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Workspace mit Webhook URL
  const [workspace, setWorkspace] = useState<Workspace | null>(null);

  // Dokumente State
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [documentContent, setDocumentContent] = useState<Content | null>(null);
  const [contentHistory, setContentHistory] = useState<Content[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  
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
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `workspace_id=eq.${workspaceId}`
      }, (payload) => {
        const newMessage = payload.new as Message;
        if (newMessage.agent_id === agent.id) {
          setMessages(prev => {
            if (prev.find(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      })
      .subscribe();

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
        event: 'INSERT', 
        schema: 'public', 
        table: 'contents',
        filter: `document_id=eq.${selectedDocument.id}`
      }, (payload) => {
        const newContent = payload.new as Content;
        // Nur für unseren Workspace
        if (newContent.workspace_id !== workspaceId) return;
        
        // Neue Version zur Historie hinzufügen
        setContentHistory(prev => {
          if (prev.find(c => c.id === newContent.id)) return prev;
          return [newContent, ...prev];
        });
        // Automatisch zur neuen Version wechseln
        setDocumentContent(newContent);
        
        // Update-Animation anzeigen
        setContentUpdated(true);
        setTimeout(() => setContentUpdated(false), 2000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(contentSubscription);
    };
  }, [selectedDocument?.id, workspaceId]);

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
    }
  };

  const fetchDocumentContent = async (doc: Document) => {
    setLoadingContent(true);
    setSelectedDocument(doc);

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
    setLoadingContent(false);
  };

  const loadVersion = (content: Content) => {
    setDocumentContent(content);
  };

  // Vorherige Version finden
  const getPreviousVersion = (): Content | null => {
    if (!documentContent || contentHistory.length < 2) return null;
    const currentIndex = contentHistory.findIndex(c => c.id === documentContent.id);
    if (currentIndex === -1 || currentIndex >= contentHistory.length - 1) return null;
    return contentHistory[currentIndex + 1];
  };

  // Diff-Komponente rendern
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

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Nachricht an n8n Webhook senden
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
      throw new Error(`Webhook Fehler: ${response.status}`);
    }

    return response;
  };

  const handleSend = async () => {
    if (!inputValue.trim() || loading) return;

    const userContent = inputValue.trim();
    setInputValue('');
    setLoading(true);

    try {
      // Nachricht an n8n Webhook senden
      // n8n kümmert sich um das Speichern in Supabase
      await sendToWebhook(userContent);

      // Nachrichten werden über Realtime Subscription aktualisiert
      // (n8n schreibt in die messages Tabelle)

    } catch (err) {
      console.error('Fehler beim Senden der Nachricht:', err);
      // Bei Fehler: Eingabe wiederherstellen
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

  const previousVersion = getPreviousVersion();

  return (
    <div className="flex h-full bg-white">
      {/* Hauptbereich: Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 -ml-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <img 
                src={agent.thumbnail} 
                alt={agent.name} 
                className="w-10 h-10 rounded-full object-cover border border-gray-200"
              />
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{agent.name}</h3>
                <p className="text-xs text-gray-500">{agent.role}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <img 
                src={agent.thumbnail} 
                alt={agent.name} 
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-100 mb-4"
              />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{agent.name}</h3>
              {agent.user_instruction && (
                <p className="text-sm text-gray-500 max-w-md">{agent.user_instruction}</p>
              )}
            </div>
          )}
          
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`
                  max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                  ${msg.role === 'user' 
                    ? 'bg-gray-900 text-white rounded-tr-sm' 
                    : 'bg-gray-100 text-gray-900 rounded-tl-sm'
                  }
                `}
              >
                {msg.content}
              </div>
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

        {/* Input */}
        <div className="p-4 bg-white border-t border-gray-100">
          <div className="max-w-4xl mx-auto relative flex items-center">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={`Nachricht an ${agent.name}...`}
              className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-all placeholder:text-gray-400"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || loading}
              className="absolute right-2 p-1.5 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-gray-900 hover:border-gray-300 disabled:opacity-50 disabled:hover:text-gray-400 transition-all shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Dokumente-Panel (immer sichtbar) */}
      {documents.length > 0 && (
        <div className="w-[40%] border-l border-gray-200 flex flex-col bg-gray-50">
          {/* Panel Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-white">
            <h4 className="font-semibold text-sm text-gray-900">Dokumente</h4>
          </div>

          {/* Dokument ausgewählt: Inhalt anzeigen */}
          {selectedDocument ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Dokument-Header */}
              <div className="px-4 py-3 bg-white border-b border-gray-200">
                <button
                  onClick={() => {
                    setSelectedDocument(null);
                    setDocumentContent(null);
                  }}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 mb-2"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Zurück zur Übersicht
                </button>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div>
                      <h5 className="font-semibold text-gray-900">{selectedDocument.name}</h5>
                      {selectedDocument.description && (
                        <p className="text-xs text-gray-500 mt-1">{selectedDocument.description}</p>
                      )}
                    </div>
                    {/* Realtime-Indikator */}
                    {contentUpdated && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full animate-pulse">
                        <Zap className="w-3 h-3" />
                        Aktualisiert
                      </span>
                    )}
                  </div>
                  {/* Diff-Toggle */}
                  {previousVersion && (
                    <button
                      onClick={() => setShowDiff(!showDiff)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                        showDiff 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      title="Änderungen anzeigen"
                    >
                      <GitCompare className="w-3 h-3" />
                      Diff
                    </button>
                  )}
                </div>
              </div>

              {/* Inhalt */}
              <div className="flex-1 overflow-y-auto p-4">
                {loadingContent ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : documentContent ? (
                  <div className="space-y-4">
                    {/* Aktuelle Version */}
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
                              vs. Version {previousVersion.version}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          {formatDate(documentContent.created_at)}
                        </span>
                      </div>
                      {renderDiffContent()}
                    </div>

                    {/* Versions-Historie */}
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
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => fetchDocumentContent(doc)}
                  className="w-full text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg text-gray-500 group-hover:bg-gray-200 transition-colors">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="font-medium text-sm text-gray-900">{doc.name}</h5>
                        {doc.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                            {doc.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
