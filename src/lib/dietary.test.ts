import { describe, expect, it } from "vitest";
import { dietaryLabels, groupDietaryResponses } from "./dietary";

describe("dietaryLabels", () => {
  it.each([
    [" Gluten. ", ["Gluten"]],
    ["gluten", ["Gluten"]],
    ["Vegetariana", ["Vegetarià/ana"]],
    ["Vegetarià", ["Vegetarià/ana"]],
    ["No pork", ["Sense porc"]],
    ["Porc", ["Sense porc"]],
    ["Fruits Secs(tots)", ["Fruits secs"]],
    ["Frutos secos, melocoton", ["Fruits secs", "Préssec"]],
    ["Peixos i moluscos", ["Peix", "Mol·luscs"]],
    ["Pescado", ["Peix"]],
    ["Halal", ["Halal"]],
    ["Halal o en su defecto vegetariana, gracias.", ["Halal o vegetarià"]],
    ["No me gusta el tomate", ["Preferència: sense tomàquet"]],
    ["No", ["Sense restriccions declarades"]],
    [null, ["Sense especificar"]],
  ])("normalizes only explicit aliases: %s", (value, labels) => {
    expect(dietaryLabels(value)).toEqual(labels);
  });

  it.each([
    "Carn",
    "Faves",
    "Hidrats de Carboni",
    "Ou dur",
    "No menjo Carn de cap tipus.",
    "no puc menjar cap carn excepte els mariscos",
    "Seafood and red meat (e.g. lamb) allergy",
    "No gluten allergy",
    "constructor",
    "__proto__",
  ])("preserves unrecognized answers without guessing: %s", (value) => {
    expect(dietaryLabels(value)).toEqual([`Per confirmar: ${value}`]);
  });

  it("combines counts while retaining original responses and conditional diets", () => {
    const responses = [
      { restriction: "Gluten", count: 1 },
      { restriction: "gluten", count: 1 },
      { restriction: "Vegetariana", count: 1 },
      { restriction: "Vegetarià", count: 2 },
      { restriction: "Porc", count: 3 },
      { restriction: "No pork", count: 1 },
      { restriction: "Halal", count: 2 },
      { restriction: "Halal o en su defecto vegetariana, gracias.", count: 1 },
      { restriction: "Fruits Secs(tots)", count: 1 },
      { restriction: "Frutos secos, melocoton", count: 1 },
    ];
    const snapshot = structuredClone(responses);
    const groups = groupDietaryResponses(responses);
    expect(
      Object.fromEntries(groups.map(({ label, count }) => [label, count])),
    ).toEqual({
      Gluten: 2,
      "Vegetarià/ana": 3,
      "Sense porc": 4,
      Halal: 2,
      "Halal o vegetarià": 1,
      "Fruits secs": 2,
      Préssec: 1,
    });
    expect(groups.find((group) => group.label === "Gluten")?.originals).toEqual(
      responses.slice(0, 2),
    );
    expect(responses).toEqual(snapshot);
    expect(groupDietaryResponses([])).toEqual([]);
  });
});
