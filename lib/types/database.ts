export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type District = 'Center' | 'Varoš' | 'Trizla' | 'Točila' | 'Rid' | 'Tri Bari'
export type Category = 'road' | 'water' | 'power' | 'garbage' | 'park' | 'other'
export type IssueStatus = 'open' | 'progress' | 'resolved'
export type Provider = 'water' | 'garbage' | 'power'
export type CampaignStatus = 'active' | 'completed' | 'cancelled'

export interface Profile {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  points: number
  created_at: string
}

export interface Issue {
  id: number
  title: string
  description: string | null
  street_name: string | null
  district: District
  category: Category
  status: IssueStatus
  photo_url: string | null
  reported_by: string | null
  created_at: string
  updated_at: string
  // joined
  profiles?: Profile | null
  affected_count?: number
  helper_count?: number
  is_affected?: boolean
  is_helper?: boolean
  user_helper_note?: string | null
}

export interface IssueAffected {
  issue_id: number
  user_id: string
}

export interface IssueHelper {
  issue_id: number
  user_id: string
  note: string | null
}

export interface FundCampaign {
  id: number
  title: string
  description: string | null
  district: string | null
  goal_amount: number
  raised_amount: number
  status: CampaignStatus
  created_by: string | null
  created_at: string
  profiles?: Profile | null
}

export interface Idea {
  id: number
  title: string
  body: string | null
  upvotes: number
  created_by: string | null
  created_at: string
  profiles?: Profile | null
}

export interface UtilityPost {
  id: number
  provider: Provider | null
  title: string
  body: string | null
  status: IssueStatus | null
  posted_at: string
}
