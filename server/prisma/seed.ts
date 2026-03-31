import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { CATEGORY_COLORS } from "../src/lib/flavorColors.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

/**
 * Generate a minimal realistic time-series array for seed purposes.
 * Simulates a ~9-10 minute Kaffelogic roast with 25 data points.
 */
function generateTimeSeries(opts: {
  totalDuration: number;
  colourChangeTime?: number;
  firstCrackTime?: number;
  roastEndTime?: number;
  startTemp?: number;
  endTemp: number;
}) {
  const {
    totalDuration,
    startTemp = 22,
    endTemp,
  } = opts;
  const points = 25;
  const interval = totalDuration / (points - 1);
  const series = [];

  for (let i = 0; i < points; i++) {
    const time = Math.round(i * interval * 10) / 10;
    const progress = i / (points - 1);
    // S-curve temperature rise
    const sCurve = 1 / (1 + Math.exp(-10 * (progress - 0.35)));
    const temp = Math.round((startTemp + (endTemp - startTemp) * sCurve) * 10) / 10;
    const spotTemp = Math.round((temp + (Math.random() - 0.5) * 3) * 10) / 10;
    const meanTemp = Math.round((temp - 1 + Math.random() * 2) * 10) / 10;
    const profileTemp = Math.round((temp + (Math.random() - 0.5) * 1.5) * 10) / 10;
    // ROR peaks mid-roast then falls
    const rorPeak = progress < 0.5
      ? progress * 2 * 18
      : (1 - progress) * 2 * 18;
    const actualROR = Math.round((rorPeak + (Math.random() - 0.5) * 3) * 10) / 10;
    const desiredROR = Math.round((rorPeak + 1) * 10) / 10;
    const profileROR = Math.round((rorPeak + 0.5) * 10) / 10;
    // Power ramps down, fan ramps up
    const powerKW = Math.round((1.2 - progress * 0.8) * 100) / 100;
    const actualFanRPM = Math.round(1200 + progress * 800);

    series.push({
      time,
      spotTemp,
      temp,
      meanTemp,
      profileTemp,
      profileROR,
      actualROR,
      desiredROR,
      powerKW,
      actualFanRPM,
    });
  }
  return series;
}

/** Generate a simple roast profile curve */
function generateProfileCurve(totalDuration: number, endTemp: number) {
  const points = 20;
  const interval = totalDuration / (points - 1);
  return Array.from({ length: points }, (_, i) => {
    const progress = i / (points - 1);
    const sCurve = 1 / (1 + Math.exp(-10 * (progress - 0.35)));
    return {
      time: Math.round(i * interval * 10) / 10,
      temp: Math.round((22 + (endTemp - 22) * sCurve) * 10) / 10,
    };
  });
}

/** Generate a simple fan profile curve */
function generateFanCurve(totalDuration: number) {
  const points = 15;
  const interval = totalDuration / (points - 1);
  return Array.from({ length: points }, (_, i) => {
    const progress = i / (points - 1);
    return {
      time: Math.round(i * interval * 10) / 10,
      rpm: Math.round(1200 + progress * 800),
    };
  });
}


