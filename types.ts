
export type UUID = string;

export enum Role {
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER'
}

export enum Status {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

export enum ContentType {
  VIDEO = 'video',
  ARTICLE = 'article'
}

export enum AssetVariant {
  PORTRAIT = 'portrait',
  LANDSCAPE = 'landscape',
  SQUARE = 'square',
  BANNER = 'banner'
}

export enum AssetType {
  POSTER = 'poster',
  THUMBNAIL = 'thumbnail',
  SUBTITLE = 'subtitle'
}

export interface User {
  id: UUID;
  username: string;
  email: string;
  password?: string;
  role: Role;
}

export interface Topic {
  id: UUID;
  name: string;
}

export interface Program {
  id: UUID;
  title: string;
  description: string;
  language_primary: string;
  languages_available: string[];
  status: Status;
  published_at?: string;
  created_at: string;
  updated_at: string;
  topic_ids: UUID[];
}

export interface Term {
  id: UUID;
  program_id: UUID;
  term_number: number;
  title?: string;
  created_at: string;
}

export interface Lesson {
  id: UUID;
  term_id: UUID;
  lesson_number: number;
  title: string;
  content_type: ContentType;
  duration_ms?: number;
  is_paid: boolean;
  content_language_primary: string;
  content_languages_available: string[];
  content_urls_by_language: Record<string, string>;
  subtitle_languages: string[];
  subtitle_urls_by_language: Record<string, string>;
  status: Status;
  publish_at?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: UUID;
  parent_id: UUID; // program_id or lesson_id
  language: string;
  variant: AssetVariant;
  asset_type: AssetType;
  url: string;
}

export interface CatalogProgram extends Program {
  assets: {
    posters: Record<string, Record<string, string>>;
  };
  topics: string[];
}
