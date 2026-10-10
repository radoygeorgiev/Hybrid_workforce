export const REGIONS = [
  { id: "singapore", name: "Singapore", currency: "USD", wageUsdHour: 24, burden: 1.42, availabilityRisk: 78 },
  { id: "australia", name: "Australia", currency: "USD", wageUsdHour: 31, burden: 1.36, availabilityRisk: 74 },
  { id: "europe", name: "Europe high-cost cluster", currency: "USD", wageUsdHour: 34, burden: 1.38, availabilityRisk: 70 },
  { id: "usa", name: "United States", currency: "USD", wageUsdHour: 26, burden: 1.34, availabilityRisk: 76 },
  { id: "canada", name: "Canada", currency: "USD", wageUsdHour: 25, burden: 1.35, availabilityRisk: 72 },
  { id: "other-high-cost", name: "Other high-cost global sites", currency: "USD", wageUsdHour: 22, burden: 1.3, availabilityRisk: 66 }
];

export const TECHNOLOGY_LABELS = {
  humanoid: "Humanoid",
  amr: "AMR / mobile robot",
  "robotic-forklift": "Robotic forklift",
  "robotic-arm": "Robotic arm / cell",
  vision: "Vision / scan / drone",
  "warehouse-specialist": "Warehouse specialist"
};

const BASE_PARAMS = {
  volumePerShift: 4200,
  shiftHours: 10,
  operatingShiftsDay: 2,
  avgPayloadKg: 8,
  travelMeters: 45,
  complexity: 55,
  variability: 50,
  ergonomicsRisk: 58,
  targetServiceLevel: 96,
  humanUtilization: 80,
  robotUtilization: 74,
  autonomyTarget: 70,
  cloudCostMonthly: 12000,
  integrationCapex: 450000,
  peakFactor: 1.25,
  exceptionRate: 7,
  layoutReadiness: 68,
  wmsIntegration: 64,
  safetyCriticality: 72,
  skuVelocitySkew: 55,
  dockDoorUtilization: 62,
  productFragility: 38,
  palletHeightCm: 150,
  processStandardization: 60
};

const REQ = { lift: 50, mobility: 65, dexterity: 60, vision: 72, endurance: 70, speed: 65, autonomy: 70, safety: 84, api: 72, scalability: 70 };

function params(overrides = {}) {
  return { ...BASE_PARAMS, ...overrides };
}

function req(overrides = {}) {
  return { ...REQ, ...overrides };
}

function step(name, detail) {
  return { name, detail };
}

