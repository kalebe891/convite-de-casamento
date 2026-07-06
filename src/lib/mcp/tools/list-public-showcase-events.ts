import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_public_showcase_events",
  title: "List public showcase events",
  description:
    "List published wedding/event pages that opted into the public showcase. Returns event type, slug, couple/host names, event date and venue.",
  inputSchema: {
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20)
      .describe("Maximum number of events to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data, error } = await supabase
      .from("wedding_details")
      .select(
        "slug,event_type,bride_name,groom_name,wedding_date,venue_name,venue_address"
      )
      .eq("is_public_showcase", true)
      .eq("tenant_status", "active")
      .not("slug", "is", null)
      .order("wedding_date", { ascending: true })
      .limit(limit);

    if (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { events: data ?? [] },
    };
  },
});
