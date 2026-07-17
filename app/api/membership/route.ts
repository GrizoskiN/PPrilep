import { NextResponse } from "next/server";
import { submitMembershipRequest, type MembershipTier } from "../../actions/membership";
import { getRequestUser } from "../../../lib/supabase/request-user";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const user = await getRequestUser(request);
    
    // Validate required fields
    if (!data.tier || !data.full_name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const res = await submitMembershipRequest({
      tier: data.tier as MembershipTier,
      full_name: data.full_name,
      email: data.email || "no-email@mojprilep.mk", // fallback if somehow empty
      phone: data.phone,
      message: data.message,
    }, user);

    if (res.error) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, approved: res.approved });
  } catch (error: any) {
    console.error("Error in membership API route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
