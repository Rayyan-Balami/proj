import { ColorOption, colorMap } from "@/config/colors";

export interface FolderProps {
  className?: string;
  color?: ColorOption;
}

const Folder = ({ className, color = 'default' }: FolderProps) => {
  const { primary, secondary, accent } = colorMap[color] || colorMap.default;
  
  return (
    <svg
      className={className}
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
    >
      <path className={primary} d="M185.04,48H32C14.328,48,0,62.328,0,80v104h512v-56c0-17.672-14.328-32-32-32H254.96 c-9.488-0.008-18.488-4.232-24.56-11.52l-20.8-24.96C203.528,52.232,194.528,48.008,185.04,48z" />
      <path className={secondary} d="M32,152h448c17.672,0,32,14.328,32,32v248c0,17.672-14.328,32-32,32H32c-17.672,0-32-14.328-32-32 V184C0,166.328,14.328,152,32,152z" />
      <path className={accent} d="M496,200v232c0,8.84-7.16,16-16,16H48c-8.84,0-16,7.16-16,16h448c17.672,0,32-14.328,32-32V184l0,0 C503.16,184,496,191.16,496,200z" />
      <path className={primary} d="M320,312H208c-8.84,0-16-7.16-16-16s7.16-16,16-16h112c8.84,0,16,7.16,16,16S328.84,312,320,312z" />
      <path className="fill-white" d="M472,144c0-8.84-7.16-16-16-16H64c-8.84,0-16,7.16-16,16v8h424V144z" />
    </svg>
  );
};

export { Folder };