export const PROCESSES = [
  {
    id: "inbound-receiving",
    name: "Inbound receiving and ASN validation",
    category: "Inbound",
    summary: "Robot-assisted receiving where cartons or pallets are scanned, counted, checked against ASN data, and staged for putaway or cross-dock.",
    pilotFit: "Medium-high",
    recommendedTech: ["vision", "amr", "humanoid", "robotic-forklift"],
    recommendedMix: { vision: 30, amr: 30, humanoid: 20, "robotic-forklift": 20 },
    defaultParams: params({ volumePerShift: 3500, avgPayloadKg: 9, travelMeters: 42, complexity: 50, variability: 54, ergonomicsRisk: 58, cloudCostMonthly: 10000, integrationCapex: 380000, exceptionRate: 6, wmsIntegration: 70, dockDoorUtilization: 72 }),
    requirements: req({ lift: 56, mobility: 66, dexterity: 68, vision: 84, endurance: 66, speed: 62, autonomy: 67, safety: 85, api: 76, scalability: 72 }),
    steps: [
      step("Receive shipment", "Dock team or robot cell receives cartons, totes, or palletized freight."),
      step("Scan ASN", "Barcode, OCR, or vision validates item identity against expected shipment."),
      step("Count and inspect", "Shortage, overage, damage, and label exceptions are recorded."),
      step("Stage for putaway", "Material is placed on cart, AMR, pallet jack, or buffer lane."),
      step("Update WMS", "Inventory status, location, timestamp, and exception state are synchronized.")
    ],
    manual: { baseCycleSec: 62, errorRate: 1.5, injuryIndex: 60, throughputPerHour: 58 },
    robot: { baseCycleSec: 68, errorRate: 0.65, improvementCeiling: 16, assistLaborRatio: 0.24 },
    layoutPath: [{ x: 10, y: 14 }, { x: 18, y: 20 }, { x: 34, y: 26 }, { x: 52, y: 26 }, { x: 56, y: 50 }]
  },
  {
    id: "putaway",
    name: "Putaway and location confirmation",
    category: "Inbound",
    summary: "Movement from receiving buffers to reserve or forward pick locations, including location verification, scan confirmation, and exception handling.",
    pilotFit: "High for AMR/forklift; medium for humanoid",
    recommendedTech: ["amr", "robotic-forklift", "vision", "humanoid"],
    recommendedMix: { amr: 38, "robotic-forklift": 32, vision: 18, humanoid: 12 },
    defaultParams: params({ volumePerShift: 2800, avgPayloadKg: 14, travelMeters: 85, complexity: 46, variability: 42, ergonomicsRisk: 64, robotUtilization: 78, integrationCapex: 520000, skuVelocitySkew: 62, palletHeightCm: 165 }),
    requirements: req({ lift: 70, mobility: 82, dexterity: 48, vision: 78, endurance: 82, speed: 76, autonomy: 76, safety: 88, api: 78, scalability: 78 }),
    steps: [
      step("Receive putaway task", "WMS assigns SKU, quantity, equipment class, and target storage location."),
      step("Collect load", "Robot or worker collects tote, case, or pallet from receiving buffer."),
      step("Navigate to location", "AMR/forklift follows approved traffic lane and yields to people."),
      step("Confirm location", "Barcode, RFID, or vision validates slot and inventory status."),
      step("Close task", "WMS updates stock location and readiness for replenishment or picking.")
    ],
    manual: { baseCycleSec: 95, errorRate: 1.2, injuryIndex: 70, throughputPerHour: 38 },
    robot: { baseCycleSec: 82, errorRate: 0.6, improvementCeiling: 28, assistLaborRatio: 0.18 },
    layoutPath: [{ x: 12, y: 18 }, { x: 28, y: 24 }, { x: 46, y: 18 }, { x: 64, y: 20 }, { x: 68, y: 48 }]
  },
  {
    id: "case-picking",
    name: "Case picking and tote replenishment",
    category: "Outbound",
    summary: "Hybrid picking where robots navigate human-designed aisles, identify cases, pick medium-weight cartons, scan labels, and hand off to tote, AMR, cart, or pack station.",
    pilotFit: "High",
    recommendedTech: ["amr", "humanoid", "vision", "robotic-arm"],
    recommendedMix: { amr: 35, humanoid: 25, vision: 22, "robotic-arm": 18 },
    defaultParams: params({ volumePerShift: 4200, avgPayloadKg: 8, travelMeters: 55, complexity: 58, variability: 46, ergonomicsRisk: 62, targetServiceLevel: 96, humanUtilization: 82, robotUtilization: 74, autonomyTarget: 70, integrationCapex: 450000, exceptionRate: 5, skuVelocitySkew: 68 }),
    requirements: req({ lift: 52, mobility: 72, dexterity: 76, vision: 82, endurance: 68, speed: 66, autonomy: 70, safety: 84, api: 70, scalability: 74 }),
    steps: [
      step("Receive pick task", "WMS/WES releases pick task, priority, and carton handling instructions."),
      step("Navigate aisle", "Robot or human moves from work queue to pick face through safe lanes."),
      step("Identify SKU", "Vision and barcode checks confirm location, SKU, and quantity."),
      step("Pick carton", "Item is lifted within payload range and placed on tote, AMR, or cart."),
      step("Scan and confirm", "Barcode or visual confirmation closes the transaction."),
      step("Deliver to pack", "Material moves to pack station or downstream handoff point.")
    ],
    manual: { baseCycleSec: 72, errorRate: 1.3, injuryIndex: 68, throughputPerHour: 50 },
    robot: { baseCycleSec: 78, errorRate: 0.8, improvementCeiling: 20, assistLaborRatio: 0.22 },
    layoutPath: [{ x: 15, y: 15 }, { x: 42, y: 20 }, { x: 63, y: 30 }, { x: 83, y: 24 }, { x: 83, y: 48 }, { x: 64, y: 63 }]
  },
  {
    id: "piece-picking",
    name: "Piece picking / e-commerce order picking",
    category: "Outbound",
    summary: "High-SKU piece picking with small items, high variability, scanning, tote handling, and frequent exception decisions.",
    pilotFit: "Medium; use robotic arms or goods-to-person first where possible",
    recommendedTech: ["robotic-arm", "vision", "amr", "humanoid"],
    recommendedMix: { "robotic-arm": 34, vision: 26, amr: 24, humanoid: 16 },
    defaultParams: params({ volumePerShift: 9500, avgPayloadKg: 1.2, travelMeters: 62, complexity: 74, variability: 82, ergonomicsRisk: 42, targetServiceLevel: 98, robotUtilization: 70, autonomyTarget: 78, integrationCapex: 680000, exceptionRate: 12, productFragility: 50, skuVelocitySkew: 78 }),
    requirements: req({ lift: 22, mobility: 70, dexterity: 92, vision: 94, endurance: 70, speed: 76, autonomy: 82, safety: 84, api: 84, scalability: 76 }),
    steps: [
      step("Release batch", "Order lines are grouped by zone, promise time, and item class."),
      step("Locate item", "Vision or barcode validates bin, SKU, and quantity."),
      step("Pick piece", "Dexterous robot or human handles small item and places into tote."),
      step("Exception decision", "Fragile, missing, or mixed-bin exceptions are routed to operator."),
      step("Induct to pack", "Completed tote flows to packing or sortation.")
    ],
    manual: { baseCycleSec: 26, errorRate: 2.4, injuryIndex: 40, throughputPerHour: 138 },
    robot: { baseCycleSec: 31, errorRate: 0.9, improvementCeiling: 25, assistLaborRatio: 0.32 },
    layoutPath: [{ x: 20, y: 18 }, { x: 42, y: 16 }, { x: 64, y: 18 }, { x: 82, y: 24 }, { x: 86, y: 50 }, { x: 72, y: 64 }]
  },
  {
    id: "g2p-replenishment",
    name: "Goods-to-person replenishment and tote movement",
    category: "Internal transport",
    summary: "AMR-led movement of totes, carts, or racks between storage, pick, pack, and replenishment zones with scan validation and exception support.",
    pilotFit: "High",
    recommendedTech: ["amr", "vision", "humanoid"],
    recommendedMix: { amr: 58, vision: 25, humanoid: 17 },
    defaultParams: params({ volumePerShift: 7600, avgPayloadKg: 18, travelMeters: 75, complexity: 44, variability: 38, ergonomicsRisk: 66, targetServiceLevel: 97, robotUtilization: 82, integrationCapex: 480000, processStandardization: 78 }),
    requirements: req({ lift: 62, mobility: 88, dexterity: 34, vision: 74, endurance: 88, speed: 88, autonomy: 84, safety: 88, api: 84, scalability: 88 }),
    steps: [
      step("Call replenishment", "WMS/WES triggers tote, cart, or rack move based on demand signal."),
      step("Assign AMR", "Fleet manager selects nearest available robot and safe route."),
      step("Load or dock", "AMR docks with cart, tote rack, or load transfer point."),
      step("Transport", "AMR moves through warehouse lanes with traffic management."),
      step("Handoff", "Station receives item and closes task in WMS/WES.")
    ],
    manual: { baseCycleSec: 86, errorRate: 0.9, injuryIndex: 65, throughputPerHour: 42 },
    robot: { baseCycleSec: 58, errorRate: 0.4, improvementCeiling: 42, assistLaborRatio: 0.1 },
    layoutPath: [{ x: 14, y: 18 }, { x: 30, y: 18 }, { x: 48, y: 34 }, { x: 68, y: 44 }, { x: 86, y: 48 }]
  },
  {
    id: "packing-qc",
    name: "Packing quality check and documentation",
    category: "Outbound",
    summary: "Vision-enabled packing validation for item, label, weight, compliance document, carton selection, photo proof, and exception routing.",
    pilotFit: "Medium-high",
    recommendedTech: ["vision", "robotic-arm", "humanoid"],
    recommendedMix: { vision: 45, "robotic-arm": 35, humanoid: 20 },
    defaultParams: params({ volumePerShift: 5200, avgPayloadKg: 3, travelMeters: 12, complexity: 56, variability: 48, ergonomicsRisk: 36, targetServiceLevel: 97, humanUtilization: 84, robotUtilization: 72, autonomyTarget: 74, cloudCostMonthly: 9500, integrationCapex: 350000, productFragility: 55, exceptionRate: 8, wmsIntegration: 82 }),
    requirements: req({ lift: 26, mobility: 42, dexterity: 76, vision: 88, endurance: 68, speed: 72, autonomy: 74, safety: 84, api: 82, scalability: 78 }),
    steps: [
      step("Receive pack task", "Pack station receives order, box rules, label rules, and compliance flags."),
      step("Verify carton", "Vision/weight checks item, carton, label, and dunnage compliance."),
      step("Assist placement", "Robot arm or humanoid supports light placement and label handling where feasible."),
      step("Resolve exception", "Mismatch, damage, or paperwork issue routes to operator."),
      step("Ship confirm", "Shipment is closed and auditable image/KPI trace is saved.")
    ],
    manual: { baseCycleSec: 25, errorRate: 1.7, injuryIndex: 33, throughputPerHour: 144 },
    robot: { baseCycleSec: 23, errorRate: 0.35, improvementCeiling: 32, assistLaborRatio: 0.18 },
    layoutPath: [{ x: 78, y: 48 }, { x: 86, y: 48 }, { x: 88, y: 56 }, { x: 66, y: 64 }, { x: 50, y: 62 }]
  },
  {
    id: "cross-dock-sort",
    name: "Cross-dock sort and transfer",
    category: "Cross dock",
    summary: "High-speed inbound-to-outbound transfer with scanning, routing, cart movement, AMR transfer, and exception handling.",
    pilotFit: "Medium-high",
    recommendedTech: ["amr", "vision", "humanoid", "robotic-forklift"],
    recommendedMix: { amr: 40, vision: 28, humanoid: 17, "robotic-forklift": 15 },
    defaultParams: params({ volumePerShift: 6400, avgPayloadKg: 7, travelMeters: 36, complexity: 52, variability: 60, ergonomicsRisk: 60, targetServiceLevel: 98, humanUtilization: 83, robotUtilization: 72, autonomyTarget: 72, cloudCostMonthly: 12000, integrationCapex: 520000, peakFactor: 1.45, dockDoorUtilization: 84, exceptionRate: 6 }),
    requirements: req({ lift: 48, mobility: 76, dexterity: 62, vision: 84, endurance: 76, speed: 78, autonomy: 78, safety: 88, api: 82, scalability: 80 }),
    steps: [
      step("Induct freight", "Item arrives at sort face or receiving lane."),
      step("Scan and route", "Destination lane is calculated using WMS/WES data."),
      step("Move item", "Robot/human moves case, tote, or pallet to correct lane."),
      step("Handoff", "Outbound staging confirms transfer and load sequence."),
      step("Close exception", "Unscannable, damaged, or wrong-destination freight is escalated.")
    ],
    manual: { baseCycleSec: 34, errorRate: 1.1, injuryIndex: 62, throughputPerHour: 106 },
    robot: { baseCycleSec: 34, errorRate: 0.55, improvementCeiling: 22, assistLaborRatio: 0.2 },
    layoutPath: [{ x: 12, y: 18 }, { x: 32, y: 32 }, { x: 52, y: 48 }, { x: 70, y: 60 }, { x: 86, y: 62 }]
  },
  {
    id: "container-unloading",
    name: "Container and trailer unloading",
    category: "Inbound",
    summary: "Dense, variable, physically demanding unloading. The recommended core technology is usually specialist case-handling robotics with humanoids for exceptions only.",
    pilotFit: "Specialist robot first",
    recommendedTech: ["warehouse-specialist", "robotic-arm", "vision", "humanoid"],
    recommendedMix: { "warehouse-specialist": 45, "robotic-arm": 25, vision: 20, humanoid: 10 },
    defaultParams: params({ volumePerShift: 7800, avgPayloadKg: 13, travelMeters: 24, complexity: 64, variability: 76, ergonomicsRisk: 88, targetServiceLevel: 94, humanUtilization: 76, robotUtilization: 78, autonomyTarget: 76, cloudCostMonthly: 15000, integrationCapex: 700000, exceptionRate: 10, safetyCriticality: 90, dockDoorUtilization: 88 }),
    requirements: req({ lift: 76, mobility: 58, dexterity: 62, vision: 86, endurance: 78, speed: 82, autonomy: 80, safety: 88, api: 72, scalability: 70 }),
    steps: [
      step("Map case wall", "Vision system maps cartons, voids, crush risk, and safe grasp sequence."),
      step("Pick case", "Specialist robot or worker removes a case from the wall."),
      step("Place to conveyor", "Case is placed on downstream conveyor, AMR, or receiving buffer."),
      step("Manage exceptions", "Damaged, unstable, heavy, or irregular items are routed to human exception handling."),
      step("Clear trailer", "System records trailer completion, door time, and dock productivity.")
    ],
    manual: { baseCycleSec: 13, errorRate: 0.9, injuryIndex: 94, throughputPerHour: 270 },
    robot: { baseCycleSec: 8, errorRate: 0.55, improvementCeiling: 38, assistLaborRatio: 0.14 },
    layoutPath: [{ x: 6, y: 10 }, { x: 13, y: 16 }, { x: 22, y: 18 }, { x: 34, y: 20 }, { x: 48, y: 23 }]
  },
  {
    id: "truck-loading",
    name: "Truck loading and route staging",
    category: "Outbound",
    summary: "Outbound staging, sequence verification, pallet movement, and trailer loading support for route, dock, customer, and carrier requirements.",
    pilotFit: "High for robotic forklift/AMR; humanoid exception support",
    recommendedTech: ["robotic-forklift", "amr", "vision", "humanoid"],
    recommendedMix: { "robotic-forklift": 45, amr: 28, vision: 17, humanoid: 10 },
    defaultParams: params({ volumePerShift: 3200, avgPayloadKg: 20, travelMeters: 70, complexity: 52, variability: 42, ergonomicsRisk: 82, targetServiceLevel: 97, robotUtilization: 78, integrationCapex: 620000, dockDoorUtilization: 86, palletHeightCm: 170, safetyCriticality: 88 }),
    requirements: req({ lift: 84, mobility: 82, dexterity: 42, vision: 80, endurance: 84, speed: 80, autonomy: 82, safety: 92, api: 78, scalability: 78 }),
    steps: [
      step("Create load plan", "Route sequence and trailer utilization plan are released."),
      step("Stage freight", "Pallets, carts, or roll cages move to door buffer in sequence."),
      step("Verify load", "Vision/barcode confirms route, customer, temperature or hazmat flags."),
      step("Load trailer", "Forklift robot or operator loads according to safe pattern."),
      step("Close door", "Carrier handoff, manifest, and departure timestamp are confirmed.")
    ],
    manual: { baseCycleSec: 75, errorRate: 1.0, injuryIndex: 86, throughputPerHour: 48 },
    robot: { baseCycleSec: 60, errorRate: 0.45, improvementCeiling: 35, assistLaborRatio: 0.16 },
    layoutPath: [{ x: 58, y: 48 }, { x: 66, y: 58 }, { x: 78, y: 64 }, { x: 88, y: 70 }, { x: 96, y: 69 }]
  },
  {
    id: "palletizing",
    name: "Palletizing and depalletizing support",
    category: "Outbound",
    summary: "High-repetition stacking/destacking. Fixed or mobile robotic cells generally outperform humanoids where the environment can be engineered.",
    pilotFit: "Specialist robot first",
    recommendedTech: ["robotic-arm", "warehouse-specialist", "vision", "humanoid"],
    recommendedMix: { "robotic-arm": 48, "warehouse-specialist": 22, vision: 20, humanoid: 10 },
    defaultParams: params({ volumePerShift: 5000, avgPayloadKg: 11, travelMeters: 10, complexity: 48, variability: 58, ergonomicsRisk: 82, targetServiceLevel: 96, humanUtilization: 78, robotUtilization: 80, autonomyTarget: 74, cloudCostMonthly: 10000, integrationCapex: 620000, palletHeightCm: 175, processStandardization: 72 }),
    requirements: req({ lift: 72, mobility: 40, dexterity: 62, vision: 78, endurance: 80, speed: 78, autonomy: 76, safety: 90, api: 72, scalability: 78 }),
    steps: [
      step("Read stack pattern", "Stacking or destacking plan loads from WMS/WES."),
      step("Identify case", "Vision validates carton size, weight class, and orientation."),
      step("Pick and place", "Robot cell or worker places case into stable layer pattern."),
      step("Wrap or handoff", "Pallet moves to wrapper, staging, or outbound lane."),
      step("Confirm pallet", "Pallet ID, height, weight, and destination are confirmed.")
    ],
    manual: { baseCycleSec: 12, errorRate: 0.8, injuryIndex: 88, throughputPerHour: 300 },
    robot: { baseCycleSec: 9, errorRate: 0.35, improvementCeiling: 34, assistLaborRatio: 0.12 },
    layoutPath: [{ x: 70, y: 54 }, { x: 80, y: 50 }, { x: 88, y: 58 }, { x: 68, y: 64 }, { x: 52, y: 62 }]
  },
  {
    id: "pallet-movement",
    name: "Pallet movement and autonomous forklift transport",
    category: "Internal transport",
    summary: "Robotic forklifts and AMRs move pallets between receiving, storage, production buffers, staging, and outbound docks with traffic safety controls.",
    pilotFit: "High",
    recommendedTech: ["robotic-forklift", "vision", "amr"],
    recommendedMix: { "robotic-forklift": 62, vision: 22, amr: 16 },
    defaultParams: params({ volumePerShift: 2600, avgPayloadKg: 24, travelMeters: 95, complexity: 40, variability: 32, ergonomicsRisk: 86, targetServiceLevel: 97, robotUtilization: 82, integrationCapex: 680000, layoutReadiness: 74, safetyCriticality: 92, palletHeightCm: 180 }),
    requirements: req({ lift: 92, mobility: 88, dexterity: 30, vision: 76, endurance: 88, speed: 84, autonomy: 84, safety: 94, api: 80, scalability: 80 }),
    steps: [
      step("Release move task", "WMS/WES assigns pallet ID, source, destination, priority, and equipment class."),
      step("Approach pallet", "Forklift robot validates pallet pose and path."),
      step("Lift and transport", "Pallet moves through approved traffic lanes."),
      step("Drop and confirm", "Destination slot or lane is confirmed by barcode/vision."),
      step("Report telemetry", "Battery, utilization, safety events, and task completion are logged.")
    ],
    manual: { baseCycleSec: 110, errorRate: 0.8, injuryIndex: 90, throughputPerHour: 33 },
    robot: { baseCycleSec: 82, errorRate: 0.35, improvementCeiling: 40, assistLaborRatio: 0.1 },
    layoutPath: [{ x: 8, y: 18 }, { x: 24, y: 28 }, { x: 42, y: 42 }, { x: 66, y: 56 }, { x: 88, y: 66 }]
  },
  {
    id: "inventory-count",
    name: "Cycle count and inventory inspection",
    category: "Inventory",
    summary: "Autonomous scan, visual count, shelf read, or drone-based audit that flags discrepancies and creates an auditable inventory trail.",
    pilotFit: "High",
    recommendedTech: ["vision", "amr", "humanoid"],
    recommendedMix: { vision: 50, amr: 38, humanoid: 12 },
    defaultParams: params({ volumePerShift: 9000, avgPayloadKg: 2, travelMeters: 80, complexity: 42, variability: 36, ergonomicsRisk: 45, targetServiceLevel: 98, humanUtilization: 78, robotUtilization: 82, autonomyTarget: 78, cloudCostMonthly: 9000, integrationCapex: 280000, exceptionRate: 4, wmsIntegration: 86, processStandardization: 80 }),
    requirements: req({ lift: 18, mobility: 76, dexterity: 42, vision: 92, endurance: 78, speed: 70, autonomy: 82, safety: 86, api: 86, scalability: 82 }),
    steps: [
      step("Load count plan", "WMS releases count zones, priority SKUs, and audit rules."),
      step("Navigate zone", "Robot moves aisle by aisle following safe paths."),
      step("Scan labels", "Vision, barcode, RFID, or drone imagery confirms SKU and location."),
      step("Flag exception", "Mismatch, empty slot, or damaged label is logged."),
      step("Publish report", "Inventory accuracy dashboard updates with photo and transaction trace.")
    ],
    manual: { baseCycleSec: 18, errorRate: 2.2, injuryIndex: 38, throughputPerHour: 200 },
    robot: { baseCycleSec: 13, errorRate: 0.45, improvementCeiling: 48, assistLaborRatio: 0.12 },
    layoutPath: [{ x: 16, y: 14 }, { x: 34, y: 12 }, { x: 66, y: 14 }, { x: 66, y: 48 }, { x: 34, y: 50 }, { x: 20, y: 62 }]
  },
  {
    id: "returns-processing",
    name: "Returns intake and exception handling",
    category: "Reverse logistics",
    summary: "Variable returns flow including scanning, visual inspection, grading, disposition decision, light manipulation, and staging.",
    pilotFit: "Medium",
    recommendedTech: ["vision", "humanoid", "robotic-arm", "amr"],
    recommendedMix: { vision: 38, humanoid: 26, "robotic-arm": 22, amr: 14 },
    defaultParams: params({ volumePerShift: 2600, shiftHours: 8, avgPayloadKg: 4, travelMeters: 18, complexity: 76, variability: 84, ergonomicsRisk: 42, targetServiceLevel: 94, humanUtilization: 76, robotUtilization: 64, autonomyTarget: 65, cloudCostMonthly: 11000, integrationCapex: 420000, exceptionRate: 18, productFragility: 68 }),
    requirements: req({ lift: 34, mobility: 52, dexterity: 88, vision: 92, endurance: 58, speed: 48, autonomy: 66, safety: 82, api: 80, scalability: 62 }),
    steps: [
      step("Receive return", "Returned item is inducted with customer and order context."),
      step("Identify item", "Vision and barcode validate item, order, serial, and packaging."),
      step("Inspect condition", "Robot supports photo evidence, defect recognition, and grading."),
      step("Sort disposition", "Return is routed to restock, repair, recycle, quarantine, or vendor claim."),
      step("Close transaction", "WMS/OMS updates inventory, refund state, and customer status.")
    ],
    manual: { baseCycleSec: 58, errorRate: 2.8, injuryIndex: 42, throughputPerHour: 62 },
    robot: { baseCycleSec: 66, errorRate: 1.2, improvementCeiling: 16, assistLaborRatio: 0.36 },
    layoutPath: [{ x: 54, y: 64 }, { x: 76, y: 52 }, { x: 85, y: 45 }, { x: 78, y: 28 }, { x: 54, y: 24 }]
  },
  {
    id: "kitting-vas",
    name: "Kitting and value-added services",
    category: "VAS",
    summary: "Assembly-like value-added services such as kitting, relabeling, bundle creation, light assembly, documentation, and quality verification.",
    pilotFit: "Medium; high when work instructions are standardized",
    recommendedTech: ["humanoid", "robotic-arm", "vision", "amr"],
    recommendedMix: { humanoid: 30, "robotic-arm": 30, vision: 25, amr: 15 },
    defaultParams: params({ volumePerShift: 1800, avgPayloadKg: 3, travelMeters: 20, complexity: 80, variability: 62, ergonomicsRisk: 44, targetServiceLevel: 97, robotUtilization: 64, integrationCapex: 540000, exceptionRate: 14, productFragility: 72, processStandardization: 54 }),
    requirements: req({ lift: 28, mobility: 45, dexterity: 92, vision: 88, endurance: 62, speed: 54, autonomy: 70, safety: 84, api: 82, scalability: 66 }),
    steps: [
      step("Load work instruction", "Digital SOP defines kit components, order, label, and QA rules."),
      step("Pick components", "Robot or human selects components from bins or presented totes."),
      step("Assemble kit", "Components are placed, labeled, bundled, or lightly assembled."),
      step("Verify quality", "Vision verifies content, label, count, and photo proof."),
      step("Release to pack", "Completed kit enters finished goods or outbound flow.")
    ],
    manual: { baseCycleSec: 92, errorRate: 2.3, injuryIndex: 36, throughputPerHour: 39 },
    robot: { baseCycleSec: 105, errorRate: 0.9, improvementCeiling: 12, assistLaborRatio: 0.42 },
    layoutPath: [{ x: 76, y: 44 }, { x: 82, y: 42 }, { x: 84, y: 54 }, { x: 74, y: 62 }, { x: 54, y: 62 }]
  },
  {
    id: "sorter-induction",
    name: "Sorter induction and parcel singulation",
    category: "Sortation",
    summary: "High-speed parcel or carton induction, singulation, scan validation, and sort line feed with robotic arm and vision support.",
    pilotFit: "Specialist robot first",
    recommendedTech: ["robotic-arm", "vision", "warehouse-specialist", "amr"],
    recommendedMix: { "robotic-arm": 40, vision: 30, "warehouse-specialist": 20, amr: 10 },
    defaultParams: params({ volumePerShift: 11500, avgPayloadKg: 4, travelMeters: 8, complexity: 54, variability: 68, ergonomicsRisk: 66, targetServiceLevel: 98, robotUtilization: 84, integrationCapex: 760000, peakFactor: 1.55, exceptionRate: 8, wmsIntegration: 84 }),
    requirements: req({ lift: 42, mobility: 30, dexterity: 72, vision: 92, endurance: 84, speed: 94, autonomy: 84, safety: 88, api: 86, scalability: 84 }),
    steps: [
      step("Feed parcels", "Items arrive from receiving, chute, or bulk container."),
      step("Singulate", "Vision separates items and determines grasp/induction sequence."),
      step("Scan", "Barcode/OCR reads parcel identity and route."),
      step("Induct", "Robot arm or operator places item onto sorter or conveyor."),
      step("Handle reject", "Unreadable, oversized, or damaged parcels go to exception lane.")
    ],
    manual: { baseCycleSec: 6, errorRate: 1.0, injuryIndex: 68, throughputPerHour: 600 },
    robot: { baseCycleSec: 4.7, errorRate: 0.35, improvementCeiling: 38, assistLaborRatio: 0.08 },
    layoutPath: [{ x: 22, y: 56 }, { x: 38, y: 58 }, { x: 56, y: 60 }, { x: 74, y: 62 }, { x: 92, y: 62 }]
  },
  {
    id: "yard-dock-inspection",
    name: "Yard, dock-door and safety inspection",
    category: "Inspection",
    summary: "Autonomous inspection of dock doors, staging lanes, yard positions, trailer seals, safety compliance, congestion, and inventory visibility.",
    pilotFit: "High",
    recommendedTech: ["vision", "amr", "humanoid"],
    recommendedMix: { vision: 60, amr: 28, humanoid: 12 },
    defaultParams: params({ volumePerShift: 4500, avgPayloadKg: 1, travelMeters: 110, complexity: 38, variability: 44, ergonomicsRisk: 34, targetServiceLevel: 98, robotUtilization: 86, integrationCapex: 260000, dockDoorUtilization: 90, safetyCriticality: 86, wmsIntegration: 78 }),
    requirements: req({ lift: 8, mobility: 88, dexterity: 22, vision: 94, endurance: 90, speed: 78, autonomy: 86, safety: 88, api: 82, scalability: 86 }),
    steps: [
      step("Load inspection route", "System creates route by dock, yard bay, or safety zone."),
      step("Navigate route", "Robot, AMR, or drone inspects locations without disrupting operations."),
      step("Capture evidence", "Image, barcode, seal, trailer, and lane state are recorded."),
      step("Detect exception", "Congestion, open door, wrong trailer, missing pallet, or unsafe condition is flagged."),
      step("Publish dashboard", "Supervisor receives exception heatmap and audit log.")
    ],
    manual: { baseCycleSec: 44, errorRate: 1.8, injuryIndex: 34, throughputPerHour: 82 },
    robot: { baseCycleSec: 30, errorRate: 0.35, improvementCeiling: 45, assistLaborRatio: 0.1 },
    layoutPath: [{ x: 8, y: 8 }, { x: 8, y: 24 }, { x: 22, y: 42 }, { x: 52, y: 66 }, { x: 92, y: 69 }]
  }
];

