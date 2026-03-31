import { graphql, HttpResponse } from "msw";

const mockFlavorDescriptors = [
  { id: "fd-1", name: "Jasmine", category: "FLORAL", isOffFlavor: false, isCustom: false, color: "#db7093" },
  { id: "fd-2", name: "Rose", category: "FLORAL", isOffFlavor: false, isCustom: false, color: "#db7093" },
  { id: "fd-3", name: "Dark Chocolate", category: "COCOA", isOffFlavor: false, isCustom: false, color: "#8b5e4b" },
  { id: "fd-4", name: "Blueberry", category: "BERRY", isOffFlavor: false, isCustom: false, color: "#6a5acd" },
  { id: "fd-5", name: "Caramel", category: "CARAMEL", isOffFlavor: false, isCustom: false, color: "#a88545" },
  { id: "fd-6", name: "Honey", category: "HONEY", isOffFlavor: false, isCustom: false, color: "#daa520" },
];

const mockOffFlavorDescriptors = [
  { id: "ofd-1", name: "Grassy", category: "OFF_FLAVOR", isOffFlavor: true, isCustom: false, color: "#6b8e23" },
  { id: "ofd-2", name: "Roasty", category: "OFF_FLAVOR", isOffFlavor: true, isCustom: false, color: "#c44a3b" },
  { id: "ofd-3", name: "Ashy", category: "OFF_FLAVOR", isOffFlavor: true, isCustom: false, color: "#808080" },
];

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

