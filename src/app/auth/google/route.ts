import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function POST() {
  const supabase = await createClient();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  console.log("OAuth redirect URL:", siteUrl);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (error) {
    console.error("Error signing in with Google:", error);
    redirect("/auth?error=oauth_error");
  }

  if (data.url) {
    redirect(data.url);
  }

  redirect("/auth");
}