export function buildCustomProcess(custom = {}) {
  const steps = Array.isArray(custom.steps) && custom.steps.length
    ? custom.steps.map((item, index) => typeof item === "string" ? step(`Step ${index + 1}`, item) : step(item.name || `Step ${index + 1}`, item.detail || "Custom workflow activity"))
    : [
      step("Receive work order", "Work instruction is released from WMS/WES or uploaded process flow."),
      step("Execute activity", "Human, robot, or combined team performs the configured task."),
      step("Validate output", "Scan, vision, or supervisor check confirms quality and service level."),
      step("Close transaction", "System updates inventory, labor, robot telemetry, and KPI dashboard.")
    ];

  return {
    id: "custom-process",
    name: custom.name || "Custom process flow",
    category: custom.category || "Custom",
    summary: custom.summary || "User-defined 3PL process created from operational knowledge, uploaded process flow, engineering model, or material flow file.",
    pilotFit: custom.pilotFit || "To be validated",
    recommendedTech: custom.recommendedTech || ["amr", "vision", "humanoid", "robotic-arm", "robotic-forklift"],
    recommendedMix: custom.recommendedMix || { amr: 28, vision: 24, humanoid: 20, "robotic-arm": 16, "robotic-forklift": 12 },
    defaultParams: params(custom.defaultParams || { complexity: 60, variability: 60, processStandardization: 45, integrationCapex: 500000 }),
    requirements: req(custom.requirements || { lift: 50, mobility: 65, dexterity: 62, vision: 78, endurance: 68, speed: 64, autonomy: 70, safety: 86, api: 74, scalability: 68 }),
    steps,
    manual: custom.manual || { baseCycleSec: 60, errorRate: 1.5, injuryIndex: 55, throughputPerHour: 60 },
    robot: custom.robot || { baseCycleSec: 64, errorRate: 0.8, improvementCeiling: 18, assistLaborRatio: 0.25 },
    layoutPath: custom.layoutPath || [{ x: 12, y: 18 }, { x: 30, y: 28 }, { x: 48, y: 38 }, { x: 70, y: 50 }, { x: 88, y: 62 }]
  };
}

