export const COFFEE_PROCESSES = [
  "Washed",
  "Natural",
  "Honey",
  "Pulped Natural",
  "Wet-Hulled",
  "Anaerobic",
  "Carbonic Maceration",
  "Swiss Water Decaf",
  "Mountain Water Decaf",
  "Sugarcane Decaf",
] as const;

export type CoffeeProcess = (typeof COFFEE_PROCESSES)[number];
