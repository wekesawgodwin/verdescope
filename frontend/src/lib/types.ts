export type Role = 'admin' | 'manager' | 'stakeholder';

export interface User { id: number; name: string; email: string; role: Role; org: string; active: boolean; last_login: string | null }

export interface PublicSettings {
  company_name: string; tagline: string; phone1: string; phone2: string;
  public_email: string; address: string; postal: string; maintenance: boolean;
}
export interface SiteSettings extends PublicSettings { mail_from: string; mail_signature: string; _email_provider?: string; _mail_from_env?: string }

export interface Service { id: number; num: string; icon: string; title: string; summary: string; items: string[]; image: string }
export interface TeamMember { id: number; name: string; role: string; bio: string; years: string }
export interface Assignment { id: number; title: string; client: string; year: number; location: string; type: string }
export interface SiteData { settings: PublicSettings; services: Service[]; team: TeamMember[]; assignments: Assignment[] }

export interface Post {
  id: number; slug: string; title: string; category: string; author: string; date: string;
  status: 'draft' | 'published'; image: string; excerpt: string; body: string;
}

export interface Media { type: 'image' | 'video'; src: string; poster?: string; caption?: string; credit?: string }
export interface GalleryEvent { id: number; title: string; date: string; location: string; category: string; description: string; sample: boolean; media: Media[] }

export type InquiryStatus = 'new' | 'in-progress' | 'replied' | 'closed';
export interface Inquiry {
  id: number; folder: 'inbox' | 'archived'; source: 'website' | 'stakeholder'; name: string; email: string; phone: string; org: string;
  service: string; subject: string; message: string; read: boolean; status: InquiryStatus; created_at: string;
}
export interface OutboundEmail {
  id: number; inquiry_id: number | null; from_email: string; to_email: string; to_name: string; subject: string; body: string;
  sent_by: string; delivered: boolean; error: string; created_at: string;
}
export interface InquiryDetail extends Inquiry { replies: OutboundEmail[] }

export interface Milestone { t: string; done: boolean }
export interface Project { id: number; title: string; org: string; status: string; progress: number; start: string | null; due: string | null; lead: string; milestones: Milestone[] }
export interface DocumentFile { id: number; project_id: number | null; org: string; name: string; size: number; created_at: string }
export interface Announcement { id: number; date: string; title: string; body: string }
export interface ActivityItem { id: number; user_name: string; action: string; created_at: string }
