import CreateOrganisationForm from "@/components/app/create-organisation-form";

export default function NewOrganisationPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <div className="mb-8 space-y-1">
        <h1 className="font-heading text-2xl font-medium tracking-tight">
          New organisation
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter the organisation name and how you describe your role there.
        </p>
      </div>
      <CreateOrganisationForm />
    </main>
  );
}
