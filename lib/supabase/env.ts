function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getSupabaseConfig() {
  return {
    url: requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    publishableKey: requiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  };
}