export const ROBOTS = [
  {
    id: "agility-digit",
    name: "Agility Robotics Digit",
    company: "Agility Robotics",
    technology: "humanoid",
    typeLabel: "Humanoid logistics worker",
    deployment: ["RaaS", "Lease", "Pilot to scale"],
    payloadKg: 16,
    enduranceHours: 4,
    speedMps: 1.5,
    capabilities: { lift: 62, mobility: 84, dexterity: 64, vision: 78, endurance: 72, speed: 72, autonomy: 76, safety: 82, api: 80, scalability: 82 },
    readiness: 78,
    commercialMaturity: 78,
    maintenance: 72,
    raasMonthlyUsd: 9500,
    leaseMonthlyUsd: 7400,
    purchaseUsd: 260000,
    integrationComplexity: 58,
    bestFor: ["case-picking", "inbound-receiving", "cross-dock-sort", "g2p-replenishment"],
    caution: "Strong for human-scale logistics movement and tote/cart workflows; payload and dexterity still limit heavy or highly variable manipulation."
  },
  {
    id: "apptronik-apollo",
    name: "Apptronik Apollo",
    company: "Apptronik",
    technology: "humanoid",
    typeLabel: "General-purpose industrial humanoid",
    deployment: ["Pilot", "Lease", "Managed deployment"],
    payloadKg: 25,
    enduranceHours: 4,
    speedMps: 1.3,
    capabilities: { lift: 76, mobility: 76, dexterity: 72, vision: 78, endurance: 72, speed: 66, autonomy: 70, safety: 84, api: 74, scalability: 72 },
    readiness: 72,
    commercialMaturity: 68,
    maintenance: 68,
    raasMonthlyUsd: 10500,
    leaseMonthlyUsd: 8200,
    purchaseUsd: 290000,
    integrationComplexity: 62,
    bestFor: ["inbound-receiving", "case-picking", "palletizing", "kitting-vas"],
    caution: "Promising higher-payload humanoid for industrial environments; validate duty cycle, spare parts, and support model before scaling."
  },
  {
    id: "figure-03",
    name: "Figure AI Figure 02/03",
    company: "Figure AI",
    technology: "humanoid",
    typeLabel: "AI-enabled humanoid",
    deployment: ["Strategic pilot", "OEM partnership"],
    payloadKg: 20,
    enduranceHours: 5,
    speedMps: 1.2,
    capabilities: { lift: 70, mobility: 74, dexterity: 82, vision: 84, endurance: 76, speed: 62, autonomy: 82, safety: 78, api: 66, scalability: 70 },
    readiness: 74,
    commercialMaturity: 62,
    maintenance: 64,
    raasMonthlyUsd: 12000,
    leaseMonthlyUsd: 9400,
    purchaseUsd: 320000,
    integrationComplexity: 70,
    bestFor: ["packing-qc", "returns-processing", "case-picking", "piece-picking"],
    caution: "Strong manipulation and AI positioning; logistics commercial terms and open integration model should be validated."
  },
  {
    id: "ubtech-walker-s",
    name: "UBTECH Walker S / S1",
    company: "UBTECH Robotics",
    technology: "humanoid",
    typeLabel: "Industrial humanoid",
    deployment: ["Pilot", "Factory automation partnership"],
    payloadKg: 10,
    enduranceHours: 2,
    speedMps: 0.5,
    capabilities: { lift: 48, mobility: 66, dexterity: 72, vision: 82, endurance: 48, speed: 42, autonomy: 72, safety: 80, api: 70, scalability: 70 },
    readiness: 70,
    commercialMaturity: 66,
    maintenance: 62,
    raasMonthlyUsd: 9000,
    leaseMonthlyUsd: 7000,
    purchaseUsd: 230000,
    integrationComplexity: 64,
    bestFor: ["packing-qc", "inventory-count", "inbound-receiving"],
    caution: "Better fit for controlled inspection and factory-line tasks than long-distance, high-speed warehouse movement."
  },
  {
    id: "sanctuary-phoenix",
    name: "Sanctuary AI Phoenix",
    company: "Sanctuary AI",
    technology: "humanoid",
    typeLabel: "Dexterous humanoid worker",
    deployment: ["Pilot", "Task-learning partnership"],
    payloadKg: 12,
    enduranceHours: 3,
    speedMps: 0.9,
    capabilities: { lift: 52, mobility: 58, dexterity: 90, vision: 84, endurance: 58, speed: 48, autonomy: 80, safety: 78, api: 66, scalability: 58 },
    readiness: 66,
    commercialMaturity: 58,
    maintenance: 58,
    raasMonthlyUsd: 11000,
    leaseMonthlyUsd: 8500,
    purchaseUsd: 280000,
    integrationComplexity: 72,
    bestFor: ["returns-processing", "packing-qc", "kitting-vas"],
    caution: "Potentially strong for dexterous task learning; less obvious fit for high-throughput movement without controlled pilots."
  },
  {
    id: "unitree-g1",
    name: "Unitree G1 / H1",
    company: "Unitree Robotics",
    technology: "humanoid",
    typeLabel: "Research and development humanoid",
    deployment: ["R&D", "Proof of concept"],
    payloadKg: 3,
    enduranceHours: 2,
    speedMps: 1.4,
    capabilities: { lift: 24, mobility: 76, dexterity: 64, vision: 62, endurance: 46, speed: 68, autonomy: 48, safety: 62, api: 72, scalability: 64 },
    readiness: 50,
    commercialMaturity: 46,
    maintenance: 56,
    raasMonthlyUsd: 3500,
    leaseMonthlyUsd: 2500,
    purchaseUsd: 65000,
    integrationComplexity: 58,
    bestFor: ["inventory-count", "yard-dock-inspection"],
    caution: "Low cost and agile platform, but not a default 3PL worker for payload-intensive operations."
  },
  {
    id: "locus-amr",
    name: "Locus Robotics LocusBot ecosystem",
    company: "Locus Robotics",
    technology: "amr",
    typeLabel: "Collaborative AMR picking platform",
    deployment: ["RaaS", "Scale deployment", "WMS integration"],
    payloadKg: 36,
    enduranceHours: 10,
    speedMps: 1.6,
    capabilities: { lift: 42, mobility: 90, dexterity: 18, vision: 72, endurance: 92, speed: 88, autonomy: 88, safety: 90, api: 88, scalability: 92 },
    readiness: 92,
    commercialMaturity: 94,
    maintenance: 86,
    raasMonthlyUsd: 4500,
    leaseMonthlyUsd: 3400,
    purchaseUsd: 70000,
    integrationComplexity: 36,
    bestFor: ["case-picking", "g2p-replenishment", "cross-dock-sort", "putaway"],
    caution: "High-maturity option for movement and workflow guidance; requires humans or arms for complex manipulation."
  },
  {
    id: "geekplus-amr",
    name: "Geek+ AMR / goods-to-person",
    company: "Geek+",
    technology: "amr",
    typeLabel: "Goods-to-person AMR fleet",
    deployment: ["RaaS", "Lease", "Purchase"],
    payloadKg: 500,
    enduranceHours: 10,
    speedMps: 1.8,
    capabilities: { lift: 80, mobility: 86, dexterity: 12, vision: 72, endurance: 92, speed: 90, autonomy: 88, safety: 86, api: 84, scalability: 90 },
    readiness: 88,
    commercialMaturity: 88,
    maintenance: 82,
    raasMonthlyUsd: 6000,
    leaseMonthlyUsd: 4500,
    purchaseUsd: 95000,
    integrationComplexity: 46,
    bestFor: ["g2p-replenishment", "putaway", "pallet-movement", "case-picking"],
    caution: "Strong when process can be designed around AMR workflows; layout and fleet traffic management are critical."
  },
  {
    id: "zebra-fetch",
    name: "Zebra Fetch / AMR portfolio",
    company: "Zebra Technologies",
    technology: "amr",
    typeLabel: "AMR and workflow automation",
    deployment: ["Lease", "Managed service", "Purchase"],
    payloadKg: 150,
    enduranceHours: 9,
    speedMps: 1.7,
    capabilities: { lift: 62, mobility: 88, dexterity: 16, vision: 76, endurance: 88, speed: 88, autonomy: 86, safety: 88, api: 86, scalability: 86 },
    readiness: 88,
    commercialMaturity: 90,
    maintenance: 84,
    raasMonthlyUsd: 5200,
    leaseMonthlyUsd: 3900,
    purchaseUsd: 85000,
    integrationComplexity: 42,
    bestFor: ["g2p-replenishment", "inbound-receiving", "cross-dock-sort", "yard-dock-inspection"],
    caution: "Good fit for material movement and scanning workflows; not a humanoid substitute for dexterous tasks."
  },
  {
    id: "mir-amr",
    name: "Mobile Industrial Robots MiR fleet",
    company: "MiR / Teradyne",
    technology: "amr",
    typeLabel: "Autonomous mobile robot",
    deployment: ["Lease", "Purchase", "Integrator-led"],
    payloadKg: 1350,
    enduranceHours: 10,
    speedMps: 1.5,
    capabilities: { lift: 86, mobility: 84, dexterity: 12, vision: 70, endurance: 88, speed: 82, autonomy: 84, safety: 88, api: 82, scalability: 80 },
    readiness: 86,
    commercialMaturity: 88,
    maintenance: 82,
    raasMonthlyUsd: 6200,
    leaseMonthlyUsd: 4700,
    purchaseUsd: 110000,
    integrationComplexity: 44,
    bestFor: ["pallet-movement", "g2p-replenishment", "putaway"],
    caution: "Strong payload movement platform; needs engineered load transfer points and traffic management."
  },
  {
    id: "seegrid-palion",
    name: "Seegrid Palion Lift / Tow Tractor",
    company: "Seegrid",
    technology: "robotic-forklift",
    typeLabel: "Autonomous forklift and tow tractor",
    deployment: ["RaaS", "Lease", "Managed deployment"],
    payloadKg: 1600,
    enduranceHours: 10,
    speedMps: 1.8,
    capabilities: { lift: 96, mobility: 86, dexterity: 22, vision: 78, endurance: 92, speed: 86, autonomy: 86, safety: 90, api: 80, scalability: 84 },
    readiness: 88,
    commercialMaturity: 88,
    maintenance: 82,
    raasMonthlyUsd: 12000,
    leaseMonthlyUsd: 9200,
    purchaseUsd: 210000,
    integrationComplexity: 54,
    bestFor: ["pallet-movement", "truck-loading", "putaway"],
    caution: "Strong pallet movement answer; requires floor quality, lane discipline, safety zoning, and WMS/WES task interface."
  },
  {
    id: "fox-forklift",
    name: "Fox Robotics autonomous forklift",
    company: "Fox Robotics",
    technology: "robotic-forklift",
    typeLabel: "Autonomous trailer loading/unloading forklift",
    deployment: ["RaaS", "Managed deployment"],
    payloadKg: 1600,
    enduranceHours: 9,
    speedMps: 1.7,
    capabilities: { lift: 96, mobility: 82, dexterity: 24, vision: 84, endurance: 88, speed: 84, autonomy: 84, safety: 90, api: 78, scalability: 78 },
    readiness: 82,
    commercialMaturity: 80,
    maintenance: 80,
    raasMonthlyUsd: 13500,
    leaseMonthlyUsd: 10200,
    purchaseUsd: 230000,
    integrationComplexity: 58,
    bestFor: ["truck-loading", "pallet-movement", "putaway"],
    caution: "Strong fit for dock and trailer workflows; validate trailer variability, pallet quality, and site safety controls."
  },
  {
    id: "vecna-afl",
    name: "Vecna Robotics autonomous forklifts",
    company: "Vecna Robotics",
    technology: "robotic-forklift",
    typeLabel: "Autonomous forklift fleet",
    deployment: ["RaaS", "Lease", "Integrator-led"],
    payloadKg: 1800,
    enduranceHours: 10,
    speedMps: 1.6,
    capabilities: { lift: 96, mobility: 84, dexterity: 22, vision: 80, endurance: 90, speed: 82, autonomy: 84, safety: 90, api: 82, scalability: 82 },
    readiness: 84,
    commercialMaturity: 84,
    maintenance: 80,
    raasMonthlyUsd: 12500,
    leaseMonthlyUsd: 9600,
    purchaseUsd: 220000,
    integrationComplexity: 54,
    bestFor: ["pallet-movement", "truck-loading", "putaway"],
    caution: "Good fit for pallet movement; implementation quality depends on integration and process standardization."
  },
  {
    id: "bd-stretch",
    name: "Boston Dynamics Stretch",
    company: "Boston Dynamics",
    technology: "warehouse-specialist",
    typeLabel: "Specialist warehouse case handling robot",
    deployment: ["Managed deployment", "Service contract"],
    payloadKg: 23,
    enduranceHours: 8,
    speedMps: 1.0,
    capabilities: { lift: 80, mobility: 62, dexterity: 60, vision: 88, endurance: 86, speed: 86, autonomy: 84, safety: 84, api: 72, scalability: 78 },
    readiness: 84,
    commercialMaturity: 84,
    maintenance: 76,
    raasMonthlyUsd: 22000,
    leaseMonthlyUsd: 17000,
    purchaseUsd: 480000,
    integrationComplexity: 66,
    bestFor: ["container-unloading", "palletizing", "sorter-induction"],
    caution: "Not a humanoid, but often a better ROI answer for container unload and case handling where the task is specialized."
  },
  {
    id: "fanuc-pallet-cell",
    name: "FANUC / ABB palletizing cell",
    company: "FANUC / ABB ecosystem",
    technology: "robotic-arm",
    typeLabel: "Industrial palletizing robot cell",
    deployment: ["Purchase", "Lease", "Integrator-led"],
    payloadKg: 80,
    enduranceHours: 20,
    speedMps: 2.2,
    capabilities: { lift: 96, mobility: 20, dexterity: 70, vision: 76, endurance: 98, speed: 90, autonomy: 78, safety: 78, api: 76, scalability: 78 },
    readiness: 94,
    commercialMaturity: 96,
    maintenance: 86,
    raasMonthlyUsd: 16000,
    leaseMonthlyUsd: 11500,
    purchaseUsd: 380000,
    integrationComplexity: 62,
    bestFor: ["palletizing", "sorter-induction", "packing-qc"],
    caution: "Mature and robust for engineered cells; poor fit for highly mobile human-space work unless process is redesigned."
  },
  {
    id: "mujin-cell",
    name: "Mujin robotic case handling cell",
    company: "Mujin",
    technology: "robotic-arm",
    typeLabel: "AI robotic case handling / depalletizing",
    deployment: ["Managed deployment", "Integrator-led", "Purchase"],
    payloadKg: 25,
    enduranceHours: 18,
    speedMps: 1.8,
    capabilities: { lift: 82, mobility: 24, dexterity: 78, vision: 88, endurance: 94, speed: 86, autonomy: 84, safety: 82, api: 78, scalability: 80 },
    readiness: 86,
    commercialMaturity: 84,
    maintenance: 80,
    raasMonthlyUsd: 19000,
    leaseMonthlyUsd: 14500,
    purchaseUsd: 430000,
    integrationComplexity: 68,
    bestFor: ["container-unloading", "palletizing", "sorter-induction"],
    caution: "Strong for engineered case handling; needs good inbound variability data and mechanical integration."
  },
  {
    id: "righthand-piecepick",
    name: "RightHand Robotics / piece-pick cell",
    company: "RightHand Robotics ecosystem",
    technology: "robotic-arm",
    typeLabel: "Robotic piece-picking cell",
    deployment: ["RaaS", "Lease", "Integrator-led"],
    payloadKg: 5,
    enduranceHours: 18,
    speedMps: 1.4,
    capabilities: { lift: 34, mobility: 18, dexterity: 92, vision: 90, endurance: 94, speed: 76, autonomy: 82, safety: 82, api: 82, scalability: 76 },
    readiness: 80,
    commercialMaturity: 78,
    maintenance: 78,
    raasMonthlyUsd: 12500,
    leaseMonthlyUsd: 9400,
    purchaseUsd: 260000,
    integrationComplexity: 58,
    bestFor: ["piece-picking", "packing-qc", "kitting-vas"],
    caution: "Good for structured piece picking; validate SKU pickability and exception rate before committing."
  },
  {
    id: "dexory-inventory",
    name: "DexoryView autonomous inventory robot",
    company: "Dexory",
    technology: "vision",
    typeLabel: "Autonomous inventory scan platform",
    deployment: ["RaaS", "Managed service", "Lease"],
    payloadKg: 5,
    enduranceHours: 10,
    speedMps: 1.4,
    capabilities: { lift: 8, mobility: 86, dexterity: 10, vision: 96, endurance: 88, speed: 76, autonomy: 90, safety: 90, api: 86, scalability: 88 },
    readiness: 86,
    commercialMaturity: 84,
    maintenance: 82,
    raasMonthlyUsd: 8500,
    leaseMonthlyUsd: 6500,
    purchaseUsd: 160000,
    integrationComplexity: 40,
    bestFor: ["inventory-count", "yard-dock-inspection", "putaway"],
    caution: "Excellent for inventory visibility and audit; not a material handling solution."
  },
  {
    id: "gather-ai-drone",
    name: "Gather AI inventory drones",
    company: "Gather AI",
    technology: "vision",
    typeLabel: "Autonomous inventory drone system",
    deployment: ["Subscription", "Managed service"],
    payloadKg: 1,
    enduranceHours: 0.5,
    speedMps: 2.0,
    capabilities: { lift: 4, mobility: 92, dexterity: 6, vision: 94, endurance: 54, speed: 88, autonomy: 84, safety: 82, api: 80, scalability: 86 },
    readiness: 82,
    commercialMaturity: 80,
    maintenance: 78,
    raasMonthlyUsd: 6500,
    leaseMonthlyUsd: 5200,
    purchaseUsd: 120000,
    integrationComplexity: 42,
    bestFor: ["inventory-count", "yard-dock-inspection"],
    caution: "High-value for scan and audit; operations must validate airspace rules, battery cycles, and people interaction."
  },
  {
    id: "cognex-vision",
    name: "Cognex / Zebra fixed vision inspection",
    company: "Cognex / Zebra / Scandit ecosystem",
    technology: "vision",
    typeLabel: "Fixed vision, OCR and barcode validation",
    deployment: ["Subscription", "Purchase", "Integrator-led"],
    payloadKg: 0,
    enduranceHours: 24,
    speedMps: 0,
    capabilities: { lift: 0, mobility: 10, dexterity: 0, vision: 98, endurance: 98, speed: 92, autonomy: 80, safety: 88, api: 88, scalability: 90 },
    readiness: 94,
    commercialMaturity: 96,
    maintenance: 88,
    raasMonthlyUsd: 4000,
    leaseMonthlyUsd: 3000,
    purchaseUsd: 90000,
    integrationComplexity: 38,
    bestFor: ["packing-qc", "inbound-receiving", "sorter-induction", "cross-dock-sort", "truck-loading"],
    caution: "Mature quality and scan automation; requires engineered camera placement and good master data."
  }
];

