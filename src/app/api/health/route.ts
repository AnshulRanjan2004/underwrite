import { publicProviderStatus } from "@/lib/harness/providers";
import { TOOL_COUNT } from "@/lib/harness/tools";
import { SKILLS } from "@/lib/harness/skills";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    status: "ok",
    provider: publicProviderStatus(),
    tools: TOOL_COUNT,
    skills: SKILLS.length,
    modes: ["auto", "research", "analytical"],
  });
}