const mockRoastDetail = {
  id: "test-id",
  roastDate: "2026-03-15T00:00:00.000Z",
  notes: "Great first crack, smooth development",
  rating: 4,
  ambientTemp: 22.5,
  developmentTime: 75,
  developmentPercent: 18.5,
  totalDuration: 405,
  colourChangeTime: 240,
  colourChangeTemp: 150,
  firstCrackTime: 330,
  firstCrackTemp: 196,
  roastEndTime: 405,
  roastEndTemp: 210,
  timeSeriesData: [],
  roastProfileCurve: [],
  fanProfileCurve: [],
  isShared: false,
  shareToken: "abc-123-share",
  bean: {
    id: "bean-1",
    name: "Ethiopia Yirgacheffe",
    sourceUrl: "https://example.com/beans/ethiopia",
  },
  roastProfile: {
    id: "profile-1",
    fileName: "ethiopia-light.kpro",
  },
  flavors: [
    { id: "f1", name: "Dark Chocolate", category: "Sweet", color: "#8b5e4b", isOffFlavor: false },
    { id: "f2", name: "Blueberry", category: "Fruity", color: "#6a5acd", isOffFlavor: false },
  ],
  offFlavors: [],
};

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

  graphql.query("RoastById", ({ variables }) => {
    if (variables.id === "test-id") {
      return HttpResponse.json({
        data: { roastById: mockRoastDetail },
      });
    }
    return HttpResponse.json({
      data: { roastById: null },
    });
  }),

  graphql.mutation("DeleteRoast", ({ variables }) => {
    return HttpResponse.json({
      data: { deleteRoast: true },
    });
  }),

  graphql.mutation("ToggleRoastSharing", ({ variables }) => {
    return HttpResponse.json({
      data: {
        toggleRoastSharing: {
          id: variables.id,
          isShared: true,
          shareToken: "abc-123-share",
        },
      },
    });
  }),

  graphql.mutation("UpdateRoast", ({ variables }) => {
    return HttpResponse.json({
      data: {
        updateRoast: {
          id: variables.id,
          notes: variables.input?.notes ?? null,
          rating: variables.input?.rating ?? null,
        },
      },
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

  graphql.query("FlavorDescriptors", ({ variables }) => {
    const isOffFlavor = variables.isOffFlavor;
    const descriptors = isOffFlavor ? mockOffFlavorDescriptors : mockFlavorDescriptors;
    return HttpResponse.json({
      data: { flavorDescriptors: descriptors },
    });
  }),

  graphql.mutation("SetRoastFlavors", ({ variables }) => {
    return HttpResponse.json({
      data: {
        setRoastFlavors: {
          id: variables.roastId,
          flavors: variables.descriptorIds.map((id: string) => {
            const d = mockFlavorDescriptors.find((f) => f.id === id);
            return d ?? { id, name: "Unknown", category: "BODY", color: "#888888", isOffFlavor: false };
          }),
        },
      },
    });
  }),

  graphql.mutation("SetRoastOffFlavors", ({ variables }) => {
    return HttpResponse.json({
      data: {
        setRoastOffFlavors: {
          id: variables.roastId,
          offFlavors: variables.descriptorIds.map((id: string) => {
            const d = mockOffFlavorDescriptors.find((f) => f.id === id);
            return d ?? { id, name: "Unknown", category: "OFF_FLAVOR", color: "#c44a3b", isOffFlavor: true };
          }),
        },
      },
    });
  }),

  graphql.query("PreviewRoastLog", () => {
    return HttpResponse.json({
      data: {
        previewRoastLog: {
          roastDate: "2026-03-20T00:00:00.000Z",
          ambientTemp: 22.0,
          roastingLevel: 55.0,
          profileShortName: "Yirg",
          profileDesigner: "Jake",
          colourChangeTime: 240,
          firstCrackTime: 330,
          roastEndTime: 405,
          developmentPercent: 18.5,
          totalDuration: 405,
          suggestedBean: {
            id: "ub-1",
            shortName: "Yirg",
            bean: { id: "bean-1", name: "Ethiopia Yirgacheffe" },
          },
          parseWarnings: ["Ambient temp not recorded"],
        },
      },
    });
  }),

  graphql.mutation("UploadRoastLog", ({ variables }) => {
    return HttpResponse.json({
      data: {
        uploadRoastLog: {
          roast: { id: "roast-new-1" },
          parseWarnings: [],
        },
      },
    });
  }),

  graphql.query("RoastsByBean", ({ variables }) => {
    const beanRoasts = mockRoasts
      .filter((r) => r.bean.id === variables.beanId)
      .map(({ bean: _bean, isShared: _is, shareToken: _st, colourChangeTime: _cct, colourChangeTemp: _cctp, firstCrackTime: _fct, roastEndTime: _ret, ...rest }) => rest);
    return HttpResponse.json({
      data: { roastsByBean: beanRoasts },
    });
  }),

  graphql.mutation("UpdateUserBean", ({ variables }) => {
    return HttpResponse.json({
      data: {
        updateUserBean: {
          id: variables.id,
          notes: variables.notes ?? null,
          shortName: variables.shortName ?? null,
        },
      },
    });
  }),

  graphql.query("ScrapeBeanUrl", ({ variables }) => {
    return HttpResponse.json({
      data: {
        scrapeBeanUrl: {
          name: "Colombia China Alta Jose Buitrago",
          origin: "Huila, Colombia",
          process: "Washed",
          elevation: "1800-2000m",
          bagNotes: "A clean and balanced cup with caramel sweetness and milk chocolate body.",
          suggestedFlavors: ["Caramel", "Milk Chocolate", "Apple"],
        },
      },
    });
  }),

  graphql.mutation("CreateBean", ({ variables }) => {
    return HttpResponse.json({
      data: {
        createBean: {
          id: "ub-new-1",
          shortName: variables.input.shortName,
          bean: {
            id: "bean-new-1",
            name: variables.input.name,
            origin: variables.input.origin ?? null,
            process: variables.input.process ?? null,
            elevation: variables.input.elevation ?? null,
            sourceUrl: variables.input.sourceUrl ?? null,
            bagNotes: variables.input.bagNotes ?? null,
          },
        },
      },
    });
  }),

  graphql.query("RoastsByIds", ({ variables }) => {
    const ids = variables.ids as string[];
    const compareRoasts = [
      {
        id: "roast-1",
        roastDate: "2026-03-15T00:00:00.000Z",
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
        timeSeriesData: [
          { time: 0, temp: 25 },
          { time: 60, temp: 100 },
          { time: 120, temp: 150 },
        ],
        bean: { id: "bean-1", name: "Ethiopia Yirgacheffe" },
      },
      {
        id: "roast-2",
        roastDate: "2026-03-10T00:00:00.000Z",
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
        timeSeriesData: [
          { time: 0, temp: 24 },
          { time: 60, temp: 98 },
          { time: 120, temp: 148 },
        ],
        bean: { id: "bean-2", name: "Colombia Huila" },
      },
      {
        id: "roast-3",
        roastDate: "2026-03-20T00:00:00.000Z",
        developmentTime: 80,
        developmentPercent: 19.5,
        totalDuration: 410,
        firstCrackTemp: 198,
        roastEndTemp: 212,
        colourChangeTime: 245,
        colourChangeTemp: 152,
        firstCrackTime: 335,
        roastEndTime: 410,
        rating: 5,
        timeSeriesData: [
          { time: 0, temp: 26 },
          { time: 60, temp: 102 },
          { time: 120, temp: 152 },
        ],
        bean: { id: "bean-1", name: "Ethiopia Yirgacheffe" },
      },
    ];
    const filtered = compareRoasts.filter((r) => ids.includes(r.id));
    return HttpResponse.json({
      data: { roastsByIds: filtered },
    });
  }),

  graphql.mutation("UpdateTempUnit", ({ variables }) => {
    return HttpResponse.json({
      data: {
        updateTempUnit: {
          id: "user-1",
          tempUnit: variables.tempUnit,
        },
      },
    });
  }),

  graphql.query("RoastByShareToken", ({ variables }) => {
    if (variables.token === "valid-share-token") {
      return HttpResponse.json({
        data: {
          roastByShareToken: {
            id: "shared-roast-1",
            roastDate: "2026-03-15T00:00:00.000Z",
            notes: "Shared roast notes",
            rating: 4,
            developmentTime: 75,
            developmentPercent: 18.5,
            totalDuration: 405,
            colourChangeTime: 240,
            colourChangeTemp: 150,
            firstCrackTime: 330,
            firstCrackTemp: 196,
            roastEndTime: 405,
            roastEndTemp: 210,
            timeSeriesData: [],
            roastProfileCurve: [],
            fanProfileCurve: [],
            bean: { id: "bean-1", name: "Ethiopia Yirgacheffe" },
            roastProfile: { id: "profile-1", fileName: "ethiopia-light.kpro" },
            flavors: [
              { id: "f1", name: "Dark Chocolate", category: "Sweet", color: "#8b5e4b", isOffFlavor: false },
            ],
            offFlavors: [],
          },
        },
      });
    }
    return HttpResponse.json({
      data: { roastByShareToken: null },
    });
  }),

  graphql.mutation("CreateFlavorDescriptor", ({ variables }) => {
    return HttpResponse.json({
      data: {
        createFlavorDescriptor: {
          id: "custom-new-1",
          name: variables.name,
          category: variables.category,
          isCustom: true,
          color: "#888888",
          isOffFlavor: variables.category === "OFF_FLAVOR",
        },
      },
    });
  }),
];
