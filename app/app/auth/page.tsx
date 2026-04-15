import AuthCard from "@/components/auth/auth-card";

export default function AppAuthPage() {
  return (
    <main className="min-h-[calc(100vh)] bg-background">
      <div className="relative mx-auto grid min-h-[calc(100vh)] max-w-6xl grid-cols-1 items-center px-6 py-12 md:px-10">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_20%_20%,oklch(0.985_0_0)_0%,transparent_55%),radial-gradient(75%_60%_at_80%_40%,oklch(0.97_0_0)_0%,transparent_60%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        <section className="mx-auto w-full max-w-md">
          <AuthCard />
          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing, you agree this environment is for private testing.
          </p>
        </section>
      </div>
    </main>
  );
}
