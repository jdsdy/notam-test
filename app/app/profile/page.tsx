import { getProfileForUser } from "@/lib/profile";
import { getCurrentUser } from "@/lib/supabase/server";
import ProfileForms from "@/components/app/profile-forms";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const profile = await getProfileForUser(user.id);
  const displayName =
    profile?.full_name?.trim() ||
    (typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name.trim()
      : "") ||
    "";

  return (
    <main className="space-y-12">
      <header className="rise-in rise-in-1 space-y-2">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-muted-foreground">
          Profile
        </p>
        <h1 className="font-heading text-4xl font-normal tracking-tight text-foreground md:text-5xl">
          Your account
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Update how you appear to your organisations, switch the email you sign
          in with, and rotate your password.
        </p>
      </header>

      <ProfileForms
        initialName={displayName}
        initialEmail={user.email ?? ""}
      />
    </main>
  );
}
