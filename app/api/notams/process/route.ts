import { buildDummyNotamResponse } from "@/lib/notams/dummy";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json(
      { error: "Expected a file field named `file`." },
      { status: 400 },
    );
  }

  if (file.type && file.type !== "application/pdf") {
    return Response.json({ error: "Only PDF uploads are supported." }, { status: 400 });
  }

  return Response.json(buildDummyNotamResponse(file.name));
}