const FLAVOR_DESCRIPTORS: { name: string; category: string; isOffFlavor?: boolean }[] = [
  // FLORAL
  { name: "Jasmine", category: "FLORAL" },
  { name: "Rose", category: "FLORAL" },
  { name: "Lavender", category: "FLORAL" },
  { name: "Chamomile", category: "FLORAL" },
  // HONEY
  { name: "Honey", category: "HONEY" },
  { name: "Honeycomb", category: "HONEY" },
  { name: "Honeydew", category: "HONEY" },
  // SUGARS
  { name: "Brown Sugar", category: "SUGARS" },
  { name: "Molasses", category: "SUGARS" },
  { name: "Maple Syrup", category: "SUGARS" },
  { name: "Raw Sugar", category: "SUGARS" },
  // CARAMEL
  { name: "Caramel", category: "CARAMEL" },
  { name: "Butterscotch", category: "CARAMEL" },
  { name: "Toffee", category: "CARAMEL" },
  { name: "Dulce de Leche", category: "CARAMEL" },
  // FRUITS
  { name: "Stone Fruit", category: "FRUITS" },
  { name: "Apple", category: "FRUITS" },
  { name: "Grape", category: "FRUITS" },
  { name: "Tropical Fruit", category: "FRUITS" },
  // CITRUS
  { name: "Lemon", category: "CITRUS" },
  { name: "Orange", category: "CITRUS" },
  { name: "Grapefruit", category: "CITRUS" },
  { name: "Lime", category: "CITRUS" },
  // BERRY
  { name: "Blueberry", category: "BERRY" },
  { name: "Raspberry", category: "BERRY" },
  { name: "Strawberry", category: "BERRY" },
  { name: "Blackberry", category: "BERRY" },
  // COCOA
  { name: "Dark Chocolate", category: "COCOA" },
  { name: "Milk Chocolate", category: "COCOA" },
  { name: "Cocoa Nib", category: "COCOA" },
  { name: "Bittersweet", category: "COCOA" },
  // NUTS
  { name: "Walnut", category: "NUTS" },
  { name: "Almond", category: "NUTS" },
  { name: "Hazelnut", category: "NUTS" },
  { name: "Peanut", category: "NUTS" },
  // RUSTIC
  { name: "Tobacco", category: "RUSTIC" },
  { name: "Leather", category: "RUSTIC" },
  { name: "Smoky", category: "RUSTIC" },
  // SPICE
  { name: "Cinnamon", category: "SPICE" },
  { name: "Clove", category: "SPICE" },
  { name: "Nutmeg", category: "SPICE" },
  { name: "Black Pepper", category: "SPICE" },
  // BODY
  { name: "Creamy", category: "BODY" },
  { name: "Silky", category: "BODY" },
  { name: "Syrupy", category: "BODY" },
  // OFF_FLAVOR
  { name: "Thin", category: "OFF_FLAVOR", isOffFlavor: true },
  { name: "Sour", category: "OFF_FLAVOR", isOffFlavor: true },
  { name: "Astringent", category: "OFF_FLAVOR", isOffFlavor: true },
  { name: "Crabapple", category: "OFF_FLAVOR", isOffFlavor: true },
  { name: "Pithy", category: "OFF_FLAVOR", isOffFlavor: true },
  { name: "Flat", category: "OFF_FLAVOR", isOffFlavor: true },
  { name: "Roasty/Burnt", category: "OFF_FLAVOR", isOffFlavor: true },
  { name: "Baked", category: "OFF_FLAVOR", isOffFlavor: true },
  { name: "Cranberry", category: "OFF_FLAVOR", isOffFlavor: true },
  { name: "Grassy", category: "OFF_FLAVOR", isOffFlavor: true },
  { name: "Rubbery", category: "OFF_FLAVOR", isOffFlavor: true },
  { name: "Musty", category: "OFF_FLAVOR", isOffFlavor: true },
  { name: "Papery", category: "OFF_FLAVOR", isOffFlavor: true },
  { name: "Acrid", category: "OFF_FLAVOR", isOffFlavor: true },
  { name: "Ashy", category: "OFF_FLAVOR", isOffFlavor: true },
];

async function seedFlavorDescriptors() {
  for (const fd of FLAVOR_DESCRIPTORS) {
    await prisma.flavorDescriptor.upsert({
      where: { name: fd.name },
      update: {},
      create: {
        name: fd.name,
        category: fd.category as any,
        isOffFlavor: fd.isOffFlavor ?? false,
        color: CATEGORY_COLORS[fd.category],
      },
    });
  }
  console.log(`Seeded ${FLAVOR_DESCRIPTORS.length} flavor descriptors`);
}

