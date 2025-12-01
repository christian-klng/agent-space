import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { generateAgentResponse } from '../services/geminiService';
import { Agent, Message, Document, Content } from '../types';
import { Send, ArrowLeft, Loader2, FileText, ChevronRight, X, Clock } from 'lucide-react';

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

  // Dokumente State
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [documentContent, setDocumentContent] = useState<Content | null>(null);
  const [contentHistory, setContentHistory] = useState<Content[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [showDocPanel, setShowDocPanel] = useState(false);

  useEffect(() => {
    fetchMessages();
    fetchDocuments();

    const subscription = supabase
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
      supabase.removeChannel(subscription);
    };
  }, [agent.id, workspaceId]);

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

  // Dokumente des Agenten laden
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

  // Neuesten Inhalt eines Dokuments laden
  const fetchDocumentContent = async (doc: Document) => {
    setLoadingContent(true);
    setSelectedDocument(doc);
    setShowDocPanel(true);

    // Neueste Version holen
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

    // Alle Versionen für Historie holen
    const { data: historyData } = await supabase
      .from('contents')
      .select('*')
      .eq('document_id', doc.id)
      .eq('workspace_id', workspaceId)
      .order('version', { ascending: false });

    setContentHistory(historyData || []);
    setLoadingContent(false);
  };

  // Bestimmte Version laden
  const loadVersion = (content: Content) => {
    setDocumentContent(content);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!inputValue.trim() || loading) return;

    const userContent = inputValue.trim();
    setInputValue('');
    setLoading(true);

    try {
      const { error: userError } = await supabase
        .from('messages')
        .insert({
          workspace_id: workspaceId,
          agent_id: agent.id,
          user_id: userId,
          content: userContent,
          role: 'user'
        });

      if (userError) throw userError;

      const responseText = await generateAgentResponse(
        messages, 
        userContent,
        agent.system_instruction
      );

      const { error: aiError } = await supabase
        .from('messages')
        .insert({
          workspace_id: workspaceId,
          agent_id: agent.id,
          user_id: null,
          content: responseText,
          role: 'model'
        });

      if (aiError) throw aiError;

      await fetchMessages();

    } catch (err) {
      console.error('Failed to send message:', err);
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

          {/* Dokumente-Button */}
          {documents.length > 0 && (
            <button
              onClick={() => setShowDocPanel(!showDocPanel)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                showDocPanel 
                  ? 'bg-gray-900 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Dokumente ({documents.length})</span>
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
              <p className="text-sm">Starte eine Unterhaltung mit {agent.name}</p>
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

      {/* Dokumente-Panel (Sidebar) */}
      {showDocPanel && (
        <div className="w-96 border-l border-gray-200 flex flex-col bg-gray-50">
          {/* Panel Header */}
          <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between">
            <h4 className="font-semibold text-sm text-gray-900">Dokumente</h4>
            <button
              onClick={() => setShowDocPanel(false)}
              className="p-1 text-gray-400 hover:text-gray-900 rounded"
            >
              <X className="w-4 h-4" />
            </button>
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
                <h5 className="font-semibold text-gray-900">{selectedDocument.name}</h5>
                {selectedDocument.description && (
                  <p className="text-xs text-gray-500 mt-1">{selectedDocument.description}</p>
                )}
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
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-gray-500">
                          Version {documentContent.version}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDate(documentContent.created_at)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {documentContent.content}
                      </div>
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
