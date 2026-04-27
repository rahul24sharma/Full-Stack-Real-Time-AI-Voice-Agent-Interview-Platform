import { getCurrentUser } from "@/lib/actions/auth.action";
import { createInterviewTemplate } from "@/lib/interviews";

export async function POST(request: Request) {
  const { type, role, level, techstack, amount } = await request.json();

  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "admin") {
      return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { interviewId } = await createInterviewTemplate(
      {
        role,
        type,
        level,
        techstack: String(techstack)
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        amount: Number(amount),
      },
      user.id
    );

    return Response.json({ success: true, interviewId }, { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : error },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json({ success: true, data: "Thank you!" }, { status: 200 });
}
