import Link from "next/link";

import ProfileNameForm from "@/components/app/profile-name-form";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { listMyOrganisations } from "@/lib/organisations";
import { ensureProfile, getProfileForUser } from "@/lib/profile";
import { getCurrentUser } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function AppHomePage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  await ensureProfile(user);
  const profile = await getProfileForUser(user.id);
  const organisations = await listMyOrganisations(user.id);

  const displayName =
    profile?.full_name?.trim() ||
    (typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : "");

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 space-y-1">
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile and organisations on the app host.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <ProfileNameForm
          initialName={displayName}
          accountEmail={user.email ?? "—"}
        />

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Organisations</CardTitle>
            <CardDescription>
              Create a new organisation or open one you belong to.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link
              href="/organisations/new"
              className={cn(buttonVariants({ variant: "default" }), "inline-flex")}
            >
              Create organisation
            </Link>
            <Separator />
            {organisations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You are not in any organisations yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {organisations.map((org) => (
                  <li key={org.id}>
                    <Link
                      href={`/organisations/${org.id}`}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "h-auto w-full justify-between py-2 whitespace-normal",
                      )}
                    >
                      <span className="font-medium">{org.name}</span>
                      <span className="text-xs text-muted-foreground">Manage</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            Founding an organisation makes you an administrator for that org.
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
