import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

declare const process: { env: Record<string, string | undefined> };

export default defineTool({
  name: "get_event_details",
  title: "Get event details",
  description:
    "Fetch the public details of a wedding/event page by its event_type (e.g. 'casamento', 'aniversario') and slug. Returns couple names, date, venue, story and public message.",
  inputSchema: {
    event_type: z
      .string()
      .min(1)
      .describe("Event type segment from the URL, e.g. 'casamento' or 'aniversario'."),
    slug: z.string().min(1).describe("Unique event slug from the URL."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ event_type, slug }) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data, error } = await supabase
      .from("wedding_details")
      .select(
        "slug,event_type,bride_name,groom_name,wedding_date,venue_name,venue_address,venue_map_url,story,couple_message,invitation_message,theme_id,is_public_showcase,tenant_status"
      )
      .eq("event_type", event_type)
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }

    if (!data || data.tenant_status !== "active" || !data.is_public_showcase) {
      return {
        content: [
          {
            type: "text",
            text: "Event not found or not publicly available.",
          },
        ],
        isError: true,
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { event: data },
    };
  },
});
