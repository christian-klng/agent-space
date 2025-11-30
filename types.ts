export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
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
}

export interface Message {
  id: string;
  user_id: string;
  agent_id: string;
  content: string;
  role: 'user' | 'model';
  created_at: string;
}

export interface ChatSession {
  agentId: string;
  messages: Message[];
}
