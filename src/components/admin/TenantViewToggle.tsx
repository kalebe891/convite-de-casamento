import { LayoutGrid, List } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type TenantViewMode = "cards" | "list";

interface Props {
  value: TenantViewMode;
  onChange: (v: TenantViewMode) => void;
}

export default function TenantViewToggle({ value, onChange }: Props) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as TenantViewMode)}
      variant="outline"
      size="sm"
    >
      <ToggleGroupItem value="cards" aria-label="Cards" className="gap-1.5">
        <LayoutGrid className="w-4 h-4" />
        <span className="hidden sm:inline">Cards</span>
      </ToggleGroupItem>
      <ToggleGroupItem value="list" aria-label="Lista" className="gap-1.5">
        <List className="w-4 h-4" />
        <span className="hidden sm:inline">Lista</span>
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