async function main() {
  // Clean flavor data
  await prisma.roastFlavor.deleteMany();
  await prisma.flavorDescriptor.deleteMany();

  // Clean existing data
  await prisma.espressoShot.deleteMany();
  await prisma.roastProfile.deleteMany();
  await prisma.roastFile.deleteMany();
  await prisma.roast.deleteMany();
  await prisma.userBean.deleteMany();
  await prisma.bean.deleteMany();
  await prisma.user.deleteMany();

  // --- Flavor Descriptors ---
  await seedFlavorDescriptors();

  // --- Users ---
  const alice = await prisma.user.create({
    data: { clerkId: "clerk_seed_alice_001" },
  });
  const bob = await prisma.user.create({
    data: { clerkId: "clerk_seed_bob_002" },
  });
  const carol = await prisma.user.create({
    data: { clerkId: "clerk_seed_carol_003" },
  });

  // --- Beans (shared catalog, no userId) ---
  const ethiopiaYirg = await prisma.bean.create({
    data: {
      name: "Ethiopia Yirgacheffe Kochere Debo",
      origin: "Ethiopia",
      process: "Washed",
      cropYear: 2025,
      elevation: "1900-2100m",
      bagNotes: "Floral and citrus-forward with a delicate jasmine aroma. Expect lemon brightness, blueberry sweetness, and a clean tea-like finish.",
    },
  });

  const colombiaHuila = await prisma.bean.create({
    data: {
      name: "Colombia Huila Excelso EP",
      origin: "Colombia",
      process: "Washed",
      cropYear: 2025,
      elevation: "1600-1900m",
      bagNotes: "A clean and balanced cup with caramel sweetness, red apple brightness, and a smooth chocolate finish.",
    },
  });

  const kenyaAA = await prisma.bean.create({
    data: {
      name: "Kenya Nyeri Ichamama AA",
      origin: "Kenya",
      process: "Washed",
      cropYear: 2025,
      elevation: "1700-1800m",
      bagNotes: "Intensely bright with blackcurrant and grapefruit. Syrupy body with a wine-like finish.",
    },
  });

  const brazilSantos = await prisma.bean.create({
    data: {
      name: "Brazil Mogiana Natural Dry Process",
      origin: "Brazil",
      process: "Natural",
      cropYear: 2025,
      elevation: "900-1100m",
      bagNotes: "Low acidity, heavy body. Chocolate, peanut butter, and a hint of dried fruit sweetness.",
    },
  });

  const guatemalaAntigua = await prisma.bean.create({
    data: {
      name: "Guatemala Antigua Pastores Pulcal",
      origin: "Guatemala",
      process: "Washed",
      elevation: "1500-1700m",
      bagNotes: "Dark chocolate and spice with smoky undertones. Full body, roasts well at City+ to Full City.",
    },
  });

  const sumatraMandheling = await prisma.bean.create({
    data: {
      name: "Sumatra Mandheling Grade 1 DP",
      origin: "Sumatra",
      process: "Wet-hulled",
      cropYear: 2024,
      elevation: "1200-1500m",
      bagNotes: "Earthy, herbal, and cedary with full body and low acidity. Wet-hulled processing gives it a distinctive rustic character.",
    },
  });

  const costaRicaTarrazu = await prisma.bean.create({
    data: {
      name: "Costa Rica Tarrazú La Pastora SHB",
      origin: "Costa Rica",
      process: "Honey",
      cropYear: 2025,
      elevation: "1400-1700m",
      bagNotes: "Honey sweetness with stone fruit brightness. Clean finish with a silky body.",
    },
  });

  const panamaBoquete = await prisma.bean.create({
    data: {
      name: "Panama Boquete Carmen Estate Geisha",
      origin: "Panama",
      process: "Washed",
      cropYear: 2025,
      elevation: "1600-1800m",
      bagNotes: "Delicate jasmine and white peach aromatics. Tea-like body with extraordinary complexity.",
    },
  });

  // --- UserBean (library entries with per-user notes) ---
  // Alice's library
  await prisma.userBean.createMany({
    data: [
      { userId: alice.id, beanId: ethiopiaYirg.id, shortName: "Eth Yirg", notes: "Floral, bergamot, lemon brightness" },
      { userId: alice.id, beanId: colombiaHuila.id, shortName: "Col Huila", notes: "Caramel, red apple, clean finish" },
      { userId: alice.id, beanId: kenyaAA.id, shortName: "Kenya AA", notes: "Blackcurrant, grapefruit, syrupy body" },
    ],
  });

  // Bob's library (shares Ethiopia Yirg with Alice)
  await prisma.userBean.createMany({
    data: [
      { userId: bob.id, beanId: brazilSantos.id, shortName: "Brz Santos", notes: "Chocolate, peanut, low acidity" },
      { userId: bob.id, beanId: guatemalaAntigua.id, shortName: "Guat Ant", notes: "Dark chocolate, spice, smoky" },
      { userId: bob.id, beanId: ethiopiaYirg.id, shortName: "Eth Yirg", notes: "Trying Alice's rec — floral and bright" },
    ],
  });

  // Carol's library
  await prisma.userBean.createMany({
    data: [
      { userId: carol.id, beanId: sumatraMandheling.id, shortName: "Sum Mandh", notes: "Earthy, herbal, full body, low acidity" },
      { userId: carol.id, beanId: costaRicaTarrazu.id, shortName: "CR Tarrazú", notes: "Honey sweetness, stone fruit, bright" },
      { userId: carol.id, beanId: panamaBoquete.id, shortName: "Pan Geisha", notes: "Jasmine, peach, tea-like body" },
    ],
  });

  // --- Roasts ---
  // Alice's Ethiopia roasts (light, dialing in)
  await prisma.roast.createMany({
    data: [
      {
        beanId: ethiopiaYirg.id,
        userId: alice.id,
        ambientTemp: 21.5,
        roastingLevel: 3.8,
        tastingNotes: "floral, bergamot, lemon",
        colourChangeTime: 270,
        colourChangeTemp: 155.2,
        firstCrackTime: 468,
        firstCrackTemp: 196.5,
        roastEndTime: 540,
        roastEndTemp: 202.0,
        developmentTime: 72,
        developmentPercent: 13.3,
        totalDuration: 540,
        roastDate: new Date("2026-03-01"),
        notes: "First crack at 7:48. Slightly underdeveloped — grassy notes in cup.",
        isShared: true,
        timeSeriesData: generateTimeSeries({ totalDuration: 540, endTemp: 202 }),
        roastProfileCurve: generateProfileCurve(540, 202),
        fanProfileCurve: generateFanCurve(540),
      },
      {
        beanId: ethiopiaYirg.id,
        userId: alice.id,
        ambientTemp: 22.0,
        roastingLevel: 4.0,
        tastingNotes: "bergamot, stone fruit, clean",
        colourChangeTime: 264,
        colourChangeTemp: 156.0,
        firstCrackTime: 462,
        firstCrackTemp: 197.0,
        roastEndTime: 546,
        roastEndTemp: 204.0,
        developmentTime: 84,
        developmentPercent: 15.4,
        totalDuration: 546,
        roastDate: new Date("2026-03-08"),
        notes: "Extended development 12s. Much better — bergamot coming through.",
        isShared: true,
        timeSeriesData: generateTimeSeries({ totalDuration: 546, endTemp: 204 }),
        roastProfileCurve: generateProfileCurve(546, 204),
        fanProfileCurve: generateFanCurve(546),
      },
      {
        beanId: ethiopiaYirg.id,
        userId: alice.id,
        ambientTemp: 21.8,
        roastingLevel: 4.2,
        tastingNotes: "floral, lemon zest, clean finish",
        colourChangeTime: 258,
        colourChangeTemp: 156.5,
        firstCrackTime: 456,
        firstCrackTemp: 197.5,
        roastEndTime: 546,
        roastEndTemp: 206.0,
        developmentTime: 90,
        developmentPercent: 16.5,
        totalDuration: 546,
        roastDate: new Date("2026-03-15"),
        notes: "Sweet spot. Floral, clean, lemon zest finish. Repeating this profile.",
        isShared: true,
        timeSeriesData: generateTimeSeries({ totalDuration: 546, endTemp: 206 }),
        roastProfileCurve: generateProfileCurve(546, 206),
        fanProfileCurve: generateFanCurve(546),
      },
    ],
  });

  // Alice's Colombia roasts (medium)
  await prisma.roast.createMany({
    data: [
      {
        beanId: colombiaHuila.id,
        userId: alice.id,
        ambientTemp: 22.5,
        roastingLevel: 4.5,
        colourChangeTime: 282,
        colourChangeTemp: 158.0,
        firstCrackTime: 498,
        firstCrackTemp: 199.0,
        roastEndTime: 600,
        roastEndTemp: 209.0,
        developmentTime: 96,
        developmentPercent: 16.0,
        totalDuration: 600,
        roastDate: new Date("2026-02-20"),
        notes: "City+ roast. Good caramel sweetness, maybe push dev a touch more.",
        timeSeriesData: generateTimeSeries({ totalDuration: 600, endTemp: 209 }),
        roastProfileCurve: generateProfileCurve(600, 209),
        fanProfileCurve: generateFanCurve(600),
      },
      {
        beanId: colombiaHuila.id,
        userId: alice.id,
        ambientTemp: 22.0,
        roastingLevel: 4.7,
        tastingNotes: "red apple, toffee",
        colourChangeTime: 276,
        colourChangeTemp: 157.5,
        firstCrackTime: 492,
        firstCrackTemp: 199.5,
        roastEndTime: 606,
        roastEndTemp: 211.0,
        developmentTime: 108,
        developmentPercent: 17.8,
        totalDuration: 606,
        roastDate: new Date("2026-03-05"),
        notes: "Nailed it. Red apple and toffee. Great as espresso.",
        timeSeriesData: generateTimeSeries({ totalDuration: 606, endTemp: 211 }),
        roastProfileCurve: generateProfileCurve(606, 211),
        fanProfileCurve: generateFanCurve(606),
      },
      {
        beanId: colombiaHuila.id,
        userId: alice.id,
        ambientTemp: 23.0,
        roastingLevel: 5.0,
        colourChangeTime: 270,
        colourChangeTemp: 157.0,
        firstCrackTime: 486,
        firstCrackTemp: 199.0,
        roastEndTime: 606,
        roastEndTemp: 213.0,
        developmentTime: 114,
        developmentPercent: 18.8,
        totalDuration: 606,
        roastDate: new Date("2026-03-18"),
        notes: "Pushed dev too far — lost some brightness. Back to previous profile.",
        timeSeriesData: generateTimeSeries({ totalDuration: 606, endTemp: 213 }),
        roastProfileCurve: generateProfileCurve(606, 213),
        fanProfileCurve: generateFanCurve(606),
      },
    ],
  });

  // Alice's Kenya roasts
  await prisma.roast.createMany({
    data: [
      {
        beanId: kenyaAA.id,
        userId: alice.id,
        ambientTemp: 21.0,
        roastingLevel: 3.9,
        tastingNotes: "blackcurrant, grapefruit",
        colourChangeTime: 258,
        colourChangeTemp: 154.8,
        firstCrackTime: 468,
        firstCrackTemp: 197.0,
        roastEndTime: 552,
        roastEndTemp: 203.5,
        developmentTime: 78,
        developmentPercent: 14.1,
        totalDuration: 552,
        roastDate: new Date("2026-03-10"),
        notes: "Light city roast. Intense blackcurrant but a bit sharp. Needs more dev.",
        timeSeriesData: generateTimeSeries({ totalDuration: 552, endTemp: 203.5 }),
        roastProfileCurve: generateProfileCurve(552, 203.5),
        fanProfileCurve: generateFanCurve(552),
      },
      {
        beanId: kenyaAA.id,
        userId: alice.id,
        ambientTemp: 21.5,
        roastingLevel: 4.3,
        tastingNotes: "grapefruit, blackcurrant, syrupy",
        colourChangeTime: 264,
        colourChangeTemp: 155.5,
        firstCrackTime: 474,
        firstCrackTemp: 198.0,
        roastEndTime: 570,
        roastEndTemp: 207.0,
        developmentTime: 90,
        developmentPercent: 15.8,
        totalDuration: 570,
        roastDate: new Date("2026-03-17"),
        notes: "Better balance. Grapefruit and blackcurrant, syrupy mouthfeel.",
        isShared: true,
        timeSeriesData: generateTimeSeries({ totalDuration: 570, endTemp: 207 }),
        roastProfileCurve: generateProfileCurve(570, 207),
        fanProfileCurve: generateFanCurve(570),
      },
      {
        beanId: kenyaAA.id,
        userId: alice.id,
        ambientTemp: 22.0,
        roastingLevel: 4.5,
        colourChangeTime: 270,
        colourChangeTemp: 156.0,
        firstCrackTime: 480,
        firstCrackTemp: 198.5,
        roastEndTime: 582,
        roastEndTemp: 209.0,
        developmentTime: 96,
        developmentPercent: 16.5,
        totalDuration: 582,
        roastDate: new Date("2026-03-22"),
        notes: "Full city. Rounded out nicely — great as pour over.",
        timeSeriesData: generateTimeSeries({ totalDuration: 582, endTemp: 209 }),
        roastProfileCurve: generateProfileCurve(582, 209),
        fanProfileCurve: generateFanCurve(582),
      },
    ],
  });

  // Bob's Brazil roasts (medium-dark)
  await prisma.roast.createMany({
    data: [
      {
        beanId: brazilSantos.id,
        userId: bob.id,
        ambientTemp: 23.0,
        roastingLevel: 5.5,
        tastingNotes: "chocolate, peanut butter",
        colourChangeTime: 300,
        colourChangeTemp: 160.0,
        firstCrackTime: 528,
        firstCrackTemp: 200.0,
        roastEndTime: 660,
        roastEndTemp: 214.0,
        developmentTime: 120,
        developmentPercent: 18.2,
        totalDuration: 660,
        roastDate: new Date("2026-02-15"),
        notes: "Full city+. Chocolate and peanut butter. Great for milk drinks.",
        isShared: true,
        timeSeriesData: generateTimeSeries({ totalDuration: 660, endTemp: 214 }),
        roastProfileCurve: generateProfileCurve(660, 214),
        fanProfileCurve: generateFanCurve(660),
      },
      {
        beanId: brazilSantos.id,
        userId: bob.id,
        ambientTemp: 22.5,
        roastingLevel: 6.0,
        colourChangeTime: 294,
        colourChangeTemp: 159.5,
        firstCrackTime: 522,
        firstCrackTemp: 200.5,
        roastEndTime: 666,
        roastEndTemp: 217.0,
        developmentTime: 132,
        developmentPercent: 19.8,
        totalDuration: 666,
        roastDate: new Date("2026-03-01"),
        notes: "Into second crack briefly. Bittersweet chocolate, low acidity.",
        timeSeriesData: generateTimeSeries({ totalDuration: 666, endTemp: 217 }),
        roastProfileCurve: generateProfileCurve(666, 217),
        fanProfileCurve: generateFanCurve(666),
      },
      {
        beanId: brazilSantos.id,
        userId: bob.id,
        ambientTemp: 22.0,
        roastingLevel: 5.7,
        tastingNotes: "chocolate, nutty, sweet",
        colourChangeTime: 288,
        colourChangeTemp: 159.0,
        firstCrackTime: 516,
        firstCrackTemp: 200.0,
        roastEndTime: 654,
        roastEndTemp: 215.0,
        developmentTime: 126,
        developmentPercent: 19.3,
        totalDuration: 654,
        roastDate: new Date("2026-03-14"),
        notes: "Dialed back from last time. Sweet spot for espresso base.",
        timeSeriesData: generateTimeSeries({ totalDuration: 654, endTemp: 215 }),
        roastProfileCurve: generateProfileCurve(654, 215),
        fanProfileCurve: generateFanCurve(654),
      },
    ],
  });

  // Bob's Guatemala roasts
  await prisma.roast.createMany({
    data: [
      {
        beanId: guatemalaAntigua.id,
        userId: bob.id,
        ambientTemp: 22.0,
        roastingLevel: 5.0,
        tastingNotes: "dark chocolate, cinnamon",
        colourChangeTime: 288,
        colourChangeTemp: 158.5,
        firstCrackTime: 510,
        firstCrackTemp: 199.5,
        roastEndTime: 630,
        roastEndTemp: 212.0,
        developmentTime: 108,
        developmentPercent: 17.1,
        totalDuration: 630,
        roastDate: new Date("2026-02-28"),
        notes: "City+ roast. Dark chocolate and cinnamon. Solid but could be darker.",
        timeSeriesData: generateTimeSeries({ totalDuration: 630, endTemp: 212 }),
        roastProfileCurve: generateProfileCurve(630, 212),
        fanProfileCurve: generateFanCurve(630),
      },
      {
        beanId: guatemalaAntigua.id,
        userId: bob.id,
        ambientTemp: 23.0,
        roastingLevel: 5.8,
        tastingNotes: "smoky, bittersweet",
        colourChangeTime: 294,
        colourChangeTemp: 159.0,
        firstCrackTime: 522,
        firstCrackTemp: 200.0,
        roastEndTime: 660,
        roastEndTemp: 216.0,
        developmentTime: 126,
        developmentPercent: 19.1,
        totalDuration: 660,
        roastDate: new Date("2026-03-12"),
        notes: "Full city+. Smoky, bittersweet. This is the one.",
        isShared: true,
        timeSeriesData: generateTimeSeries({ totalDuration: 660, endTemp: 216 }),
        roastProfileCurve: generateProfileCurve(660, 216),
        fanProfileCurve: generateFanCurve(660),
      },
      {
        beanId: guatemalaAntigua.id,
        userId: bob.id,
        ambientTemp: 22.5,
        roastingLevel: 6.5,
        colourChangeTime: 300,
        colourChangeTemp: 160.0,
        firstCrackTime: 528,
        firstCrackTemp: 200.5,
        roastEndTime: 678,
        roastEndTemp: 220.0,
        developmentTime: 138,
        developmentPercent: 20.4,
        totalDuration: 678,
        roastDate: new Date("2026-03-20"),
        notes: "Well into second crack — too dark, oily surface. Backing off.",
        timeSeriesData: generateTimeSeries({ totalDuration: 678, endTemp: 220 }),
        roastProfileCurve: generateProfileCurve(678, 220),
        fanProfileCurve: generateFanCurve(678),
      },
    ],
  });

  // Carol's Sumatra roasts
  await prisma.roast.createMany({
    data: [
      {
        beanId: sumatraMandheling.id,
        userId: carol.id,
        ambientTemp: 23.5,
        roastingLevel: 6.0,
        tastingNotes: "earthy, herbal, cedar",
        colourChangeTime: 312,
        colourChangeTemp: 161.0,
        firstCrackTime: 540,
        firstCrackTemp: 201.0,
        roastEndTime: 690,
        roastEndTemp: 218.0,
        developmentTime: 138,
        developmentPercent: 20.0,
        totalDuration: 690,
        roastDate: new Date("2026-02-22"),
        notes: "Dark roast for French press. Earthy, herbal, thick body.",
        timeSeriesData: generateTimeSeries({ totalDuration: 690, endTemp: 218 }),
        roastProfileCurve: generateProfileCurve(690, 218),
        fanProfileCurve: generateFanCurve(690),
      },
      {
        beanId: sumatraMandheling.id,
        userId: carol.id,
        ambientTemp: 23.0,
        roastingLevel: 5.5,
        tastingNotes: "herbal, tobacco, complex",
        colourChangeTime: 306,
        colourChangeTemp: 160.5,
        firstCrackTime: 528,
        firstCrackTemp: 200.5,
        roastEndTime: 660,
        roastEndTemp: 215.0,
        developmentTime: 120,
        developmentPercent: 18.2,
        totalDuration: 660,
        roastDate: new Date("2026-03-06"),
        notes: "Pulled back to full city. More herbal complexity, less ash.",
        isShared: true,
        timeSeriesData: generateTimeSeries({ totalDuration: 660, endTemp: 215 }),
        roastProfileCurve: generateProfileCurve(660, 215),
        fanProfileCurve: generateFanCurve(660),
      },
      {
        beanId: sumatraMandheling.id,
        userId: carol.id,
        ambientTemp: 22.5,
        roastingLevel: 5.0,
        tastingNotes: "cedar, tobacco, medium body",
        colourChangeTime: 300,
        colourChangeTemp: 159.5,
        firstCrackTime: 522,
        firstCrackTemp: 200.0,
        roastEndTime: 648,
        roastEndTemp: 212.0,
        developmentTime: 114,
        developmentPercent: 17.6,
        totalDuration: 648,
        roastDate: new Date("2026-03-16"),
        notes: "City+ attempt. Interesting — more cedar and tobacco, less earthy.",
        timeSeriesData: generateTimeSeries({ totalDuration: 648, endTemp: 212 }),
        roastProfileCurve: generateProfileCurve(648, 212),
        fanProfileCurve: generateFanCurve(648),
      },
    ],
  });

  // Carol's Costa Rica roasts
  await prisma.roast.createMany({
    data: [
      {
        beanId: costaRicaTarrazu.id,
        userId: carol.id,
        ambientTemp: 22.0,
        roastingLevel: 4.2,
        tastingNotes: "honey, peach, bright",
        colourChangeTime: 270,
        colourChangeTemp: 155.0,
        firstCrackTime: 474,
        firstCrackTemp: 198.0,
        roastEndTime: 570,
        roastEndTemp: 206.0,
        developmentTime: 90,
        developmentPercent: 15.8,
        totalDuration: 570,
        roastDate: new Date("2026-03-02"),
        notes: "Medium-light. Honey sweetness and peach. Beautiful as V60.",
        timeSeriesData: generateTimeSeries({ totalDuration: 570, endTemp: 206 }),
        roastProfileCurve: generateProfileCurve(570, 206),
        fanProfileCurve: generateFanCurve(570),
      },
      {
        beanId: costaRicaTarrazu.id,
        userId: carol.id,
        ambientTemp: 22.5,
        roastingLevel: 4.4,
        tastingNotes: "stone fruit, honey, sweet",
        colourChangeTime: 276,
        colourChangeTemp: 155.5,
        firstCrackTime: 480,
        firstCrackTemp: 198.5,
        roastEndTime: 582,
        roastEndTemp: 208.0,
        developmentTime: 96,
        developmentPercent: 16.5,
        totalDuration: 582,
        roastDate: new Date("2026-03-11"),
        notes: "Slightly more development. Stone fruit more prominent, still sweet.",
        isShared: true,
        timeSeriesData: generateTimeSeries({ totalDuration: 582, endTemp: 208 }),
        roastProfileCurve: generateProfileCurve(582, 208),
        fanProfileCurve: generateFanCurve(582),
      },
      {
        beanId: costaRicaTarrazu.id,
        userId: carol.id,
        ambientTemp: 21.5,
        roastingLevel: 3.9,
        tastingNotes: "floral, light body",
        colourChangeTime: 264,
        colourChangeTemp: 154.5,
        firstCrackTime: 468,
        firstCrackTemp: 197.5,
        roastEndTime: 558,
        roastEndTemp: 204.5,
        developmentTime: 84,
        developmentPercent: 15.1,
        totalDuration: 558,
        roastDate: new Date("2026-03-19"),
        notes: "Lighter charge temp experiment. More floral, less body. Prefer the 3/11 roast.",
        timeSeriesData: generateTimeSeries({ totalDuration: 558, endTemp: 204.5 }),
        roastProfileCurve: generateProfileCurve(558, 204.5),
        fanProfileCurve: generateFanCurve(558),
      },
    ],
  });

  // Carol's Panama Geisha roasts
  await prisma.roast.createMany({
    data: [
      {
        beanId: panamaBoquete.id,
        userId: carol.id,
        ambientTemp: 21.0,
        roastingLevel: 3.5,
        tastingNotes: "jasmine, white peach",
        colourChangeTime: 252,
        colourChangeTemp: 153.0,
        firstCrackTime: 450,
        firstCrackTemp: 195.5,
        roastEndTime: 528,
        roastEndTemp: 200.5,
        developmentTime: 72,
        developmentPercent: 13.6,
        totalDuration: 528,
        roastDate: new Date("2026-03-08"),
        notes: "Very light Nordic-style. Jasmine and white peach. Delicate.",
        timeSeriesData: generateTimeSeries({ totalDuration: 528, endTemp: 200.5 }),
        roastProfileCurve: generateProfileCurve(528, 200.5),
        fanProfileCurve: generateFanCurve(528),
      },
      {
        beanId: panamaBoquete.id,
        userId: carol.id,
        ambientTemp: 21.5,
        roastingLevel: 3.7,
        tastingNotes: "jasmine, tea-like, peach",
        colourChangeTime: 258,
        colourChangeTemp: 153.5,
        firstCrackTime: 456,
        firstCrackTemp: 196.0,
        roastEndTime: 540,
        roastEndTemp: 202.0,
        developmentTime: 78,
        developmentPercent: 14.4,
        totalDuration: 540,
        roastDate: new Date("2026-03-15"),
        notes: "Tiny bit more dev. Tea-like body, jasmine still dominant. ★",
        isShared: true,
        timeSeriesData: generateTimeSeries({ totalDuration: 540, endTemp: 202 }),
        roastProfileCurve: generateProfileCurve(540, 202),
        fanProfileCurve: generateFanCurve(540),
      },
      {
        beanId: panamaBoquete.id,
        userId: carol.id,
        ambientTemp: 22.0,
        roastingLevel: 4.0,
        tastingNotes: "stone fruit, light jasmine",
        colourChangeTime: 264,
        colourChangeTemp: 154.0,
        firstCrackTime: 462,
        firstCrackTemp: 196.5,
        roastEndTime: 552,
        roastEndTemp: 204.0,
        developmentTime: 84,
        developmentPercent: 15.2,
        totalDuration: 552,
        roastDate: new Date("2026-03-21"),
        notes: "Pushed to city. Lost some jasmine but gained stone fruit. Trade-off.",
        timeSeriesData: generateTimeSeries({ totalDuration: 552, endTemp: 204 }),
        roastProfileCurve: generateProfileCurve(552, 204),
        fanProfileCurve: generateFanCurve(552),
      },
    ],
  });

  console.log("✅ Seed complete: 60 flavor descriptors, 3 users, 8 beans, 11 user-bean links, 24 roasts");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
