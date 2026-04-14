"use client";

import { useState } from "react";

import type { AppDataRow } from "@/lib/bootstrap";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type AppDataCarouselProps = {
  items: AppDataRow[];
};

function formatDateTime(value: Date | string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AppDataCarousel({ items }: AppDataCarouselProps) {
  const [selectedItem, setSelectedItem] = useState<AppDataRow | null>(null);

  return (
    <div className="record-card-list">
      {items.map((item) => (
        <article key={item.small_str} className="record-card">
          <div className="record-card__body">
            <p className="record-card__metric-value">{item.num ?? "-"}</p>

            <div className="record-card__surface">
              <p className="record-card__title">{item.small_str}</p>
              <div className="record-card__meta">
                <p className="record-card__meta-label">Data</p>
                <p className="record-card__meta-value">{formatDateTime(item.dt)}</p>
              </div>
            </div>
          </div>

          <div className="record-card__actions">
            <Dialog
              open={selectedItem?.small_str === item.small_str}
              onOpenChange={(open) => setSelectedItem(open ? item : null)}
            >
              <DialogTrigger asChild>
                <button type="button" className="app-button">
                  Ver detalhes
                </button>
              </DialogTrigger>
              <DialogPortal>
                <DialogOverlay className="dialog-overlay" />
                <DialogContent className="dialog-content">
                  <div className="dialog-header">
                    <DialogHeader className="dialog-header__layout">
                      <div>
                        <p className="dialog-label">Detalhes</p>
                        <DialogTitle className="dialog-title">
                          {item.small_str}
                        </DialogTitle>
                        <DialogDescription className="dialog-description">
                          Visualizacao em modal flutuante usando `Dialog` do
                          `shadcn/ui`.
                        </DialogDescription>
                      </div>
                      <DialogClose asChild>
                        <button type="button" className="app-button app-button--auto">
                          Fechar
                        </button>
                      </DialogClose>
                    </DialogHeader>
                  </div>

                  <div className="dialog-body">
                    <dl className="dialog-grid">
                      <div className="info-card">
                        <dt className="info-card__label">small_str</dt>
                        <dd className="info-card__value">{item.small_str}</dd>
                      </div>
                      <div className="info-card">
                        <dt className="info-card__label">num</dt>
                        <dd className="info-card__value">{item.num ?? "-"}</dd>
                      </div>
                      <div className="info-card info-card--wide">
                        <dt className="info-card__label">large_str</dt>
                        <dd className="info-card__value">{item.large_str || "-"}</dd>
                      </div>
                      <div className="info-card info-card--wide">
                        <dt className="info-card__label">dt</dt>
                        <dd className="info-card__value">{formatDateTime(item.dt)}</dd>
                      </div>
                    </dl>
                  </div>
                </DialogContent>
              </DialogPortal>
            </Dialog>
          </div>
        </article>
      ))}
    </div>
  );
}
