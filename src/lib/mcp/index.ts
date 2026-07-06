import { defineMcp } from "@lovable.dev/mcp-js";
import listPublicShowcaseEvents from "./tools/list-public-showcase-events";
import getEventDetails from "./tools/get-event-details";

export default defineMcp({
  name: "convite-de-evento-mcp",
  title: "Convite de Evento MCP",
  version: "0.1.0",
  instructions:
    "Tools for browsing public wedding and event invitation pages hosted on Convite de Evento. Use `list_public_showcase_events` to discover events that opted into the public showcase, then `get_event_details` to fetch a specific event by event_type and slug.",
  tools: [listPublicShowcaseEvents, getEventDetails],
});
