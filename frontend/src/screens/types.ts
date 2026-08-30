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
  created_at: string;
};

export type Memory = {
  id: string;
  kind: "two_views" | "occasion" | "month";
  title: string;
  subtitle?: string | null;
  body?: string | null;
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
  accepted_by: string[];
  status: "proposed" | "confirmed" | "done";
  created_at: string;
};
