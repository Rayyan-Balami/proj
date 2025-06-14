import { GlobalDelete } from "@/components/footer/global-delete";
import { GlobalMenu } from "@/components/footer/global-menu";
import { SearchForm } from "@/components/footer/search-form";
import SearchOptions from "@/components/footer/search-options";
import { SortOptions } from "@/components/footer/sort-options";
import { Uploads } from "@/components/footer/uploads";
import { ViewOptions } from "@/components/footer/view-options";
import { ButtonGroup } from "@/components/ui/button-group";
import { useRouterState } from "@tanstack/react-router";

export function SiteFooter() {
  const routerState = useRouterState();
  const isSearchRoute = routerState.location.pathname === "/search";
  return (
    <footer className="mt-auto sticky bottom-0 z-50 transition-[height] px-4 py-2 border-t backdrop-blur-md bg-background/80">
      <nav className="flex flex-wrap items-center justify-between gap-y-2 gap-x-8">
        {!isSearchRoute && <Uploads />}
        {isSearchRoute && <SearchOptions />}
        <ViewOptions />
        <span className="hidden sm:flex flex-grow">
          <SearchForm id="search-desktop" />
        </span>
        <ButtonGroup orientation="horizontal" className="*:border">
          <SortOptions />
          <GlobalDelete />
          <GlobalMenu />
        </ButtonGroup>
        <div className="sm:hidden flex-grow">
          <SearchForm id="search-mobile" />
        </div>
      </nav>
    </footer>
  );
}
