import SignOutCard from "@/components/app/sign-out-card";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function AppHomePage() {
  const user = await getCurrentUser();
  const label = user?.email ?? user?.id ?? "Signed-in user";

  return (
    <main className="min-h-[calc(100vh)] bg-background">
      <div className="mx-auto flex min-h-[calc(100vh)] max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
        <SignOutCard email={label} />
      </div>
    </main>
  );
}
