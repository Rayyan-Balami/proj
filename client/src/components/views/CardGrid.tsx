import { FileSystemItem } from "@/types/folderDocumnet";
import FolderDocumentCard, { CardVariant } from "@/components/cards/FolderDocumentCard";
import { DraggableFolderCard } from "@/components/cards/DraggableFolderCard";

interface CardGridProps {
  items: FileSystemItem[];
  viewType: CardVariant;
  onOpen: (id: string) => void;
}

export function CardGrid({ items, viewType, onOpen }: CardGridProps) {
  return (
    <div
      className={`grid ${
        viewType === "large"
          ? "grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-4 md:gap-6"
          : viewType === "compact"
          ? "grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4 md:gap-6"
          : "grid-cols-1 gap-0.5"
      }`}
    >
      {items.map((item, i) => (
        <DraggableFolderCard
          key={item.id}
          item={item}
          variant={viewType}
          alternateBg={viewType === "list" && i % 2 !== 0}
          onOpen={() => onOpen(item.id)}
        />
      ))}
    </div>
  );
}