export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  webhook_url?: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  workspace_id?: string;
  created_at: string;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  thumbnail: string;
  system_instruction: string;
  workspace_id?: string;
  workflow_id?: string;
}

export interface Message {
  id: string;
  workspace_id: string;
  agent_id: string;
  user_id: string | null;
  content: string;
  role: 'user' | 'model';
  created_at: string;
}

export interface ChatSession {
  agentId: string;
  messages: Message[];
}

// Neue Typen für Dokumente

export interface Document {
  id: string;
  name: string;
  description: string | null;
  agent_ids: string[];
  created_at: string;
}

export interface Content {
  id: string;
  document_id: string;
  workspace_id: string;
  content: string;
  version: number;
  created_at: string;
}

// Hilftyp: Dokument mit aktuellem Inhalt
export interface DocumentWithContent extends Document {
  latestContent: Content | null;
}
