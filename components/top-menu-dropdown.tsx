"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const menuItems = [
  { href: "/", label: "Inicio" },
  { href: "/db_bootstrap", label: "DB Bootstrap" },
];

export function TopMenuDropdown() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <div ref={containerRef} className="toolbar-menu">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="toolbar-control"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <span className="toolbar-control__indicator" />
        <span>Menu</span>
        <span className="toolbar-control__caret">{isOpen ? "^" : "v"}</span>
      </button>

      {isOpen ? (
        <div className="toolbar-menu__panel" role="menu">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`toolbar-menu__link ${isActive ? "toolbar-menu__link--active" : ""}`}
                role="menuitem"
              >
                <span>{item.label}</span>
                {isActive ? <span className="toolbar-menu__state">*</span> : null}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
