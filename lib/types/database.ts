export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      aircraft: {
        Row: {
          created_at: string;
          id: string;
          manufacturer: string;
          metadata: Json | null;
          organisation_id: string;
          seats: string;
          tail_number: string;
          type: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          manufacturer: string;
          metadata?: Json | null;
          organisation_id: string;
          seats: string;
          tail_number: string;
          type: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          manufacturer?: string;
          metadata?: Json | null;
          organisation_id?: string;
          seats?: string;
          tail_number?: string;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "aircraft_organisation_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
        ];
      };
      organisation_members: {
        Row: {
          created_at: string;
          id: string;
          is_admin: boolean;
          organisation_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_admin?: boolean;
          organisation_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_admin?: boolean;
          organisation_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organisation_members_organisation_id_fkey";
            columns: ["organisation_id"];
            isOneToOne: false;
            referencedRelation: "organisations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organisation_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      organisations: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          email: string;
          id: string;
          role: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          email: string;
          id: string;
          role: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          email?: string;
          id?: string;
          role?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type PublicSchema = Database["public"];

export type Tables<TableName extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][TableName]["Row"];
