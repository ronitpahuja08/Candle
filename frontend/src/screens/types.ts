export type PromptState = "open" | "waiting" | "their_turn" | "revealed";

export type Member = {
  id: string;
  pair_id: string;
  device_id: string;
  name?: string | null;
};

export type ResponseRow = {
  id: string;
  device_id: string;
  body: string;
  mood?: string | null;
  image_path?: string | null;
  created_at: string;
};

export type CardState = {
  prompt_index: number;
  count: number;
  mine: boolean;
  state: "waiting" | "their_turn" | "revealed";
  revealed: ResponseRow[] | null;
};

export type Memory = {
  id: string;
  kind: "two_views" | "occasion" | "month";
  title: string;
  subtitle?: string | null;
  body?: string | null;
  image_url?: string | null;
  occurred_on?: string | null;
  created_at: string;
};

export type Plan = {
  id: string;
  proposed_by: string;
  proposer_name?: string | null;
  title: string;
  category: string;
  notes?: string | null;
  when?: string | null;
  date?: string | null;
  accepted_by: string[];
  status: "proposed" | "confirmed" | "done";
  created_at: string;
};
