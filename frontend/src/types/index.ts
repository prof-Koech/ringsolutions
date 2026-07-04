export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone?: string;
  company?: string;
  is_active: boolean;
  is_verified: boolean;
  is_admin: boolean;
  theme_color: string;
  timezone: string;
  created_at: string;
  last_login?: string;
}

export interface Wallet {
  id: string;
  balance: number;
  currency: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  transaction_type: 'topup' | 'debit' | 'refund';
  amount: number;
  balance_before?: number;
  balance_after?: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description?: string;
  mpesa_receipt_number?: string;
  mpesa_phone?: string;
  reference?: string;
  created_at: string;
  completed_at?: string;
}

export type CampaignChannel = 'sms' | 'whatsapp' | 'both';
export type CampaignStatus =
  | 'draft'
  | 'pending_payment'
  | 'queued'
  | 'sending'
  | 'completed'
  | 'failed'
  | 'scheduled'
  | 'cancelled'
  | 'paused';

export interface Campaign {
  id: string;
  name: string;
  message: string;
  channel: CampaignChannel;
  sender_id?: string;
  use_custom_sender_id: boolean;
  scheduled_at?: string;
  is_scheduled: boolean;
  status: CampaignStatus;
  total_contacts: number;
  sms_sent: number;
  sms_delivered: number;
  sms_failed: number;
  whatsapp_sent: number;
  whatsapp_delivered: number;
  whatsapp_read: number;
  whatsapp_failed: number;
  delivery_rate: number;
  estimated_cost: number;
  actual_cost: number;
  custom_sender_id_fee: number;
  report_color: string;
  report_url?: string;
  contact_list_id?: string;
  template_id?: string;
  template_variables?: Record<string, string>;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface ContactList {
  id: string;
  name: string;
  description?: string;
  total_contacts: number;
  valid_contacts: number;
  created_at: string;
}

export interface Contact {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  variables?: Record<string, string>;
  is_valid: boolean;
  is_opted_out: boolean;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  category?: string;
  status: string;
  header_type?: string;
  header_text?: string;
  body_text: string;
  footer_text?: string;
  variables?: string[];
  wa_template_name?: string;
  is_active: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  link?: string;
  meta?: Record<string, unknown>;
  created_at: string;
}

export interface DashboardStats {
  wallet_balance: number;
  total_campaigns: number;
  completed_campaigns: number;
  active_campaigns: number;
  messages_sent_30d: number;
  delivery_rate_30d: number;
  spent_30d: number;
  currency: string;
}

export interface CostEstimate {
  sms_cost: number;
  whatsapp_cost: number;
  custom_sender_id_fee: number;
  total: number;
  currency: string;
}

export interface UploadResult {
  imported: number;
  total_in_file: number;
  invalid_in_file: number;
  file_duplicates_removed: number;
  db_duplicates_skipped: number;
  blacklisted_skipped: number;
  contact_list: ContactList;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}
