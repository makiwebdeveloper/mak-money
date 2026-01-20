import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  console.log("Callback route - origin:", origin);
  console.log("Callback route - next:", next);
  console.log("Callback route - request.url:", request.url);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const redirectUrl = `${origin}${next}`;
      console.log("Redirecting to:", redirectUrl);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Return error redirect
  return NextResponse.redirect(`${origin}/auth?error=callback_error`);
}
