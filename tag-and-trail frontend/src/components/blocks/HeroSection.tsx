import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { HeroDitheringCard } from "../ui/HeroDitheringCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export function HeroSection() {
  return (
    <>
      <HeroHeader />
      <main className="overflow-hidden">
        <section className="relative pt-24 md:pt-36">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center">
              <HeroDitheringCard />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

const menuItems = [
  { name: "Features", href: "/#features" },
  { name: "Solution", href: "/#solution" },
  { name: "About", href: "/about" },
];

const HeroHeader = () => {
  const [menuState, setMenuState] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Dynamic button label
  const buttonLabel = isScrolled ? "Get Started" : "Sign Up";

  return (
    <header>
      <nav
        data-state={menuState && "active"}
        className="fixed z-20 w-full px-2 group"
      >
        <div
          className={cn(
            "mx-auto mt-2 transition-all duration-500 ease-in-out",
            "bg-transparent max-w-5xl px-6 lg:px-12",
            isScrolled &&
              "bg-white/70 max-w-xl rounded-2xl shadow-sm backdrop-blur-lg px-8 lg:px-10"
          )}
        >
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            <div className="flex w-full justify-between lg:w-auto">
              <Link to="/" aria-label="home" className="flex items-center space-x-2">
                <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  Tag & Trail
                </span>
              </Link>
              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState ? "Close Menu" : "Open Menu"}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
              >
                <Menu className="in-data-[state=active]:rotate-180 group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                <X className="group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
              </button>
            </div>

            {/* Desktop navigation (centered) */}
            <div className="absolute inset-0 m-auto hidden size-fit lg:block">
              <ul className="flex gap-8 text-sm">
                {menuItems.map((item, index) => (
                  <li key={index}>
                    <Link
                      to={item.href}
                      className="text-muted-foreground hover:text-accent-foreground block duration-150"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Desktop buttons */}
            <div className="hidden lg:flex items-center gap-3">
              <Button
                asChild
                variant="outline"
                size="sm"
                className={cn(
                  "border-slate-200 bg-white text-black hover:bg-slate-100",
                  isScrolled && "lg:hidden"
                )}
              >
                <Link to="/login">Login</Link>
              </Button>

              {/* Button label changes based on scroll */}
              <Button
                asChild
                size="sm"
                className="!bg-black !text-white hover:!bg-black/80"
              >
                <Link to="/signup">{buttonLabel}</Link>
              </Button>
            </div>
          </div>

          {/* Mobile menu */}
          <div
            className={cn(
              "lg:hidden flex-col gap-2 border-t border-slate-200/70 pt-4 pb-2",
              menuState ? "flex" : "hidden"
            )}
          >
            {menuItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                onClick={() => setMenuState(false)}
              >
                {item.name}
              </Link>
            ))}
            <Link
              to="/login"
              className="mt-1 inline-flex min-h-12 items-center justify-center rounded-xl bg-white border border-slate-200 px-4 text-sm font-semibold text-black shadow-sm"
              onClick={() => setMenuState(false)}
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="mt-1 inline-flex min-h-12 items-center justify-center rounded-xl bg-black px-4 text-sm font-semibold text-white shadow-sm"
              onClick={() => setMenuState(false)}
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}