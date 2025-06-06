import { GlobalDelete } from "@/components/footer/global-delete";
import { GlobalMenu } from "@/components/footer/global-menu";
import { SearchForm } from "@/components/footer/search-form";
import { SortOptions } from "@/components/footer/sort-options";
import { Uploads } from "@/components/footer/uploads";
import { ViewOptions } from "@/components/footer/view-options";
import { ButtonGroup } from "@/components/ui/button-group";

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-background/80 backdrop-blur-md sticky bottom-0 z-50 border-t transition-[height]">
      <Uploads />
      <nav className="flex h-(--footer-height) items-center gap-8 px-4 justify-between">
        <ViewOptions />
        <span className="hidden sm:flex flex-grow">
          <SearchForm id="search-desktop" />
        </span>
        <ButtonGroup orientation="horizontal" className="*:border">
          <SortOptions />
          <GlobalDelete />
          <GlobalMenu />
        </ButtonGroup>
      </nav>
      <div className="sm:hidden px-4">
        <SearchForm id="search-mobile" />
      </div>
    </footer>
  );
}
