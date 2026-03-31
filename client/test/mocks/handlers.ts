import { graphql, HttpResponse } from "msw";

const mockRoasts = [
  {
    id: "roast-1",
    roastDate: "2026-03-15T00:00:00.000Z",
    notes: "Great first crack, smooth development",
    developmentTime: 75,
    developmentPercent: 18.5,
    totalDuration: 405,
    firstCrackTemp: 196,
    roastEndTemp: 210,
    colourChangeTime: 240,
    colourChangeTemp: 150,
    firstCrackTime: 330,
    roastEndTime: 405,
    rating: 4,
    isShared: false,
    shareToken: null,
    bean: { id: "bean-1", name: "Ethiopia Yirgacheffe" },
    flavors: [
      { id: "f1", name: "Dark Chocolate", category: "Sweet", color: "#8b5e4b", isOffFlavor: false },
      { id: "f2", name: "Blueberry", category: "Fruity", color: "#6a5acd", isOffFlavor: false },
      { id: "f3", name: "Honey", category: "Sweet", color: "#daa520", isOffFlavor: false },
      { id: "f4", name: "Floral", category: "Floral", color: "#db7093", isOffFlavor: false },
    ],
    offFlavors: [],
  },
  {
    id: "roast-2",
    roastDate: "2026-03-10T00:00:00.000Z",
    notes: "Slightly underdeveloped",
    developmentTime: 60,
    developmentPercent: 15.0,
    totalDuration: 400,
    firstCrackTemp: 195,
    roastEndTemp: 205,
    colourChangeTime: 235,
    colourChangeTemp: 148,
    firstCrackTime: 340,
    roastEndTime: 400,
    rating: null,
    isShared: false,
    shareToken: null,
    bean: { id: "bean-2", name: "Colombia Huila" },
    flavors: [
      { id: "f5", name: "Caramel", category: "Sweet", color: "#a88545", isOffFlavor: false },
    ],
    offFlavors: [
      { id: "f6", name: "Grassy", category: "Vegetal", color: "#6b8e23", isOffFlavor: true },
    ],
  },
];

const mockBeans = [
  {
    id: "ub-1",
    shortName: "Yirg",
    notes: "Light roast preferred",
    bean: {
      id: "bean-1",
      name: "Ethiopia Yirgacheffe",
      origin: "Ethiopia",
      process: "Washed",
      elevation: "1800m",
      sourceUrl: null,
      bagNotes: null,
    },
  },
  {
    id: "ub-2",
    shortName: "Huila",
    notes: null,
    bean: {
      id: "bean-2",
      name: "Colombia Huila",
      origin: "Colombia",
      process: "Natural",
      elevation: "1600m",
      sourceUrl: null,
      bagNotes: null,
    },
  },
];

export const handlers = [
  graphql.query("MyRoasts", () => {
    return HttpResponse.json({
      data: { myRoasts: mockRoasts },
    });
  }),

  graphql.query("MyBeans", () => {
    return HttpResponse.json({
      data: { myBeans: mockBeans },
    });
  }),

  graphql.mutation("UpdateRoastRating", ({ variables }) => {
    return HttpResponse.json({
      data: {
        updateRoast: {
          id: variables.id,
          rating: variables.input.rating,
        },
      },
    });
  }),

  graphql.query("FlavorDescriptors", () => {
    return HttpResponse.json({
      data: { flavorDescriptors: [] },
    });
  }),
];
