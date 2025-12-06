// Hook für Documents mit Realtime-Updates

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { Document, Content, TableEntry, WebpageEntry } from '../types';

interface UseDocumentsProps {
  agentId: string;
  workspaceId: string;
}

interface UseDocumentsReturn {
  documents: Document[];
  documentLastUpdated: Record<string, string>;
  selectedDocument: Document | null;
  documentContent: Content | null;
  contentHistory: Content[];
  tableEntries: TableEntry[];
  webpageContent: WebpageEntry | null;
  webpageHistory: WebpageEntry[];
  loadingContent: boolean;
  contentUpdated: boolean;
  selectDocument: (doc: Document) => Promise<void>;
  clearSelection: () => void;
  setDocumentContent: (content: Content | null) => void;
  setTableEntries: React.Dispatch<React.SetStateAction<TableEntry[]>>;
  setWebpageContent: (content: WebpageEntry | null) => void;
  setContentUpdated: (updated: boolean) => void;
}

export const useDocuments = ({ agentId, workspaceId }: UseDocumentsProps): UseDocumentsReturn => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentLastUpdated, setDocumentLastUpdated] = useState<Record<string, string>>({});
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [documentContent, setDocumentContent] = useState<Content | null>(null);
  const [contentHistory, setContentHistory] = useState<Content[]>([]);
  const [tableEntries, setTableEntries] = useState<TableEntry[]>([]);
  const [webpageContent, setWebpageContent] = useState<WebpageEntry | null>(null);
  const [webpageHistory, setWebpageHistory] = useState<WebpageEntry[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [contentUpdated, setContentUpdated] = useState(false);

  // Dokumente laden
  useEffect(() => {
    const fetchDocuments = async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .contains('agent_ids', [agentId]);

      if (error) {
        console.error('Error fetching documents:', error);
        return;
      }

      setDocuments(data || []);
      
      // Last updated für jedes Dokument laden
      if (data && data.length > 0) {
        const lastUpdatedMap: Record<string, string> = {};
        
        for (const doc of data) {
          let tableName = 'contents';
          if (doc.type === 'table') tableName = 'table_entries';
          if (doc.type === 'webpage') tableName = 'webpages';

          const { data: entryData } = await supabase
            .from(tableName)
            .select('created_at')
            .eq('document_id', doc.id)
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (entryData) {
            lastUpdatedMap[doc.id] = entryData.created_at;
          }
        }
        
        setDocumentLastUpdated(lastUpdatedMap);
      }
    };

    fetchDocuments();
  }, [agentId, workspaceId]);

  // Dokument auswählen und Inhalt laden
  const selectDocument = useCallback(async (doc: Document) => {
    setLoadingContent(true);
    setSelectedDocument(doc);
    setTableEntries([]);
    setDocumentContent(null);
    setContentHistory([]);
    setWebpageContent(null);
    setWebpageHistory([]);

    if (doc.type === 'table') {
      const { data, error } = await supabase
        .from('table_entries')
        .select('*')
        .eq('document_id', doc.id)
        .eq('workspace_id', workspaceId)
        .order('row_id')
        .order('version', { ascending: false });

      if (!error && data) {
        const latestByRowId = new Map<string, TableEntry>();
        for (const entry of data) {
          if (!latestByRowId.has(entry.row_id) || entry.version > latestByRowId.get(entry.row_id)!.version) {
            latestByRowId.set(entry.row_id, entry);
          }
        }
        setTableEntries(Array.from(latestByRowId.values()).sort((a, b) => a.position - b.position));
      }
    } else if (doc.type === 'webpage') {
      const { data: latestData } = await supabase
        .from('webpages')
        .select('*')
        .eq('document_id', doc.id)
        .eq('workspace_id', workspaceId)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      setWebpageContent(latestData || null);

      const { data: historyData } = await supabase
        .from('webpages')
        .select('*')
        .eq('document_id', doc.id)
        .eq('workspace_id', workspaceId)
        .order('version', { ascending: false });

      setWebpageHistory(historyData || []);
    } else {
      const { data: latestData } = await supabase
        .from('contents')
        .select('*')
        .eq('document_id', doc.id)
        .eq('workspace_id', workspaceId)
        .order('version', { ascending: false })
        .limit(1)
        .single();

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
  }, [workspaceId]);

  // Auswahl aufheben
  const clearSelection = useCallback(() => {
    setSelectedDocument(null);
    setDocumentContent(null);
    setTableEntries([]);
    setWebpageContent(null);
    setWebpageHistory([]);
  }, []);

  // Realtime für Contents
  useEffect(() => {
    if (!selectedDocument || selectedDocument.type !== 'text') return;

    const subscription = supabase
      .channel(`contents:${selectedDocument.id}:${workspaceId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'contents'
      }, (payload) => {
        const newContent = payload.new as Content;
        if (newContent.document_id !== selectedDocument.id) return;
        if (newContent.workspace_id !== workspaceId) return;
        
        setContentHistory(prev => {
          if (prev.find(c => c.id === newContent.id)) return prev;
          return [newContent, ...prev];
        });
        setDocumentContent(newContent);
        
        setDocumentLastUpdated(prev => ({
          ...prev,
          [newContent.document_id]: newContent.created_at
        }));
        
        setContentUpdated(true);
        setTimeout(() => setContentUpdated(false), 2000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [selectedDocument?.id, selectedDocument?.type, workspaceId]);

  // Realtime für table_entries
  useEffect(() => {
    if (!selectedDocument || selectedDocument.type !== 'table') return;

    const subscription = supabase
      .channel(`table_entries:${selectedDocument.id}:${workspaceId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'table_entries'
      }, (payload) => {
        const newEntry = payload.new as TableEntry;
        if (newEntry.document_id !== selectedDocument.id) return;
        if (newEntry.workspace_id !== workspaceId) return;
        
        setTableEntries(prev => {
          const existingIndex = prev.findIndex(e => e.row_id === newEntry.row_id);
          if (existingIndex >= 0) {
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
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [selectedDocument?.id, selectedDocument?.type, workspaceId]);

  // Realtime für webpages
  useEffect(() => {
    if (!selectedDocument || selectedDocument.type !== 'webpage') return;

    const subscription = supabase
      .channel(`webpages:${selectedDocument.id}:${workspaceId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'webpages'
      }, (payload) => {
        const newWebpage = payload.new as WebpageEntry;
        if (newWebpage.document_id !== selectedDocument.id) return;
        if (newWebpage.workspace_id !== workspaceId) return;
        
        setWebpageHistory(prev => {
          if (prev.find(w => w.id === newWebpage.id)) return prev;
          return [newWebpage, ...prev];
        });
        setWebpageContent(newWebpage);
        
        setDocumentLastUpdated(prev => ({
          ...prev,
          [newWebpage.document_id]: newWebpage.created_at
        }));
        
        setContentUpdated(true);
        setTimeout(() => setContentUpdated(false), 2000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [selectedDocument?.id, selectedDocument?.type, workspaceId]);

  return {
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
    setWebpageContent,
    setContentUpdated
  };
};
