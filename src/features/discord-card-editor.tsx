"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type DiscordCardDraft = {
  enabled: boolean;
  color: string;
  url: string;
  image_url: string;
  thumbnail_url: string;
  footer: string;
  fields: { name: string; value: string; inline: boolean }[];
};
export const emptyDiscordCard: DiscordCardDraft = {
  enabled: true,
  color: "#ff7430",
  url: "",
  image_url: "",
  thumbnail_url: "",
  footer: "",
  fields: [],
};
export function DiscordCardEditor({
  card,
  onChange,
  title,
  message,
}: {
  card: DiscordCardDraft;
  onChange: (card: DiscordCardDraft) => void;
  title: string;
  message: string;
}) {
  return (
    <fieldset className="space-y-4 rounded border p-4">
      <legend>Format a Discord</legend>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={card.enabled}
          onChange={(e) => onChange({ ...card, enabled: e.target.checked })}
        />
        Enviar com a targeta
      </label>
      {card.enabled && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              Color
              <Input
                type="color"
                value={card.color}
                onChange={(e) => onChange({ ...card, color: e.target.value })}
              />
            </label>
            <label>
              Enllaç del títol
              <Input
                type="url"
                pattern="https://.*"
                placeholder="https://…"
                value={card.url}
                onChange={(e) => onChange({ ...card, url: e.target.value })}
              />
            </label>
            <label>
              Imatge (URL)
              <Input
                type="url"
                pattern="https://.*"
                placeholder="https://…"
                value={card.image_url}
                onChange={(e) =>
                  onChange({ ...card, image_url: e.target.value })
                }
              />
            </label>
            <label>
              Miniatura (URL)
              <Input
                type="url"
                pattern="https://.*"
                placeholder="https://…"
                value={card.thumbnail_url}
                onChange={(e) =>
                  onChange({ ...card, thumbnail_url: e.target.value })
                }
              />
            </label>
            <label className="sm:col-span-2">
              Peu de la targeta
              <Input
                maxLength={200}
                placeholder="HackEPS · LleidaHack"
                value={card.footer}
                onChange={(e) => onChange({ ...card, footer: e.target.value })}
              />
            </label>
          </div>
          {card.fields.map((field, index) => (
            <div
              key={index}
              className="grid gap-2 rounded border p-3 sm:grid-cols-2"
            >
              <label>
                Nom del camp
                <Input
                  required
                  maxLength={100}
                  placeholder="Lloc, hora…"
                  value={field.name}
                  onChange={(e) =>
                    onChange({
                      ...card,
                      fields: card.fields.map((f, i) =>
                        i === index ? { ...f, name: e.target.value } : f,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Contingut
                <Textarea
                  required
                  maxLength={400}
                  value={field.value}
                  onChange={(e) =>
                    onChange({
                      ...card,
                      fields: card.fields.map((f, i) =>
                        i === index ? { ...f, value: e.target.value } : f,
                      ),
                    })
                  }
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={field.inline}
                  onChange={(e) =>
                    onChange({
                      ...card,
                      fields: card.fields.map((f, i) =>
                        i === index ? { ...f, inline: e.target.checked } : f,
                      ),
                    })
                  }
                />{" "}
                En columna
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  onChange({
                    ...card,
                    fields: card.fields.filter((_, i) => i !== index),
                  })
                }
              >
                Eliminar camp
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={card.fields.length >= 5}
            onClick={() =>
              onChange({
                ...card,
                fields: [...card.fields, { name: "", value: "", inline: true }],
              })
            }
          >
            Afegir camp
          </Button>
        </>
      )}
      <div
        aria-label="Previsualització del missatge de Discord"
        className="rounded bg-[#313338] p-4 text-white"
      >
        <p className="mb-3 text-xs text-gray-300">Previsualització</p>
        {card.enabled ? (
          <div
            className="max-w-xl rounded border-l-4 bg-[#2b2d31] p-4"
            style={{ borderColor: card.color }}
          >
            {card.thumbnail_url.startsWith("https://") && (
              <img
                src={card.thumbnail_url}
                alt="Miniatura"
                className="float-right ml-4 h-16 w-16 rounded object-cover"
              />
            )}
            <strong className={card.url ? "text-sky-300" : ""}>
              {title || "Títol de l’avís"}
            </strong>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm">
              {message || "Missatge"}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {card.fields.map((field, index) => (
                <div key={index} className={field.inline ? "" : "col-span-2"}>
                  <strong className="text-sm">{field.name}</strong>
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {field.value}
                  </p>
                </div>
              ))}
            </div>
            {card.image_url.startsWith("https://") && (
              <img
                src={card.image_url}
                alt="Imatge de l’avís"
                className="mt-3 max-h-64 w-full rounded object-contain"
              />
            )}
            <p className="mt-4 text-xs text-gray-300">
              {card.footer || "HackEPS · LleidaHack"}
            </p>
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words">
            <strong>{title}</strong>
            {"\n"}
            {message}
          </p>
        )}
      </div>
    </fieldset>
  );
}
