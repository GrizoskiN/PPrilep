export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type District =
  | "Center"
  | "Varoš"
  | "Trizla"
  | "Točila"
  | "Rid"
  | "Tipski"
  | "Boncejca";
export type Category =
  | "road"
  | "water"
  | "power"
  | "garbage"
  | "park"
  | "violation"
  | "other";
export type IssueStatus = "open" | "progress" | "resolved";
export type Provider = "water" | "garbage" | "power";
export type CampaignStatus = "active" | "completed" | "cancelled";
export type NotificationType =
  | "issue_comment"
  | "issue_affected"
  | "issue_helper"
  | "issue_help_comment"
  | "issue_help_vote"
  | "idea_upvote";

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  points: number;
  is_admin?: boolean;
  created_at: string;
}

export interface Issue {
  id: number;
  title: string;
  description: string | null;
  street_name: string | null;
  district: District;
  category: Category;
  status: IssueStatus;
  photo_url: string | null;
  after_photo_url?: string | null;
  reported_by: string | null;
  resolved_by?: string | null;
  resolver?: Profile | null;
  resolution_upvotes?: number;
  has_upvoted_resolver?: boolean;
  created_at: string;
  updated_at: string;
  // joined
  profiles?: Profile | null;
  affected_count?: number;
  helper_count?: number;
  is_affected?: boolean;
  is_helper?: boolean;
  user_helper_note?: string | null;
}

export interface IssueAffected {
  issue_id: number;
  user_id: string;
}

export interface IssueHelper {
  issue_id: number;
  user_id: string;
  note: string | null;
}

export interface FundCampaign {
  id: number;
  title: string;
  description: string | null;
  district: string | null;
  goal_amount: number;
  raised_amount: number;
  status: CampaignStatus;
  created_by: string | null;
  created_at: string;
  profiles?: Profile | null;
}

export interface Idea {
  id: number;
  title: string;
  body: string | null;
  upvotes: number;
  created_by: string | null;
  created_at: string;
  profiles?: Profile | null;
}

export interface UtilityPost {
  id: number;
  provider: Provider | null;
  title: string;
  body: string | null;
  source_url: string | null;
  status: IssueStatus | null;
  posted_at: string;
}

export interface AppNotification {
  id: number;
  recipient_user_id: string;
  actor_user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  read_at: string | null;
  created_at: string;
  actor?: Profile | null;
}
