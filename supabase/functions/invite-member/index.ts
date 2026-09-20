// ============================================================
// NOVANEST - Edge Function: invite-member
// Creates a Supabase Auth user for an approved team member.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return json({ error: "Missing auth token" }, 401);
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: userData, error: userErr } = await serviceClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return json({ error: "Invalid auth token" }, 401);
    }

    const { data: adminRow } = await serviceClient
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (!adminRow) {
      return json({ error: "Not authorized: caller is not an admin" }, 403);
    }

    const body = await req.json();
    const { email, full_name, role } = body;

    if (!email || !full_name || !role) {
      return json({ error: "Missing required fields: email, full_name, role" }, 400);
    }

    const tempPassword = generatePassword(12);

    const { data: created, error: createErr } = await serviceClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name,
        role,
        invited_at: new Date().toISOString(),
      },
    });

    if (createErr) {
      return json({ error: "Could not create user: " + createErr.message }, 400);
    }

    const newUserId = created.user.id;

    const { error: profileErr } = await serviceClient
      .from("member_profiles")
      .insert({
        user_id: newUserId,
        email,
        full_name,
        role,
        status: "active",
        temp_password: tempPassword,
        invited_by: userData.user.id,
      });

    if (profileErr) {
      await serviceClient.auth.admin.deleteUser(newUserId);
      return json({ error: "Could not create profile: " + profileErr.message }, 500);
    }

    return json({
      success: true,
      user_id: newUserId,
      email,
      temp_password: tempPassword,
      login_url: "https://novanest-drab.vercel.app/labs/login.html",
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return json({ error: "Unexpected error: " + String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generatePassword(length: number): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ" +
    "abcdefghijkmnopqrstuvwxyz" +
    "23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}