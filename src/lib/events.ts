import type { EventRecord } from "./api";
export const emptyEvent = {
  name: "",
  description: "",
  start_date: "",
  end_date: "",
  location: "",
  archived: false,
  price: 0,
  max_participants: 150,
  max_group_size: 4,
  max_sponsors: 10,
};
export function eventPayload(form: FormData, current?: EventRecord) {
  const value = (key: string) => String(form.get(key) ?? "").trim();
  const number = (key: string, minimum: number) => {
    const n = Number(value(key));
    if (!Number.isInteger(n) || n < minimum)
      throw new Error(`Revisa el campo ${key}.`);
    return n;
  };
  if (!value("name") || !value("location"))
    throw new Error("Indica el nombre y la ubicación.");
  const start = value("start_date"),
    end = value("end_date");
  if (
    !start ||
    !end ||
    !Number.isFinite(Date.parse(start)) ||
    !Number.isFinite(Date.parse(end)) ||
    new Date(end) <= new Date(start)
  )
    throw new Error("La fecha de fin debe ser posterior al inicio.");
  return {
    name: value("name"),
    description: value("description"),
    location: value("location"),
    start_date: start,
    end_date: end,
    price: number("price", 0),
    max_participants: number("max_participants", 0),
    max_group_size: number("max_group_size", 1),
    max_sponsors: number("max_sponsors", 0),
    ...(!current ? { archived: false } : {}),
  };
}
export function dateLabel(value: string) {
  return new Date(value).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