export const DEFAULT_STATE = {
  processId: "case-picking",
  regionId: "europe",
  commercialModel: "raas",
  scenarioName: "DP World Hybrid Workforce baseline",
  params: {},
  selectedRobotId: null,
  customProcess: {
    name: "Custom process flow",
    category: "Custom",
    summary: "Define a custom DP World 3PL process and upload engineering, process, or material-flow files.",
    steps: ["Receive task", "Move material", "Validate quality", "Close transaction"]
  },
  uploadedAssets: []
};

export const COMMON_PARAMETER_DEFINITIONS = [
  { key: "volumePerShift", label: "Volume per shift", min: 500, max: 15000, step: 100, suffix: " units", group: "Demand" },
  { key: "shiftHours", label: "Shift duration", min: 6, max: 12, step: 0.5, suffix: " hrs", group: "Labor" },
  { key: "operatingShiftsDay", label: "Operating shifts per day", min: 1, max: 3, step: 0.5, suffix: " shifts", group: "Labor" },
  { key: "avgPayloadKg", label: "Average payload", min: 0, max: 35, step: 1, suffix: " kg", group: "Product" },
  { key: "travelMeters", label: "Average travel distance", min: 1, max: 140, step: 1, suffix: " m", group: "Layout" },
  { key: "complexity", label: "Process complexity", min: 0, max: 100, step: 1, suffix: "/100", group: "Process" },
  { key: "variability", label: "SKU / task variability", min: 0, max: 100, step: 1, suffix: "/100", group: "Process" },
  { key: "ergonomicsRisk", label: "Ergonomics risk", min: 0, max: 100, step: 1, suffix: "/100", group: "Safety" },
  { key: "targetServiceLevel", label: "Target service level", min: 85, max: 99, step: 1, suffix: "%", group: "SLA" },
  { key: "humanUtilization", label: "Manual labor utilization", min: 50, max: 92, step: 1, suffix: "%", group: "Labor" },
  { key: "robotUtilization", label: "Robot target utilization", min: 45, max: 90, step: 1, suffix: "%", group: "Automation" },
  { key: "autonomyTarget", label: "Required autonomy", min: 40, max: 95, step: 1, suffix: "/100", group: "Automation" },
  { key: "cloudCostMonthly", label: "Platform cloud + support", min: 2000, max: 60000, step: 500, prefix: "$", suffix: "/mo", group: "Cost" },
  { key: "integrationCapex", label: "Startup integration budget", min: 50000, max: 2500000, step: 25000, prefix: "$", group: "Cost" },
  { key: "processStandardization", label: "Process standardization", min: 0, max: 100, step: 1, suffix: "/100", group: "Readiness" }
];

