export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      anime: {
        Row: {
          alternative_titles: string | null
          anilist_id: number | null
          anilist_url: string | null
          cour: string | null
          cover_url: string | null
          created_at: string | null
          duration_minutes: number | null
          episodes: number | null
          episodes_watched: number | null
          genre: string | null
          id: string
          is_bookmarked: boolean | null
          is_favorite: boolean | null
          is_hentai: boolean | null
          is_movie: boolean
          mal_id: number | null
          mal_url: string | null
          notes: string | null
          parent_title: string | null
          rating: number | null
          release_year: number | null
          schedule: string | null
          season: number | null
          status: string
          streaming_url: string | null
          studio: string | null
          synopsis: string | null
          title: string
          user_id: string
          watch_status: string
          watched_at: string | null
        }
        Insert: {
          alternative_titles?: string | null
          anilist_id?: number | null
          anilist_url?: string | null
          cour?: string | null
          cover_url?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          episodes?: number | null
          episodes_watched?: number | null
          genre?: string | null
          id?: string
          is_bookmarked?: boolean | null
          is_favorite?: boolean | null
          is_hentai?: boolean | null
          is_movie?: boolean
          mal_id?: number | null
          mal_url?: string | null
          notes?: string | null
          parent_title?: string | null
          rating?: number | null
          release_year?: number | null
          schedule?: string | null
          season?: number | null
          status?: string
          streaming_url?: string | null
          studio?: string | null
          synopsis?: string | null
          title: string
          user_id: string
          watch_status?: string
          watched_at?: string | null
        }
        Update: {
          alternative_titles?: string | null
          anilist_id?: number | null
          anilist_url?: string | null
          cour?: string | null
          cover_url?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          episodes?: number | null
          episodes_watched?: number | null
          genre?: string | null
          id?: string
          is_bookmarked?: boolean | null
          is_favorite?: boolean | null
          is_hentai?: boolean | null
          is_movie?: boolean
          mal_id?: number | null
          mal_url?: string | null
          notes?: string | null
          parent_title?: string | null
          rating?: number | null
          release_year?: number | null
          schedule?: string | null
          season?: number | null
          status?: string
          streaming_url?: string | null
          studio?: string | null
          synopsis?: string | null
          title?: string
          user_id?: string
          watch_status?: string
          watched_at?: string | null
        }
        Relationships: []
      }
      backup_logs: {
        Row: {
          backup_id: string | null
          execution_time: string | null
          id: string
          message: string | null
          status: string
        }
        Insert: {
          backup_id?: string | null
          execution_time?: string | null
          id?: string
          message?: string | null
          status: string
        }
        Update: {
          backup_id?: string | null
          execution_time?: string | null
          id?: string
          message?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "backup_logs_backup_id_fkey"
            columns: ["backup_id"]
            isOneToOne: false
            referencedRelation: "backups"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_settings: {
        Row: {
          backup_time: string
          cron_job_id: number | null
          id: string
          is_enabled: boolean
          supabase_anon_key: string | null
          supabase_url: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          backup_time?: string
          cron_job_id?: number | null
          id?: string
          is_enabled?: boolean
          supabase_anon_key?: string | null
          supabase_url?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          backup_time?: string
          cron_job_id?: number | null
          id?: string
          is_enabled?: boolean
          supabase_anon_key?: string | null
          supabase_url?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      backups: {
        Row: {
          content: Json
          created_at: string | null
          id: string
        }
        Insert: {
          content: Json
          created_at?: string | null
          id?: string
        }
        Update: {
          content?: Json
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      catatan: {
        Row: {
          color: string
          content: string
          created_at: string
            id: string
            is_pinned: boolean
            related_id: string | null
            related_title: string | null
            related_type: string | null
            tags: string[]
            title: string
            updated_at: string
            user_id: string
        }
        Insert: {
          color?: string
          content?: string
          created_at?: string
            id?: string
            is_pinned?: boolean
            related_id?: string | null
            related_title?: string | null
            related_type?: string | null
            tags?: string[]
            title: string
            updated_at?: string
            user_id: string
        }
        Update: {
          color?: string
          content?: string
          created_at?: string
            id?: string
            is_pinned?: boolean
            related_id?: string | null
            related_title?: string | null
            related_type?: string | null
            tags?: string[]
            title?: string
            updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      donghua: {
        Row: {
          alternative_titles: string | null
          anilist_id: number | null
          anilist_url: string | null
          cour: string | null
          cover_url: string | null
          created_at: string | null
          duration_minutes: number | null
          episodes: number | null
          episodes_watched: number | null
          genre: string | null
          id: string
          is_bookmarked: boolean | null
          is_favorite: boolean | null
          is_hentai: boolean | null
          is_movie: boolean
          mal_id: number | null
          mal_url: string | null
          notes: string | null
          parent_title: string | null
          rating: number | null
          release_year: number | null
          schedule: string | null
          season: number | null
          status: string
          streaming_url: string | null
          studio: string | null
          synopsis: string | null
          title: string
          user_id: string
          watch_status: string
          watched_at: string | null
        }
        Insert: {
          alternative_titles?: string | null
          anilist_id?: number | null
          anilist_url?: string | null
          cour?: string | null
          cover_url?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          episodes?: number | null
          episodes_watched?: number | null
          genre?: string | null
          id?: string
          is_bookmarked?: boolean | null
          is_favorite?: boolean | null
          is_hentai?: boolean | null
          is_movie?: boolean
          mal_id?: number | null
          mal_url?: string | null
          notes?: string | null
          parent_title?: string | null
          rating?: number | null
          release_year?: number | null
          schedule?: string | null
          season?: number | null
          status?: string
          streaming_url?: string | null
          studio?: string | null
          synopsis?: string | null
          title: string
          user_id: string
          watch_status?: string
          watched_at?: string | null
        }
        Update: {
          alternative_titles?: string | null
          anilist_id?: number | null
          anilist_url?: string | null
          cour?: string | null
          cover_url?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          episodes?: number | null
          episodes_watched?: number | null
          genre?: string | null
          id?: string
          is_bookmarked?: boolean | null
          is_favorite?: boolean | null
          is_hentai?: boolean | null
          is_movie?: boolean
          mal_id?: number | null
          mal_url?: string | null
          notes?: string | null
          parent_title?: string | null
          rating?: number | null
          release_year?: number | null
          schedule?: string | null
          season?: number | null
          status?: string
          streaming_url?: string | null
          studio?: string | null
          synopsis?: string | null
          title?: string
          user_id?: string
          watch_status?: string
          watched_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          level: string
          message: string
          tagihan_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          level?: string
          message: string
          tagihan_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          level?: string
          message?: string
          tagihan_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tagihan_id_fkey"
            columns: ["tagihan_id"]
            isOneToOne: false
            referencedRelation: "tagihan"
            referencedColumns: ["id"]
          },
        ]
      }
      obat: {
        Row: {
          created_at: string | null
          dosage: string | null
          frequency: string | null
          id: string
          name: string
          notes: string | null
          side_effects: string | null
          type: string | null
          usage_info: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dosage?: string | null
          frequency?: string | null
          id?: string
          name: string
          notes?: string | null
          side_effects?: string | null
          type?: string | null
          usage_info?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dosage?: string | null
          frequency?: string | null
          id?: string
          name?: string
          notes?: string | null
          side_effects?: string | null
          type?: string | null
          usage_info?: string | null
          user_id?: string
        }
        Relationships: []
      }
      struk: {
        Row: {
          file_name: string | null
          file_type: string | null
          file_url: string
          id: string
          keterangan: string | null
          tagihan_id: string
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          file_name?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          keterangan?: string | null
          tagihan_id: string
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          file_name?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          keterangan?: string | null
          tagihan_id?: string
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "struk_tagihan_id_fkey"
            columns: ["tagihan_id"]
            isOneToOne: false
            referencedRelation: "tagihan"
            referencedColumns: ["id"]
          },
        ]
      }
      tagihan: {
        Row: {
          barang_nama: string
          bunga_persen: number
          catatan: string | null
          cicilan_per_bulan: number
          created_at: string | null
          debitur_kontak: string | null
          debitur_nama: string
          denda_persen_per_hari: number
          harga_awal: number
          id: string
          jangka_waktu_bulan: number
          jenis_tempo: string | null
          keuntungan_estimasi: number
          kuantitas: string | null
          metode_pembayaran: string | null
          sisa_hutang: number
          status: Database["public"]["Enums"]["tagihan_status"]
          sumber_modal: string | null
          tanggal_jatuh_tempo: string | null
          tanggal_mulai: string
          tanggal_mulai_bayar: string | null
          tgl_bayar_hari: number | null
          tgl_bayar_tanggal: string | null
          tgl_tempo_hari: number | null
          tgl_tempo_tanggal: string | null
          total_dibayar: number
          total_hutang: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          barang_nama: string
          bunga_persen?: number
          catatan?: string | null
          cicilan_per_bulan?: number
          created_at?: string | null
          debitur_kontak?: string | null
          debitur_nama: string
          denda_persen_per_hari?: number
          harga_awal?: number
          id?: string
          jangka_waktu_bulan?: number
          jenis_tempo?: string | null
          keuntungan_estimasi?: number
          kuantitas?: string | null
          metode_pembayaran?: string | null
          sisa_hutang?: number
          status?: Database["public"]["Enums"]["tagihan_status"]
          sumber_modal?: string | null
          tanggal_jatuh_tempo?: string | null
          tanggal_mulai?: string
          tanggal_mulai_bayar?: string | null
          tgl_bayar_hari?: number | null
          tgl_bayar_tanggal?: string | null
          tgl_tempo_hari?: number | null
          tgl_tempo_tanggal?: string | null
          total_dibayar?: number
          total_hutang?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          barang_nama?: string
          bunga_persen?: number
          catatan?: string | null
          cicilan_per_bulan?: number
          created_at?: string | null
          debitur_kontak?: string | null
          debitur_nama?: string
          denda_persen_per_hari?: number
          harga_awal?: number
          id?: string
          jangka_waktu_bulan?: number
          jenis_tempo?: string | null
          keuntungan_estimasi?: number
          kuantitas?: string | null
          metode_pembayaran?: string | null
          sisa_hutang?: number
          status?: Database["public"]["Enums"]["tagihan_status"]
          sumber_modal?: string | null
          tanggal_jatuh_tempo?: string | null
          tanggal_mulai?: string
          tanggal_mulai_bayar?: string | null
          tgl_bayar_hari?: number | null
          tgl_bayar_tanggal?: string | null
          tgl_tempo_hari?: number | null
          tgl_tempo_tanggal?: string | null
          total_dibayar?: number
          total_hutang?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tagihan_history: {
        Row: {
          aksi: string
          created_at: string | null
          detail: string | null
          id: string
          jumlah: number | null
          tagihan_id: string
          user_id: string
        }
        Insert: {
          aksi: string
          created_at?: string | null
          detail?: string | null
          id?: string
          jumlah?: number | null
          tagihan_id: string
          user_id: string
        }
        Update: {
          aksi?: string
          created_at?: string | null
          detail?: string | null
          id?: string
          jumlah?: number | null
          tagihan_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tagihan_history_tagihan_id_fkey"
            columns: ["tagihan_id"]
            isOneToOne: false
            referencedRelation: "tagihan"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_subscriptions: {
        Row: {
          chat_id: number
          created_at: string | null
          id: string
          is_active: boolean | null
          monthly_report_date: number | null
          notify_due_reminder: boolean | null
          notify_monthly_report: boolean | null
          notify_overdue: boolean | null
          reminder_days_before: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          chat_id: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          monthly_report_date?: number | null
          notify_due_reminder?: boolean | null
          notify_monthly_report?: boolean | null
          notify_overdue?: boolean | null
          reminder_days_before?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          chat_id?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          monthly_report_date?: number | null
          notify_due_reminder?: boolean | null
          notify_monthly_report?: boolean | null
          notify_overdue?: boolean | null
          reminder_days_before?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          anime_title_lang: string | null
          created_at: string | null
          donghua_title_lang: string | null
          id: string
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          anime_title_lang?: string | null
          created_at?: string | null
          donghua_title_lang?: string | null
          id?: string
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          anime_title_lang?: string | null
          created_at?: string | null
          donghua_title_lang?: string | null
          id?: string
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      waifu: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          name: string
          notes: string | null
          source: string | null
          source_type: string
          tier: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          name: string
          notes?: string | null
          source?: string | null
          source_type?: string
          tier?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          name?: string
          notes?: string | null
          source?: string | null
          source_type?: string
          tier?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_dashboard_summary: {
        Args: never
        Returns: {
          anime_count: number
          anime_ongoing_count: number
          donghua_count: number
          donghua_ongoing_count: number
          obat_count: number
          tagihan_aktif_count: number
          tagihan_count: number
          tagihan_ditunda_count: number
          tagihan_lunas_count: number
          tagihan_monthly_income: number
          tagihan_overdue_status_count: number
          tagihan_total_dibayar: number
          tagihan_total_keuntungan: number
          tagihan_total_modal_bergulir: number
          tagihan_total_modal_terpisah: number
          waifu_count: number
          waifu_tier_s_count: number
        }[]
      }
      get_next_backup_run: {
        Args: never
        Returns: {
          is_enabled: boolean
          next_run: string
          schedule: string
        }[]
      }
      get_public_tables: {
        Args: never
        Returns: {
          table_name: string
        }[]
      }
      initialize_backup_with_secrets: {
        Args: { p_supabase_anon_key: string; p_supabase_url: string }
        Returns: undefined
      }
      manage_backup_cron_job: {
        Args: {
          p_backup_time: string
          p_is_enabled: boolean
          p_supabase_anon_key?: string
          p_supabase_url?: string
          p_timezone?: string
        }
        Returns: undefined
      }
      record_tagihan_payment: {
        Args: {
          p_amount: number
          p_keterangan?: string
          p_tagihan_id: string
          p_tanggal?: string
        }
        Returns: {
          is_lunas: boolean
          sisa_hutang: number
          status: string
          tagihan_id: string
          total_dibayar: number
        }[]
      }
      update_backup_settings: {
        Args: {
          p_backup_time: string
          p_is_enabled: boolean
          p_supabase_anon_key?: string
          p_supabase_url?: string
          p_timezone?: string
        }
        Returns: undefined
      }
    }
    Enums: {
      jenis_tempo: "bulanan" | "berjangka"
      sumber_modal_type: "modal_terpisah" | "modal_bergulir" | "dana_luar"
      tagihan_status: "aktif" | "lunas" | "overdue" | "ditunda"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      jenis_tempo: ["bulanan", "berjangka"],
      sumber_modal_type: ["modal_terpisah", "modal_bergulir", "dana_luar"],
      tagihan_status: ["aktif", "lunas", "overdue", "ditunda"],
    },
  },
} as const