export const PROCESS_PARAMETER_DEFINITIONS = {
  default: [
    { key: "peakFactor", label: "Peak demand multiplier", min: 1, max: 2.2, step: 0.05, suffix: "x", group: "Demand" },
    { key: "exceptionRate", label: "Exception rate", min: 0, max: 35, step: 1, suffix: "%", group: "Quality" },
    { key: "layoutReadiness", label: "Layout readiness", min: 0, max: 100, step: 1, suffix: "/100", group: "Readiness" },
    { key: "wmsIntegration", label: "WMS / WES integration readiness", min: 0, max: 100, step: 1, suffix: "/100", group: "Readiness" },
    { key: "safetyCriticality", label: "Safety criticality", min: 0, max: 100, step: 1, suffix: "/100", group: "Safety" }
  ],
  "inbound-receiving": [
    { key: "dockDoorUtilization", label: "Dock-door utilization", min: 20, max: 100, step: 1, suffix: "%", group: "Dock" },
    { key: "productFragility", label: "Fragile / damage-sensitive items", min: 0, max: 100, step: 1, suffix: "/100", group: "Product" }
  ],
  putaway: [
    { key: "palletHeightCm", label: "Average pallet / load height", min: 60, max: 220, step: 5, suffix: " cm", group: "Product" },
    { key: "skuVelocitySkew", label: "SKU velocity skew", min: 0, max: 100, step: 1, suffix: "/100", group: "Slotting" }
  ],
  "case-picking": [
    { key: "skuVelocitySkew", label: "ABC velocity concentration", min: 0, max: 100, step: 1, suffix: "/100", group: "Slotting" },
    { key: "productFragility", label: "Product fragility", min: 0, max: 100, step: 1, suffix: "/100", group: "Product" }
  ],
  "piece-picking": [
    { key: "skuVelocitySkew", label: "Long-tail SKU intensity", min: 0, max: 100, step: 1, suffix: "/100", group: "SKU" },
    { key: "productFragility", label: "Fragility / deformability", min: 0, max: 100, step: 1, suffix: "/100", group: "Product" }
  ],
  "g2p-replenishment": [
    { key: "skuVelocitySkew", label: "Replenishment volatility", min: 0, max: 100, step: 1, suffix: "/100", group: "Demand" }
  ],
  "cross-dock-sort": [
    { key: "dockDoorUtilization", label: "Dock-door utilization", min: 20, max: 100, step: 1, suffix: "%", group: "Dock" },
    { key: "peakFactor", label: "Arrival wave peak", min: 1, max: 2.5, step: 0.05, suffix: "x", group: "Demand" }
  ],
  "container-unloading": [
    { key: "dockDoorUtilization", label: "Door time pressure", min: 20, max: 100, step: 1, suffix: "%", group: "Dock" },
    { key: "productFragility", label: "Fragile / unstable cartons", min: 0, max: 100, step: 1, suffix: "/100", group: "Product" }
  ],
  "truck-loading": [
    { key: "dockDoorUtilization", label: "Dock-door utilization", min: 20, max: 100, step: 1, suffix: "%", group: "Dock" },
    { key: "palletHeightCm", label: "Average pallet height", min: 60, max: 220, step: 5, suffix: " cm", group: "Product" }
  ],
  palletizing: [
    { key: "palletHeightCm", label: "Target pallet height", min: 60, max: 240, step: 5, suffix: " cm", group: "Product" },
    { key: "productFragility", label: "Crush / damage risk", min: 0, max: 100, step: 1, suffix: "/100", group: "Product" }
  ],
  "pallet-movement": [
    { key: "palletHeightCm", label: "Average pallet height", min: 60, max: 240, step: 5, suffix: " cm", group: "Product" },
    { key: "dockDoorUtilization", label: "Traffic congestion / dock utilization", min: 20, max: 100, step: 1, suffix: "%", group: "Layout" }
  ],
  "returns-processing": [
    { key: "productFragility", label: "Condition variability / fragility", min: 0, max: 100, step: 1, suffix: "/100", group: "Product" }
  ],
  "kitting-vas": [
    { key: "productFragility", label: "Assembly fragility", min: 0, max: 100, step: 1, suffix: "/100", group: "Product" }
  ],
  "yard-dock-inspection": [
    { key: "dockDoorUtilization", label: "Dock-door / yard intensity", min: 20, max: 100, step: 1, suffix: "%", group: "Yard" }
  ]
};

export function parameterDefinitionsForProcess(processId) {
  const specific = PROCESS_PARAMETER_DEFINITIONS[processId] || [];
  const seen = new Set();
  return [...COMMON_PARAMETER_DEFINITIONS, ...PROCESS_PARAMETER_DEFINITIONS.default, ...specific]
    .filter(def => {
      if (seen.has(def.key)) return false;
      seen.add(def.key);
      return true;
    });
}

export const SOURCE_NOTES = [
  "Public robot specifications and commercial models are incomplete and change frequently. Values in this app are planning assumptions for strategy simulation, not procurement facts.",
  "For procurement, replace these values with OEM responses, DP World site observations, WMS data, safety validation, and service-level proposals.",
  "The model deliberately includes AMRs, robotic forklifts, robotic arms, vision systems, warehouse-specialist robots, and humanoids so the platform recommends the best combination instead of forcing every process to a humanoid."
];
