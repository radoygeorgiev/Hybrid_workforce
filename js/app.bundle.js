/*
 DP World Hybrid Workforce Platform - Browser-compatible bundle
 Local/offline execution: removes ES-module imports and avoids fetch/server dependencies.
*/
(function installLocalCompatibility(){
  if (typeof window !== "undefined" && typeof window.structuredClone !== "function") {
    window.structuredClone = function structuredClonePolyfill(value) { return JSON.parse(JSON.stringify(value)); };
  }
  if (typeof window !== "undefined" && typeof window.ResizeObserver !== "function") {
    window.ResizeObserver = class ResizeObserverFallback {
      constructor(callback) { this.callback = callback; this.items = []; this._timer = null; }
      observe(target) {
        this.items.push(target);
        if (!this._timer) this._timer = window.setInterval(() => this.callback(this.items.map(target => ({ target }))), 500);
      }
      unobserve(target) { this.items = this.items.filter(item => item !== target); }
      disconnect() { if (this._timer) window.clearInterval(this._timer); this._timer = null; this.items = []; }
    };
  }
})();


/* ===== src-modules/data.js ===== */
const REGIONS = [
  { id: "singapore", name: "Singapore", currency: "USD", wageUsdHour: 24, burden: 1.42, availabilityRisk: 78 },
  { id: "australia", name: "Australia", currency: "USD", wageUsdHour: 31, burden: 1.36, availabilityRisk: 74 },
  { id: "europe", name: "Europe high-cost cluster", currency: "USD", wageUsdHour: 34, burden: 1.38, availabilityRisk: 70 },
  { id: "usa", name: "United States", currency: "USD", wageUsdHour: 26, burden: 1.34, availabilityRisk: 76 },
  { id: "canada", name: "Canada", currency: "USD", wageUsdHour: 25, burden: 1.35, availabilityRisk: 72 },
  { id: "other-high-cost", name: "Other high-cost global sites", currency: "USD", wageUsdHour: 22, burden: 1.3, availabilityRisk: 66 }
];

const TECHNOLOGY_LABELS = {
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

const PROCESSES = [
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

function buildCustomProcess(custom = {}) {
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

const ROBOTS = [
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

const DEFAULT_STATE = {
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

const COMMON_PARAMETER_DEFINITIONS = [
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

const PROCESS_PARAMETER_DEFINITIONS = {
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

function parameterDefinitionsForProcess(processId) {
  const specific = PROCESS_PARAMETER_DEFINITIONS[processId] || [];
  const seen = new Set();
  return [...COMMON_PARAMETER_DEFINITIONS, ...PROCESS_PARAMETER_DEFINITIONS.default, ...specific]
    .filter(def => {
      if (seen.has(def.key)) return false;
      seen.add(def.key);
      return true;
    });
}

const SOURCE_NOTES = [
  "Public robot specifications and commercial models are incomplete and change frequently. Values in this app are planning assumptions for strategy simulation, not procurement facts.",
  "For procurement, replace these values with OEM responses, DP World site observations, WMS data, safety validation, and service-level proposals.",
  "The model deliberately includes AMRs, robotic forklifts, robotic arms, vision systems, warehouse-specialist robots, and humanoids so the platform recommends the best combination instead of forcing every process to a humanoid."
];

/* ===== src-modules/engine.js ===== */

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatNumber(value, decimals = 0) {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  }).format(value);
}

function formatCurrency(value, compact = true) {
  if (!Number.isFinite(value)) return "-";
  if (compact && Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (compact && Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function percent(value, decimals = 0) {
  if (!Number.isFinite(value)) return "-";
  return `${value.toFixed(decimals)}%`;
}

function getProcess(state) {
  if (state.processId === "custom-process") return buildCustomProcess(state.customProcess || {});
  return PROCESSES.find(item => item.id === state.processId) || PROCESSES[0];
}

function getRegion(state) {
  return REGIONS.find(item => item.id === state.regionId) || REGIONS[0];
}

function getParams(state) {
  const process = getProcess(state);
  return { ...process.defaultParams, ...(state.params || {}) };
}

function fullyLoadedLaborCostPerHour(region) {
  return region.wageUsdHour * region.burden;
}

function annualFteCost(region, shiftHours) {
  const annualHours = shiftHours * 250;
  return fullyLoadedLaborCostPerHour(region) * annualHours;
}

function processAdjustedRequirements(process, params) {
  const base = { ...process.requirements };
  const payloadBoost = clamp((params.avgPayloadKg - 8) * 2.7, -18, 35);
  const travelBoost = clamp((params.travelMeters - 40) * 0.18, -9, 20);
  const complexityBoost = (params.complexity - 50) * 0.18;
  const variabilityBoost = (params.variability - 50) * 0.22;
  const ergoBoost = (params.ergonomicsRisk - 50) * 0.14;
  const exceptionBoost = ((params.exceptionRate || 0) - 6) * 0.34;
  const peakBoost = ((params.peakFactor || 1.2) - 1.2) * 11;
  const layoutPenalty = (65 - (params.layoutReadiness || 65)) * 0.15;
  const wmsBoost = (params.targetServiceLevel - 95) * 1.1 + (75 - (params.wmsIntegration || 75)) * 0.1;
  const safetyBoost = ((params.safetyCriticality || 70) - 70) * 0.18;
  const standardizationPenalty = (65 - (params.processStandardization || 65)) * 0.12;
  const fragilityBoost = ((params.productFragility || 40) - 40) * 0.12;

  return {
    lift: clamp(base.lift + payloadBoost + ergoBoost, 0, 100),
    mobility: clamp(base.mobility + travelBoost + layoutPenalty, 0, 100),
    dexterity: clamp(base.dexterity + complexityBoost + variabilityBoost * 0.45 + fragilityBoost, 0, 100),
    vision: clamp(base.vision + variabilityBoost * 0.45 + wmsBoost + exceptionBoost, 0, 100),
    endurance: clamp(base.endurance + params.shiftHours * 1.2 - 10 + (params.robotUtilization - 70) * 0.2 + peakBoost, 0, 100),
    speed: clamp(base.speed + (params.volumePerShift - process.defaultParams.volumePerShift) / 520 + peakBoost * 0.5, 0, 100),
    autonomy: clamp(base.autonomy + (params.autonomyTarget - 70) * 0.7 + variabilityBoost * 0.32 + exceptionBoost + standardizationPenalty, 0, 100),
    safety: clamp(base.safety + (params.ergonomicsRisk - 50) * 0.12 + safetyBoost, 0, 100),
    api: clamp(base.api + (params.targetServiceLevel - 95) * 0.8 + ((params.wmsIntegration || 70) - 70) * 0.16, 0, 100),
    scalability: clamp(base.scalability + (params.volumePerShift - process.defaultParams.volumePerShift) / 900 + ((params.processStandardization || 65) - 65) * 0.13, 0, 100)
  };
}

const CAPABILITY_WEIGHTS = {
  lift: 0.13,
  mobility: 0.11,
  dexterity: 0.14,
  vision: 0.12,
  endurance: 0.1,
  speed: 0.09,
  autonomy: 0.13,
  safety: 0.09,
  api: 0.05,
  scalability: 0.04
};

function scoreRobot(robot, process, params) {
  const req = processAdjustedRequirements(process, params);
  let fit = 0;
  let underfitPenalty = 0;
  let overfitBonus = 0;

  Object.entries(CAPABILITY_WEIGHTS).forEach(([key, weight]) => {
    const capability = robot.capabilities[key] || 0;
    const required = req[key] || 0;
    const ratio = required <= 0 ? 1 : capability / required;
    const normalized = clamp(ratio, 0, 1.18);
    fit += normalized * weight * 100;
    if (capability + 5 < required) underfitPenalty += (required - capability) * weight * 0.46;
    if (capability > required + 12) overfitBonus += Math.min(capability - required, 18) * weight * 0.06;
  });

  const payloadPenalty = robot.payloadKg < params.avgPayloadKg ? (params.avgPayloadKg - robot.payloadKg) * 2.7 : 0;
  const endurancePenalty = robot.enduranceHours < Math.min(4, params.shiftHours * 0.35) ? 5 : 0;
  const processBonus = robot.bestFor.includes(process.id) ? 7 : 0;
  const techBonus = process.recommendedTech?.includes(robot.technology) ? 6 : -2;
  const maturityFactor = (robot.readiness * 0.16) + (robot.commercialMaturity * 0.14) + (robot.maintenance * 0.06);
  const commercialFlex = robot.deployment.some(item => item.toLowerCase().includes("raas") || item.toLowerCase().includes("subscription")) ? 3 : 0;
  const specialistGuardrail = process.pilotFit.includes("Specialist") && robot.technology !== "humanoid" ? 7 : 0;
  const humanoidGuardrail = process.pilotFit.includes("Specialist") && robot.technology === "humanoid" ? -10 : 0;
  const layoutRisk = (params.layoutReadiness || 70) < 45 && ["amr", "robotic-forklift"].includes(robot.technology) ? -5 : 0;
  const wmsRisk = (params.wmsIntegration || 70) < 45 && robot.capabilities.api < 80 ? -4 : 0;

  const score = clamp(fit - underfitPenalty + overfitBonus - payloadPenalty - endurancePenalty + processBonus + techBonus + maturityFactor + commercialFlex + specialistGuardrail + humanoidGuardrail + layoutRisk + wmsRisk, 0, 100);
  return {
    robot,
    score,
    req,
    payloadPenalty,
    underfitPenalty,
    reason: buildRobotReason(robot, process, params, score)
  };
}

function buildRobotReason(robot, process, params, score) {
  const payloadFit = robot.payloadKg >= params.avgPayloadKg ? "payload fit" : "payload risk";
  const processFit = robot.bestFor.includes(process.id) ? "known process fit" : process.recommendedTech?.includes(robot.technology) ? "recommended technology class" : "adjacent fit";
  const maturity = robot.commercialMaturity >= 85 ? "high commercial maturity" : robot.commercialMaturity >= 70 ? "pilot-to-scale maturity" : "early maturity";
  return `${payloadFit}, ${processFit}, ${maturity}, score ${score.toFixed(0)}/100`;
}

function rankedRobots(state) {
  const process = getProcess(state);
  const params = getParams(state);
  return ROBOTS
    .map(robot => scoreRobot(robot, process, params))
    .sort((a, b) => b.score - a.score);
}

function selectedRobotResult(state) {
  const ranked = rankedRobots(state);
  if (state.selectedRobotId) {
    const selected = ranked.find(item => item.robot.id === state.selectedRobotId);
    if (selected) return selected;
  }
  return ranked[0];
}

function robotMonthlyCost(robot, commercialModel) {
  if (commercialModel === "lease") return robot.leaseMonthlyUsd;
  if (commercialModel === "purchase") return (robot.purchaseUsd / 60) + (robot.purchaseUsd * 0.14 / 12);
  return robot.raasMonthlyUsd;
}

function buildAutomationMix(ranked, process, robotsRequired) {
  const mix = process.recommendedMix || { [ranked[0]?.robot.technology || "humanoid"]: 100 };
  const entries = Object.entries(mix)
    .map(([technology, share]) => {
      const candidate = ranked.find(item => item.robot.technology === technology) || ranked[0];
      const shareValue = Number(share) || 0;
      return {
        technology,
        label: TECHNOLOGY_LABELS[technology] || technology,
        share: shareValue,
        robot: candidate.robot,
        score: candidate.score,
        indicativeUnits: Math.max(1, Math.ceil((robotsRequired * shareValue) / 100))
      };
    })
    .sort((a, b) => b.share - a.share);
  return entries;
}

function modelScenario(state) {
  const process = getProcess(state);
  const params = getParams(state);
  const region = getRegion(state);
  const ranked = rankedRobots(state);
  const selected = selectedRobotResult(state);
  const robot = selected.robot;

  const annualVolume = params.volumePerShift * 250 * (params.operatingShiftsDay || 1) * (params.peakFactor || 1);
  const laborCostHour = fullyLoadedLaborCostPerHour(region);
  const annualCostPerFte = annualFteCost(region, params.shiftHours);
  const manualCycleSec = calculateManualCycle(process, params);
  const robotCycleSec = calculateRobotCycle(process, params, selected);
  const manualJobsPerHour = 3600 / manualCycleSec;
  const robotJobsPerHour = 3600 / robotCycleSec;
  const manualHoursPerShift = (params.volumePerShift * manualCycleSec) / 3600;
  const manualFte = manualHoursPerShift / (params.shiftHours * (params.humanUtilization / 100));
  const robotJobsPerShift = robotJobsPerHour * params.shiftHours * (params.robotUtilization / 100);
  const robotsRequiredRaw = params.volumePerShift / Math.max(1, robotJobsPerShift);
  const robotsRequired = Math.max(1, Math.ceil(robotsRequiredRaw));
  const robotCoveredVolume = Math.min(params.volumePerShift, robotsRequired * robotJobsPerShift);
  const exceptionResidual = clamp((params.exceptionRate || 7) / 100, 0.03, 0.35);
  const robotAssistHumanFte = manualFte * process.robot.assistLaborRatio;
  const residualExceptionFte = manualFte * clamp((params.variability - 40) / 235 + exceptionResidual * 0.38, 0.06, 0.32);
  const assistedFte = Math.max(robotAssistHumanFte + residualExceptionFte, manualFte * 0.08);
  const fteOffset = Math.max(0, manualFte - assistedFte);
  const annualLaborAvoided = fteOffset * annualCostPerFte * (params.operatingShiftsDay || 1);
  const monthlyRobotCost = robotMonthlyCost(robot, state.commercialModel);
  const annualRobotCost = robotsRequired * monthlyRobotCost * 12;
  const annualCloudCost = params.cloudCostMonthly * 12;
  const annualMaintenanceReserve = state.commercialModel === "purchase" ? robotsRequired * robot.purchaseUsd * 0.08 : robotsRequired * monthlyRobotCost * 12 * 0.06;
  const annualProgramCost = annualRobotCost + annualCloudCost + annualMaintenanceReserve;
  const netAnnualSavings = annualLaborAvoided - annualProgramCost;
  const startupCapex = state.commercialModel === "purchase"
    ? params.integrationCapex + (robotsRequired * robot.purchaseUsd)
    : params.integrationCapex;
  const paybackYears = netAnnualSavings > 0 ? startupCapex / netAnnualSavings : Infinity;
  const roi = annualProgramCost > 0 ? (netAnnualSavings / annualProgramCost) * 100 : 0;
  const serviceLevelDelta = calculateServiceLevelDelta(process, params, selected);
  const projectedServiceLevel = clamp(params.targetServiceLevel + serviceLevelDelta, 82, 99.8);
  const errorReduction = clamp(((process.manual.errorRate - process.robot.errorRate) / Math.max(0.1, process.manual.errorRate)) * 100, 0, 90);
  const throughputGain = clamp(((manualCycleSec - robotCycleSec) / manualCycleSec) * 100, -40, 65);
  const safetyImprovement = clamp(params.ergonomicsRisk * 0.42 + selected.robot.capabilities.safety * 0.12, 0, 70);
  const confidence = calculateConfidence(selected, process, params, roi, paybackYears);
  const decision = decisionSignal(confidence, netAnnualSavings, paybackYears, process, selected);
  const annualNpv3Year = simpleNpv(netAnnualSavings, startupCapex, 0.1, 3);
  const automationMix = buildAutomationMix(ranked, process, robotsRequired);

  return {
    state,
    process,
    params,
    region,
    ranked,
    selected,
    robot,
    annualVolume,
    laborCostHour,
    annualCostPerFte,
    manualCycleSec,
    robotCycleSec,
    manualJobsPerHour,
    robotJobsPerHour,
    manualFte,
    assistedFte,
    fteOffset,
    robotsRequiredRaw,
    robotsRequired,
    robotCoveredVolume,
    annualLaborAvoided,
    monthlyRobotCost,
    annualRobotCost,
    annualCloudCost,
    annualMaintenanceReserve,
    annualProgramCost,
    netAnnualSavings,
    startupCapex,
    paybackYears,
    roi,
    projectedServiceLevel,
    errorReduction,
    throughputGain,
    safetyImprovement,
    confidence,
    decision,
    annualNpv3Year,
    automationMix
  };
}

function calculateManualCycle(process, params) {
  const travel = params.travelMeters * 0.38;
  const complexity = (params.complexity - 50) * 0.24;
  const variability = (params.variability - 50) * 0.18;
  const payload = Math.max(0, params.avgPayloadKg - 8) * 0.85;
  const peak = ((params.peakFactor || 1.2) - 1.2) * 6;
  const exception = ((params.exceptionRate || 7) - 7) * 0.35;
  const standardization = (60 - (params.processStandardization || 60)) * 0.08;
  return Math.max(4, process.manual.baseCycleSec + travel * 0.18 + complexity + variability + payload + peak + exception + standardization);
}

function calculateRobotCycle(process, params, selected) {
  const robot = selected.robot;
  const base = process.robot.baseCycleSec;
  const maturity = (selected.score - 60) * 0.3;
  const speedAdj = (robot.capabilities.speed - 65) * 0.17;
  const autonomyAdj = (robot.capabilities.autonomy - params.autonomyTarget) * 0.11;
  const variabilityPenalty = Math.max(0, params.variability - robot.capabilities.vision) * 0.34;
  const payloadPenalty = robot.payloadKg < params.avgPayloadKg ? (params.avgPayloadKg - robot.payloadKg) * 2.1 : 0;
  const travelPenalty = robot.speedMps > 0 ? params.travelMeters / Math.max(0.3, robot.speedMps) * 0.08 : params.travelMeters * 0.03;
  const exceptionPenalty = (params.exceptionRate || 7) * 0.18;
  const integrationPenalty = Math.max(0, 65 - (params.wmsIntegration || 65)) * 0.12;
  const layoutPenalty = Math.max(0, 60 - (params.layoutReadiness || 60)) * 0.14;
  const cycle = base + travelPenalty + variabilityPenalty + payloadPenalty + exceptionPenalty + integrationPenalty + layoutPenalty - maturity - speedAdj - autonomyAdj;
  return Math.max(3, cycle);
}

function calculateServiceLevelDelta(process, params, selected) {
  const robot = selected.robot;
  const vision = (robot.capabilities.vision - process.requirements.vision) * 0.025;
  const api = (robot.capabilities.api - 70) * 0.018;
  const error = (process.manual.errorRate - process.robot.errorRate) * 0.4;
  const variabilityRisk = Math.max(0, params.variability - robot.capabilities.autonomy) * -0.025;
  const integration = ((params.wmsIntegration || 70) - 70) * 0.012;
  const exception = (params.exceptionRate || 7) > 15 ? -0.4 : 0;
  return vision + api + error + variabilityRisk + integration + exception;
}

function calculateConfidence(selected, process, params, roi, paybackYears) {
  const technical = selected.score;
  const economic = clamp(50 + roi * 0.24 - (Number.isFinite(paybackYears) ? paybackYears * 3.8 : 28), 0, 100);
  const processFit = process.pilotFit.includes("High") ? 85 : process.pilotFit.includes("Medium") ? 70 : process.pilotFit.includes("Specialist") ? 64 : 58;
  const capexLight = params.integrationCapex < 700000 ? 82 : 65;
  const readiness = ((params.layoutReadiness || 65) + (params.wmsIntegration || 65) + (params.processStandardization || 60)) / 3;
  return clamp(technical * 0.34 + economic * 0.28 + processFit * 0.18 + capexLight * 0.08 + readiness * 0.12, 0, 99);
}

function decisionSignal(confidence, netAnnualSavings, paybackYears, process, selected) {
  if (netAnnualSavings < 0) {
    return {
      title: "Hold - economics not ready",
      tone: "risk",
      text: "The scenario does not yet generate positive annual savings. Reduce integration cost, improve utilization, use RaaS, or choose a more suitable process/technology mix."
    };
  }
  if (confidence >= 75 && paybackYears <= 2.5) {
    return {
      title: "Phase 1 Go - hybrid workforce pilot",
      tone: "go",
      text: `${selected.robot.name} is a credible primary option for ${process.name}. Start with CapEx-light pricing, a small controlled pilot, and KPI-linked OEM service levels.`
    };
  }
  if (process.pilotFit.includes("Specialist") && selected.robot.technology === "humanoid") {
    return {
      title: "Redirect - specialist robot first",
      tone: "watch",
      text: "This process is physically demanding or high-throughput. Use humanoids only for exception handling; evaluate specialist robotics for the core flow."
    };
  }
  return {
    title: "Pilot with guardrails",
    tone: "watch",
    text: "The process has strategic potential, but the pilot must prove cycle time, safety, uptime, WMS integration, and service economics before scaling."
  };
}

function simpleNpv(netAnnualSavings, startupCapex, discountRate, years) {
  let npv = -startupCapex;
  for (let year = 1; year <= years; year += 1) {
    npv += netAnnualSavings / Math.pow(1 + discountRate, year);
  }
  return npv;
}

function buildGuardrails(model) {
  const process = model.process;
  const params = model.params;
  const guardrails = [];

  if (params.avgPayloadKg > 18 && !["robotic-forklift", "amr", "robotic-arm", "warehouse-specialist"].includes(model.robot.technology)) {
    guardrails.push({
      title: "Payload risk",
      text: "Average payload is above many humanoid comfort zones. Consider robotic forklifts, AMRs, palletizing cells, lift-assist equipment, or engineered workstations."
    });
  }
  if (params.variability > 72 || (params.exceptionRate || 0) > 15) {
    guardrails.push({
      title: "High variability / exception rate",
      text: "Variable SKUs, packaging, and exception logic increase autonomy risk. Use human-in-the-loop controls until exception rates stabilize."
    });
  }
  if (process.pilotFit.includes("Specialist")) {
    guardrails.push({
      title: "Specialist automation may win",
      text: "This process may produce better ROI with purpose-built warehouse robotics. Keep humanoids for exceptions or flexible support."
    });
  }
  if ((params.layoutReadiness || 65) < 50) {
    guardrails.push({
      title: "Layout readiness gap",
      text: "Low layout readiness increases commissioning effort. Validate aisle width, floor condition, traffic rules, charging, Wi-Fi/5G, and safety zones."
    });
  }
  if ((params.wmsIntegration || 65) < 55) {
    guardrails.push({
      title: "Integration risk",
      text: "WMS/WES integration readiness is low. Start with a read-only telemetry pilot or limited task interface before closed-loop orchestration."
    });
  }
  if (model.paybackYears > 3 || model.netAnnualSavings < 0) {
    guardrails.push({
      title: "Commercial model needs redesign",
      text: "Use RaaS or performance-linked leasing, reduce custom integration, increase volume density, or move the pilot to a higher-cost labor region."
    });
  }
  if (guardrails.length === 0) {
    guardrails.push({
      title: "Good pilot candidate",
      text: "The scenario has a reasonable balance of process repeatability, labor cost, task fit, and CapEx-light deployment potential."
    });
  }
  return guardrails;
}

function exportState(state) {
  const payload = {
    version: "2.0",
    exportedAt: new Date().toISOString(),
    state
  };
  return JSON.stringify(payload, null, 2);
}

function normalizeImportedState(payload) {
  const next = payload.state || payload;
  if (!next.processId || !next.regionId) throw new Error("Invalid scenario file.");
  return {
    processId: next.processId,
    regionId: next.regionId,
    commercialModel: next.commercialModel || "raas",
    scenarioName: next.scenarioName || "Imported scenario",
    params: next.params || {},
    selectedRobotId: next.selectedRobotId || null,
    customProcess: next.customProcess || undefined,
    uploadedAssets: next.uploadedAssets || []
  };
}

/* ===== src-modules/simulation3d.js ===== */
const COLORS = {
  stageTop: "#07101f",
  stageBottom: "#111827",
  floorA: "#202a3d",
  floorB: "#121a2b",
  floorLine: "rgba(150, 180, 220, 0.16)",
  rackFace: "#5e718c",
  rackSide: "#37465f",
  rackTop: "#9fb4cf",
  steel: "#c9d6e5",
  steelDark: "#55657b",
  glass: "#6ed7ff",
  robot: "#ef2f73",
  robotGlow: "rgba(239, 47, 115, 0.45)",
  human: "#38bdf8",
  humanGlow: "rgba(56, 189, 248, 0.38)",
  green: "#23c487",
  amber: "#f7c948",
  navy: "#0b1020",
  text: "#eaf2ff",
  muted: "#9fb0c8",
  blue: "#3c6df0"
};

const ZONES = [
  { name: "Receiving", x: 5, y: 7, w: 24, d: 18, color: "rgba(56,189,248,0.18)" },
  { name: "Reserve storage", x: 34, y: 10, w: 36, d: 44, color: "rgba(35,196,135,0.14)" },
  { name: "Pick module", x: 75, y: 12, w: 21, d: 25, color: "rgba(239,47,115,0.16)" },
  { name: "Pack / VAS", x: 76, y: 42, w: 22, d: 17, color: "rgba(247,201,72,0.16)" },
  { name: "Outbound", x: 48, y: 58, w: 45, d: 13, color: "rgba(60,109,240,0.16)" }
];

const DEFAULT_PATHS = {
  "case-picking": [{ x: 15, y: 15 }, { x: 42, y: 20 }, { x: 63, y: 30 }, { x: 83, y: 24 }, { x: 83, y: 48 }, { x: 64, y: 63 }],
  "inbound-receiving": [{ x: 10, y: 14 }, { x: 18, y: 20 }, { x: 34, y: 26 }, { x: 52, y: 26 }, { x: 56, y: 50 }],
  "putaway": [{ x: 12, y: 18 }, { x: 28, y: 24 }, { x: 46, y: 18 }, { x: 64, y: 20 }, { x: 68, y: 48 }],
  "piece-picking": [{ x: 20, y: 18 }, { x: 42, y: 16 }, { x: 64, y: 18 }, { x: 82, y: 24 }, { x: 86, y: 50 }, { x: 72, y: 64 }],
  "g2p-replenishment": [{ x: 14, y: 18 }, { x: 30, y: 18 }, { x: 48, y: 34 }, { x: 68, y: 44 }, { x: 86, y: 48 }],
  "container-unloading": [{ x: 6, y: 10 }, { x: 13, y: 16 }, { x: 22, y: 18 }, { x: 34, y: 20 }, { x: 48, y: 23 }],
  "inventory-count": [{ x: 16, y: 14 }, { x: 34, y: 12 }, { x: 66, y: 14 }, { x: 66, y: 48 }, { x: 34, y: 50 }, { x: 20, y: 62 }],
  "returns-processing": [{ x: 54, y: 64 }, { x: 76, y: 52 }, { x: 85, y: 45 }, { x: 78, y: 28 }, { x: 54, y: 24 }],
  "packing-qc": [{ x: 78, y: 48 }, { x: 86, y: 48 }, { x: 88, y: 56 }, { x: 66, y: 64 }, { x: 50, y: 62 }],
  "cross-dock-sort": [{ x: 12, y: 18 }, { x: 32, y: 32 }, { x: 52, y: 48 }, { x: 70, y: 60 }, { x: 86, y: 62 }],
  "truck-loading": [{ x: 58, y: 48 }, { x: 66, y: 58 }, { x: 78, y: 64 }, { x: 88, y: 70 }, { x: 96, y: 69 }],
  "palletizing": [{ x: 70, y: 54 }, { x: 80, y: 50 }, { x: 88, y: 58 }, { x: 68, y: 64 }, { x: 52, y: 62 }],
  "pallet-movement": [{ x: 8, y: 18 }, { x: 24, y: 28 }, { x: 42, y: 42 }, { x: 66, y: 56 }, { x: 88, y: 66 }],
  "kitting-vas": [{ x: 76, y: 44 }, { x: 82, y: 42 }, { x: 84, y: 54 }, { x: 74, y: 62 }, { x: 54, y: 62 }],
  "sorter-induction": [{ x: 22, y: 56 }, { x: 38, y: 58 }, { x: 56, y: 60 }, { x: 74, y: 62 }, { x: 92, y: 62 }],
  "yard-dock-inspection": [{ x: 8, y: 8 }, { x: 8, y: 24 }, { x: 22, y: 42 }, { x: 52, y: 66 }, { x: 92, y: 69 }]
};

class WarehouseSimulation {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.model = null;
    this.running = false;
    this.elapsed = 0;
    this.lastTime = null;
    this.speed = 1;
    this.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  setModel(model) {
    this.model = model;
    this.reset(false);
    this.render();
  }

  setSpeed(value) {
    this.speed = Number(value) || 1;
  }

  play() { this.running = true; }
  pause() { this.running = false; }

  reset(stop = true) {
    this.elapsed = 0;
    this.lastTime = null;
    if (stop) this.running = false;
    this.render();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(760, Math.floor(rect.width || this.canvas.width));
    const height = Math.max(620, Math.floor(rect.height || this.canvas.height));
    this.canvas.width = Math.floor(width * this.dpr);
    this.canvas.height = Math.floor(height * this.dpr);
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.width = width;
    this.height = height;
    this.scale = Math.min(width / 150, height / 98);
    this.originX = width * 0.5;
    this.originY = height * 0.1;
    this.render();
  }

  loop(timestamp) {
    if (this.running) {
      if (!this.lastTime) this.lastTime = timestamp;
      const dt = Math.min(0.05, (timestamp - this.lastTime) / 1000);
      this.elapsed += dt * this.speed;
      this.lastTime = timestamp;
      this.render();
    } else {
      this.lastTime = timestamp;
    }
    requestAnimationFrame(this.loop);
  }

  get path() {
    if (!this.model) return DEFAULT_PATHS["case-picking"];
    return this.model.process.layoutPath || DEFAULT_PATHS[this.model.process.id] || DEFAULT_PATHS["case-picking"];
  }

  currentStep(progress) {
    if (!this.model) return 0;
    const steps = this.model.process.steps.length;
    return Math.min(steps - 1, Math.floor(progress * steps));
  }

  currentTelemetry() {
    if (!this.model) return null;
    const ratio = Math.max(0.35, this.model.manualCycleSec / Math.max(1, this.model.robotCycleSec));
    const robotProgress = (this.elapsed / 22 * ratio) % 1;
    const humanProgress = (this.elapsed / 22) % 1;
    return { robotProgress, humanProgress, activeStep: this.currentStep(robotProgress) };
  }

  project(point) {
    const x = point.x;
    const y = point.y;
    const z = point.z || 0;
    return {
      x: this.originX + (x - y) * this.scale,
      y: this.originY + (x + y) * this.scale * 0.52 - z * this.scale * 0.92
    };
  }

  render() {
    const ctx = this.ctx;
    if (!ctx || !this.width || !this.height) return;
    ctx.clearRect(0, 0, this.width, this.height);
    this.drawBackground();
    this.drawFloor();
    this.drawZones();
    this.drawRacks();
    this.drawDocksAndTrucks();
    this.drawConveyorsAndCells();
    this.drawPaths();
    this.drawActors();
    this.drawFloatingKpis();
    this.drawSceneTitle();
  }

  drawBackground() {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, COLORS.stageTop);
    gradient.addColorStop(0.62, "#0e1828");
    gradient.addColorStop(1, COLORS.stageBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const glow1 = ctx.createRadialGradient(this.width * 0.18, this.height * 0.1, 0, this.width * 0.18, this.height * 0.1, this.width * 0.38);
    glow1.addColorStop(0, "rgba(43,194,255,0.32)");
    glow1.addColorStop(1, "rgba(43,194,255,0)");
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, this.width, this.height);
    const glow2 = ctx.createRadialGradient(this.width * 0.82, this.height * 0.18, 0, this.width * 0.82, this.height * 0.18, this.width * 0.32);
    glow2.addColorStop(0, "rgba(239,47,115,0.28)");
    glow2.addColorStop(1, "rgba(239,47,115,0)");
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();
  }

  drawFloor() {
    const ctx = this.ctx;
    const corners = [
      this.project({ x: 0, y: 0, z: 0 }),
      this.project({ x: 105, y: 0, z: 0 }),
      this.project({ x: 105, y: 75, z: 0 }),
      this.project({ x: 0, y: 75, z: 0 })
    ];
    ctx.save();
    ctx.beginPath();
    corners.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.closePath();
    const floorGrad = ctx.createLinearGradient(this.width * 0.22, this.height * 0.2, this.width * 0.8, this.height * 0.92);
    floorGrad.addColorStop(0, COLORS.floorA);
    floorGrad.addColorStop(1, COLORS.floorB);
    ctx.fillStyle = floorGrad;
    ctx.strokeStyle = "rgba(230,240,255,0.18)";
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = COLORS.floorLine;
    ctx.lineWidth = 1;
    for (let x = 0; x <= 105; x += 5) {
      const p1 = this.project({ x, y: 0 });
      const p2 = this.project({ x, y: 75 });
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    for (let y = 0; y <= 75; y += 5) {
      const p1 = this.project({ x: 0, y });
      const p2 = this.project({ x: 105, y });
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    this.drawAisleLighting();
    ctx.restore();
  }

  drawAisleLighting() {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 5; i += 1) {
      const x = 34 + i * 14;
      const p1 = this.project({ x, y: 6, z: 0.02 });
      const p2 = this.project({ x, y: 70, z: 0.02 });
      const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
      gradient.addColorStop(0, "rgba(43,194,255,0.02)");
      gradient.addColorStop(0.5, "rgba(43,194,255,0.12)");
      gradient.addColorStop(1, "rgba(43,194,255,0.02)");
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawZones() {
    ZONES.forEach(zone => this.drawIsoZone(zone.x, zone.y, zone.w, zone.d, zone.color, zone.name));
  }

  drawIsoZone(x, y, w, d, fill, label) {
    const ctx = this.ctx;
    const points = [this.project({ x, y }), this.project({ x: x + w, y }), this.project({ x: x + w, y: y + d }), this.project({ x, y: y + d })];
    ctx.save();
    ctx.beginPath();
    points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = "rgba(220,235,255,0.16)";
    ctx.stroke();
    const center = this.project({ x: x + w / 2, y: y + d / 2, z: 0.2 });
    ctx.fillStyle = "rgba(234,242,255,0.85)";
    ctx.font = "800 12px Inter, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, center.x, center.y + 4);
    ctx.restore();
  }

  drawRacks() {
    const rackRows = [13, 23, 33, 43];
    rackRows.forEach((y, row) => {
      for (let x = 36; x <= 64; x += 10) {
        const height = 8 + (row % 2) * 1.2;
        this.drawRack(x, y, 7.2, 3.1, height, row);
      }
    });
    for (let x = 78; x <= 91; x += 6) this.drawCuboid(x, 18, 4.6, 12, 4.2, "#85465e", "#63354a", "#d7799c", true);
  }

  drawRack(x, y, w, d, h, row) {
    this.drawCuboid(x, y, w, d, h, COLORS.rackFace, COLORS.rackSide, COLORS.rackTop, true);
    for (let level = 1.8; level < h; level += 1.9) {
      const a = this.project({ x, y: y + d, z: level });
      const b = this.project({ x: x + w, y: y + d, z: level });
      this.ctx.save();
      this.ctx.strokeStyle = "rgba(255,255,255,0.22)";
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(a.x, a.y);
      this.ctx.lineTo(b.x, b.y);
      this.ctx.stroke();
      this.ctx.restore();
    }
    if ((x + y + row) % 3 === 0) this.drawPallet(x + 1, y + 0.5, 0.2);
  }

  drawDocksAndTrucks() {
    for (let y = 7; y <= 23; y += 7) {
      this.drawCuboid(0, y, 4, 5, 3.2, "#4b5b72", "#2e3b50", "#91a4bf", true);
      this.drawTruck(-8, y - 0.4, 8, 6);
    }
    for (let x = 50; x <= 86; x += 12) {
      this.drawCuboid(x, 70, 8, 3, 2.2, "#4d617c", "#304057", "#9fb4cf", true);
    }
  }

  drawTruck(x, y, w, d) {
    this.drawCuboid(x, y, w, d, 4.5, "#243249", "#152037", "#52647e", true);
  }

  drawConveyorsAndCells() {
    for (let i = 0; i < 4; i += 1) this.drawCuboid(58 + i * 8, 60, 6, 2.4, 1.1, "#708197", "#526177", "#c7d2e1", true);
    this.drawCuboid(82, 50, 9, 5, 1.5, "#293a54", "#1b293e", "#64748b", true);
    this.drawRobotArmCell(84, 51, 1.6);
  }

  drawRobotArmCell(x, y, z) {
    const ctx = this.ctx;
    const base = this.project({ x, y, z });
    const elbow = this.project({ x: x + 1.8, y: y - 0.8, z: z + 3.5 });
    const wrist = this.project({ x: x + 4.2, y: y - 0.4, z: z + 5.0 });
    ctx.save();
    ctx.strokeStyle = "#dce8f5";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(elbow.x, elbow.y);
    ctx.lineTo(wrist.x, wrist.y);
    ctx.stroke();
    ctx.fillStyle = COLORS.glass;
    [base, elbow, wrist].forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill(); });
    ctx.restore();
  }

  drawCuboid(x, y, w, d, h, face, side, top, shadow = false) {
    const ctx = this.ctx;
    const p000 = this.project({ x, y, z: 0 });
    const p100 = this.project({ x: x + w, y, z: 0 });
    const p110 = this.project({ x: x + w, y: y + d, z: 0 });
    const p010 = this.project({ x, y: y + d, z: 0 });
    const p001 = this.project({ x, y, z: h });
    const p101 = this.project({ x: x + w, y, z: h });
    const p111 = this.project({ x: x + w, y: y + d, z: h });
    const p011 = this.project({ x, y: y + d, z: h });

    ctx.save();
    if (shadow) {
      ctx.globalAlpha = 0.22;
      this.fillPoly([p000, p100, p110, p010], "#000000");
      ctx.globalAlpha = 1;
    }
    this.fillPoly([p010, p110, p111, p011], side);
    this.fillPoly([p100, p110, p111, p101], face);
    this.fillPoly([p001, p101, p111, p011], top);
    ctx.strokeStyle = "rgba(235,245,255,0.16)";
    ctx.lineWidth = 1;
    [[p010, p110, p111, p011], [p100, p110, p111, p101], [p001, p101, p111, p011]].forEach(poly => this.strokePoly(poly));
    ctx.restore();
  }

  fillPoly(points, fill) {
    const ctx = this.ctx;
    ctx.beginPath();
    points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  strokePoly(points) {
    const ctx = this.ctx;
    ctx.beginPath();
    points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.closePath();
    ctx.stroke();
  }

  drawPaths() {
    const ctx = this.ctx;
    const path = this.path;
    const robotPath = path.map(p => this.project({ x: p.x, y: p.y, z: 0.18 }));
    const humanPath = path.map(p => this.project({ x: p.x - 3, y: p.y + 2, z: 0.18 }));
    this.drawPathLine(humanPath, COLORS.human, 0.34, 5);
    this.drawPathLine(robotPath, COLORS.robot, 0.78, 7);

    const telemetry = this.currentTelemetry();
    const activeIndex = telemetry ? telemetry.activeStep : 0;
    path.forEach((p, idx) => {
      const projected = this.project({ x: p.x, y: p.y, z: 0.5 });
      ctx.save();
      ctx.shadowColor = idx === activeIndex ? COLORS.green : "rgba(255,255,255,0.25)";
      ctx.shadowBlur = idx === activeIndex ? 20 : 8;
      ctx.beginPath();
      ctx.arc(projected.x, projected.y, idx === activeIndex ? 9 : 5, 0, Math.PI * 2);
      ctx.fillStyle = idx === activeIndex ? COLORS.green : "rgba(255,255,255,0.95)";
      ctx.strokeStyle = idx === activeIndex ? "#eafff6" : "rgba(220,235,255,0.5)";
      ctx.lineWidth = idx === activeIndex ? 3 : 1.5;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });
  }

  drawPathLine(points, color, alpha, width) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.stroke();
    ctx.restore();
  }

  drawActors() {
    const telemetry = this.currentTelemetry() || { robotProgress: 0, humanProgress: 0 };
    const robotPos = this.interpolatePath(this.path, telemetry.robotProgress);
    const humanPos = this.interpolatePath(this.path.map(p => ({ x: p.x - 3, y: p.y + 2 })), telemetry.humanProgress);
    this.drawShadow(robotPos.x, robotPos.y, 4.4, COLORS.robotGlow);
    this.drawShadow(humanPos.x, humanPos.y, 3.4, COLORS.humanGlow);
    this.drawHumanAvatar(humanPos.x, humanPos.y, "Manual worker");
    this.drawRobotAvatar(robotPos.x, robotPos.y, this.model?.robot?.technology || "humanoid");
    if ((this.model?.robot?.technology || "humanoid") === "amr") this.drawPallet(robotPos.x + 1.8, robotPos.y - 1.1, 1.6);
    else this.drawCarton(robotPos.x + 1.6, robotPos.y - 0.6, 2.2);
  }

  interpolatePath(path, progress) {
    if (!path.length) return { x: 0, y: 0 };
    const p = (progress % 1) * (path.length - 1);
    const i = Math.floor(p);
    const t = p - i;
    const a = path[i];
    const b = path[Math.min(path.length - 1, i + 1)];
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  drawShadow(x, y, r, color) {
    const ctx = this.ctx;
    const p = this.project({ x, y, z: 0.05 });
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 4, r * this.scale * 0.75, r * this.scale * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawHumanAvatar(x, y, label) {
    const ctx = this.ctx;
    const foot = this.project({ x, y, z: 0 });
    const hip = this.project({ x, y, z: 3.2 });
    const chest = this.project({ x, y, z: 6.0 });
    const head = this.project({ x, y, z: 7.8 });
    const sway = Math.sin(this.elapsed * 6) * 3.2;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(hip.x, hip.y);
    ctx.lineTo(foot.x - 5 + sway, foot.y + 8);
    ctx.moveTo(hip.x, hip.y);
    ctx.lineTo(foot.x + 5 - sway, foot.y + 8);
    ctx.stroke();

    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(chest.x, chest.y + 3);
    ctx.lineTo(chest.x - 11, chest.y + 18 + sway * 0.5);
    ctx.moveTo(chest.x, chest.y + 3);
    ctx.lineTo(chest.x + 12, chest.y + 17 - sway * 0.5);
    ctx.stroke();

    const vest = ctx.createLinearGradient(chest.x - 16, chest.y, chest.x + 16, hip.y + 20);
    vest.addColorStop(0, "#38bdf8");
    vest.addColorStop(1, "#1d4ed8");
    ctx.fillStyle = vest;
    roundedRect(ctx, chest.x - 11, chest.y - 1, 22, hip.y - chest.y + 11, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(head.x, head.y, 9.5, 0, Math.PI * 2);
    ctx.fillStyle = "#d6b08d";
    ctx.fill();
    ctx.strokeStyle = "#f7c948";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "rgba(234,242,255,0.88)";
    ctx.font = "800 11px Inter, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, head.x, head.y - 16);
    ctx.restore();
  }

  drawRobotAvatar(x, y, technology) {
    if (["amr", "robotic-forklift", "vision"].includes(technology)) return this.drawMobileRobot(x, y, technology);
    if (["robotic-arm", "warehouse-specialist"].includes(technology)) return this.drawMobileManipulator(x, y, technology);
    return this.drawMetalHumanoid(x, y);
  }

  drawMetalHumanoid(x, y) {
    const ctx = this.ctx;
    const foot = this.project({ x, y, z: 0 });
    const hip = this.project({ x, y, z: 3.5 });
    const chest = this.project({ x, y, z: 6.5 });
    const head = this.project({ x, y, z: 8.25 });
    const sway = Math.sin(this.elapsed * 6.5) * 3.8;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = COLORS.robotGlow;
    ctx.shadowBlur = 18;

    ctx.strokeStyle = COLORS.steel;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(hip.x, hip.y);
    ctx.lineTo(foot.x - 6 + sway, foot.y + 8);
    ctx.moveTo(hip.x, hip.y);
    ctx.lineTo(foot.x + 6 - sway, foot.y + 8);
    ctx.stroke();

    ctx.strokeStyle = "#e8f1fb";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(chest.x, chest.y + 3);
    ctx.lineTo(chest.x - 12, chest.y + 19 + sway * 0.5);
    ctx.moveTo(chest.x, chest.y + 3);
    ctx.lineTo(chest.x + 14, chest.y + 18 - sway * 0.5);
    ctx.stroke();

    const bodyGradient = ctx.createLinearGradient(chest.x - 18, chest.y - 10, chest.x + 18, hip.y + 18);
    bodyGradient.addColorStop(0, "#f8fbff");
    bodyGradient.addColorStop(0.45, "#cbd5e1");
    bodyGradient.addColorStop(1, "#64748b");
    ctx.fillStyle = bodyGradient;
    ctx.strokeStyle = COLORS.robot;
    ctx.lineWidth = 1.7;
    roundedRect(ctx, chest.x - 13, chest.y - 2, 26, hip.y - chest.y + 12, 8);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(head.x, head.y, 11, 0, Math.PI * 2);
    ctx.fillStyle = "#e5edf7";
    ctx.fill();
    ctx.strokeStyle = COLORS.robot;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#07101f";
    roundedRect(ctx, head.x - 8, head.y - 3, 16, 6, 3);
    ctx.fill();
    ctx.fillStyle = COLORS.robot;
    ctx.beginPath();
    ctx.arc(head.x - 4, head.y, 1.8, 0, Math.PI * 2);
    ctx.arc(head.x + 4, head.y, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(234,242,255,0.92)";
    ctx.font = "800 11px Inter, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Hybrid robot", head.x, head.y - 18);
    ctx.restore();
  }

  drawMobileRobot(x, y, technology) {
    const label = technology === "robotic-forklift" ? "Auto forklift" : technology === "vision" ? "Vision robot" : "AMR";
    this.drawCuboid(x - 2.5, y - 1.8, 5, 3.6, 1.4, "#4f46e5", "#312e81", "#93c5fd", true);
    if (technology === "robotic-forklift") {
      this.drawCuboid(x + 2.2, y - 1.6, 0.5, 3.4, 4.2, "#e2e8f0", "#94a3b8", "#f8fafc", false);
      this.drawCuboid(x + 2.7, y - 1.8, 3.5, 0.4, 0.25, "#e2e8f0", "#94a3b8", "#f8fafc", false);
    }
    if (technology === "vision") this.drawCuboid(x - 0.4, y - 0.4, 0.8, 0.8, 5.2, "#e2e8f0", "#94a3b8", "#f8fafc", false);
    const p = this.project({ x, y, z: 3.2 });
    this.ctx.save();
    this.ctx.fillStyle = "rgba(234,242,255,0.92)";
    this.ctx.font = "800 11px Inter, Segoe UI, sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.fillText(label, p.x, p.y - 10);
    this.ctx.restore();
  }

  drawMobileManipulator(x, y, technology) {
    this.drawCuboid(x - 2.8, y - 1.8, 5.6, 3.6, 1.6, "#27364e", "#162033", "#6b7d98", true);
    this.drawRobotArmCell(x, y, 1.6);
    const p = this.project({ x, y, z: 6.2 });
    this.ctx.save();
    this.ctx.fillStyle = "rgba(234,242,255,0.92)";
    this.ctx.font = "800 11px Inter, Segoe UI, sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.fillText(technology === "warehouse-specialist" ? "Case robot" : "Robot arm", p.x, p.y - 10);
    this.ctx.restore();
  }

  drawPallet(x, y, z) {
    this.drawCuboid(x, y, 4.6, 3.2, 0.55, "#8a5a2b", "#5b3a1d", "#d6a05d", true);
    this.drawCuboid(x + 0.3, y + 0.25, 4, 2.6, 1.8, "#a87946", "#7b5432", "#e5b678", true);
  }

  drawCarton(x, y, z) {
    this.drawCuboid(x, y, 3.2, 2.4, 2.2, "#c68642", "#8f5728", "#ffd18a", true);
  }

  drawFloatingKpis() {
    if (!this.model) return;
    const ctx = this.ctx;
    const cards = [
      { label: "Primary units", value: this.model.robotsRequired.toFixed(0), color: COLORS.robot },
      { label: "FTE offset", value: this.model.fteOffset.toFixed(1), color: COLORS.green },
      { label: "ROI", value: `${this.model.roi.toFixed(0)}%`, color: COLORS.blue }
    ];
    ctx.save();
    cards.forEach((card, index) => {
      const x = 24;
      const y = 24 + index * 72;
      ctx.fillStyle = "rgba(7, 16, 31, 0.74)";
      ctx.strokeStyle = "rgba(230,240,255,0.16)";
      ctx.lineWidth = 1;
      roundedRect(ctx, x, y, 182, 58, 18);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = card.color;
      ctx.shadowColor = card.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(x + 20, y + 29, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = COLORS.text;
      ctx.font = "900 18px Inter, Segoe UI, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(card.value, x + 38, y + 28);
      ctx.fillStyle = COLORS.muted;
      ctx.font = "700 11px Inter, Segoe UI, sans-serif";
      ctx.fillText(card.label, x + 38, y + 44);
    });
    ctx.restore();
  }

  drawSceneTitle() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(7,16,31,0.68)";
    roundedRect(ctx, this.width - 270, 22, 244, 58, 18);
    ctx.fill();
    ctx.strokeStyle = "rgba(230,240,255,0.16)";
    ctx.stroke();
    ctx.fillStyle = COLORS.text;
    ctx.font = "900 13px Inter, Segoe UI, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Omniverse-style digital twin", this.width - 248, 45);
    ctx.fillStyle = COLORS.muted;
    ctx.font = "700 11px Inter, Segoe UI, sans-serif";
    ctx.fillText("Offline canvas rendering - no external 3D engine", this.width - 248, 63);
    ctx.restore();
  }
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

/* ===== src-modules/assistant.js ===== */

function answerQuestion(question, model) {
  const q = question.toLowerCase();
  const top = model.selected.robot;
  const guardrails = buildGuardrails(model);
  const mix = model.automationMix.map(item => `${item.label}: ${item.robot.company}`).join(" | ");

  if (containsAny(q, ["why", "recommend", "top", "selected", "robot", "vendor", "oem"])) {
    return `The current primary recommendation is **${top.name}** because it scores **${model.selected.score.toFixed(0)}/100** against the capability requirements for **${model.process.name}**. This is not a single-robot answer: the suggested hybrid mix is **${mix}**. Treat it as a pilot design and vendor shortlist, not as a procurement decision.`;
  }

  if (containsAny(q, ["mix", "combination", "amr", "forklift", "arm", "vision", "humanoid"])) {
    return `The platform intentionally evaluates a **combination** of technologies. For this process, the recommended mix is: ${model.automationMix.map(item => `**${item.label} ${item.share}%** using ${item.robot.name}`).join(", ")}. This prevents the common mistake of forcing every process into a humanoid use case.`;
  }

  if (containsAny(q, ["capex", "light", "raas", "lease", "commercial"])) {
    return `To keep this CapEx-light, use **RaaS or operating lease** as the default. In the current scenario, startup integration is **${formatCurrency(model.startupCapex)}** and run-rate program cost is **${formatCurrency(model.annualProgramCost)} per year**. DP World should avoid buying a large fleet upfront; require uptime SLAs, service credits, remote monitoring, spare-part commitments, and a clean exit clause after the pilot.`;
  }

  if (containsAny(q, ["roi", "payback", "cost", "savings", "financial", "business case"])) {
    const payback = Number.isFinite(model.paybackYears) ? `${model.paybackYears.toFixed(1)} years` : "not recovered";
    return `The model estimates **${formatCurrency(model.annualLaborAvoided)}** annual gross labor value, **${formatCurrency(model.annualProgramCost)}** annual robot/platform cost, and **${formatCurrency(model.netAnnualSavings)}** net annual savings. ROI is **${percent(model.roi)}** with payback of **${payback}**. The economics improve most when volume density, utilization, wage cost, uptime, and process standardization are high.`;
  }

  if (containsAny(q, ["manual", "compare", "human", "humanoid", "performance", "throughput", "hybrid"])) {
    return `Manual execution needs about **${model.manualFte.toFixed(1)} FTE per shift** in this configuration. The hybrid-assisted design needs about **${model.assistedFte.toFixed(1)} residual human FTE** plus **${model.robotsRequired} primary automation units**, offsetting **${model.fteOffset.toFixed(1)} FTE**. The simulated cycle time changes from **${model.manualCycleSec.toFixed(1)} sec** manual to **${model.robotCycleSec.toFixed(1)} sec** assisted, with an estimated throughput change of **${percent(model.throughputGain)}**.`;
  }

  if (containsAny(q, ["safety", "risk", "guardrail", "compliance"])) {
    const bullets = guardrails.map(item => `**${item.title}:** ${item.text}`).join(" ");
    return `Main guardrails for this scenario: ${bullets} In production, DP World should require site-level risk assessment, safety-rated zones, emergency-stop coverage, ISO/ANSI/OSHA/local compliance review, cybersecurity review, and human-in-the-loop exception procedures.`;
  }

  if (containsAny(q, ["upload", "engineering", "model", "material flow", "process flow", "custom"])) {
    return `Use the Process Configurator to create a custom process and upload engineering files, process flows, layout drawings, material-flow CSVs, or JSON step lists. This offline demo records the file names and can read simple text/JSON step lists. A production version would parse CAD/BIM/material-flow data into the digital twin and calculate travel distances, bottlenecks, and automation constraints automatically.`;
  }

  if (containsAny(q, ["pilot", "where", "site", "location", "processes", "roadmap"])) {
    return `Best pilot candidates are high-cost, high-volume, repeatable 3PL processes with labor shortage or overtime pressure. Strong candidates include inventory scan, packing QC, case picking, AMR replenishment, and robotic forklift pallet movement. For container unloading, palletizing, and sorter induction, specialist robotics should be evaluated first. Start with one site, one process, one integration path, and a 60 to 90 day KPI gate.`;
  }

  if (containsAny(q, ["data", "collect", "before", "requirements", "inputs"])) {
    return `Before deployment, collect: actual cycle time by task, hourly labor cost, overtime and agency labor, absenteeism, SKU dimensions and weight distribution, travel distance, exception reasons, WMS transaction logs, safety incidents, dock/aisle dimensions, Wi-Fi/5G coverage, charging locations, and current supervisor span of control. The quality of this data determines whether the simulation becomes a credible business case.`;
  }

  if (containsAny(q, ["aws", "cloud", "architecture", "integration", "platform"])) {
    return `AWS should be positioned as the cloud, data, digital twin, edge, AI, security, and integration foundation. DP World should own the logistics intelligence layer: process models, capability library, vendor scoring, safety rules, ROI logic, and hybrid workforce orchestration. OEMs should expose APIs for task assignment, telemetry, health, maintenance, safety events, and software versioning.`;
  }

  return `For the current **${model.process.name}** scenario, I would frame the executive message as: use a simulation-first, vendor-neutral **Hybrid Workforce Platform**, deploy through CapEx-light commercial models, prove value with a limited pilot, and scale only when cycle time, safety, uptime, integration, and ROI pass the gate. Current decision signal: **${model.decision.title}**.`;
}

function containsAny(text, tokens) {
  return tokens.some(token => text.includes(token));
}

/* ===== src-modules/app.js ===== */

const state = hydrateInitialState();
let model = modelScenario(state);
let simulation = null;
let telemetryTimer = null;

const VIEW_TITLES = {
  cockpit: "Executive Cockpit",
  process: "Process Configurator",
  simulation: "3D Simulation",
  marketplace: "OEM Marketplace",
  assistant: "AI Advisor",
  architecture: "Four-Layer Architecture"
};

const CAPABILITY_LABELS = {
  lift: "Lifting and carrying",
  mobility: "Mobility in warehouse spaces",
  dexterity: "Dexterous handling",
  vision: "Vision, OCR and scanning",
  endurance: "Shift endurance",
  speed: "Operational speed",
  autonomy: "Autonomy level",
  safety: "Human collaboration safety",
  api: "Integration/API readiness",
  scalability: "Scalability"
};

function hydrateInitialState() {
  const base = structuredClone(DEFAULT_STATE);
  const process = PROCESSES.find(item => item.id === base.processId) || PROCESSES[0];
  base.params = { ...process.defaultParams };
  try {
    const saved = localStorage.getItem("dpworld-hybrid-workforce-state");
    if (saved) {
      const parsed = JSON.parse(saved);
      const normalized = normalizeImportedState(parsed);
      const selectedProcess = normalized.processId === "custom-process"
        ? getProcess({ ...base, ...normalized })
        : PROCESSES.find(item => item.id === normalized.processId) || process;
      return { ...base, ...normalized, params: { ...selectedProcess.defaultParams, ...(normalized.params || {}) } };
    }
  } catch (error) {
    console.warn("Could not load saved state", error);
  }
  return base;
}

function persistState() {
  try {
    localStorage.setItem("dpworld-hybrid-workforce-state", JSON.stringify({ state }));
  } catch (error) {
    console.warn("Local storage unavailable", error);
  }
}

function setState(patch) {
  Object.assign(state, patch);
  if (patch.processId) {
    const process = getProcess(state);
    state.params = { ...process.defaultParams, ...(patch.params || {}) };
    state.selectedRobotId = null;
  }
  model = modelScenario(state);
  persistState();
  renderAll();
}

function init() {
  bindNavigation();
  bindHeroJumps();
  bindScenarioActions();
  bindProcessControls();
  bindMarketplaceControls();
  bindAssistant();
  bindSimulation();
  renderAll();
  addChatMessage("assistant", "I am the DP World Hybrid Workforce Advisor. Configure a process, upload a process/material-flow file, or ask about ROI, CapEx-light deployment, AMRs, robotic forklifts, robotic arms, vision systems, humanoids, safety, pilots, or AWS architecture.");
}

function bindNavigation() {
  document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });
}

function bindHeroJumps() {
  document.querySelectorAll("[data-jump]").forEach(button => {
    button.addEventListener("click", () => showView(button.dataset.jump));
  });
}

function showView(viewId) {
  document.querySelectorAll(".view").forEach(view => view.classList.remove("active-view"));
  document.querySelectorAll(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.view === viewId));
  const view = document.getElementById(viewId);
  if (view) view.classList.add("active-view");
  document.getElementById("pageTitle").textContent = VIEW_TITLES[viewId] || "Hybrid Workforce Platform";
  if (viewId === "simulation" && simulation) setTimeout(() => simulation.resize(), 50);
}

function bindScenarioActions() {
  document.getElementById("resetScenario").addEventListener("click", () => {
    const process = PROCESSES.find(item => item.id === DEFAULT_STATE.processId) || PROCESSES[0];
    Object.assign(state, structuredClone(DEFAULT_STATE), { params: { ...process.defaultParams } });
    model = modelScenario(state);
    persistState();
    renderAll();
    toast("Baseline scenario restored.");
  });

  document.getElementById("exportScenario").addEventListener("click", () => {
    const blob = new Blob([exportState(state)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dpworld-hybrid-workforce-scenario-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast("Scenario exported as JSON.");
  });

  document.getElementById("importScenario").addEventListener("change", async event => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = normalizeImportedState(JSON.parse(text));
      Object.assign(state, imported);
      const process = getProcess(state);
      state.params = { ...process.defaultParams, ...(imported.params || {}) };
      model = modelScenario(state);
      persistState();
      renderAll();
      toast("Scenario imported.");
    } catch (error) {
      toast(`Import failed: ${error.message}`);
    } finally {
      event.target.value = "";
    }
  });
}

function bindProcessControls() {
  const processSelect = document.getElementById("processSelect");
  processSelect.innerHTML = [
    ...PROCESSES.map(process => `<option value="${process.id}">${process.name}</option>`),
    `<option value="custom-process">+ Create custom process flow</option>`
  ].join("");
  processSelect.addEventListener("change", event => setState({ processId: event.target.value }));

  const regionSelect = document.getElementById("regionSelect");
  regionSelect.innerHTML = REGIONS.map(region => `<option value="${region.id}">${region.name}</option>`).join("");
  regionSelect.addEventListener("change", event => setState({ regionId: event.target.value }));

  const commercialModel = document.getElementById("commercialModel");
  commercialModel.addEventListener("change", event => setState({ commercialModel: event.target.value }));

  bindCustomProcessControls();
  bindUploadControls();
  renderParameterSliders();
}

function bindCustomProcessControls() {
  const name = document.getElementById("customProcessName");
  const category = document.getElementById("customProcessCategory");
  const summary = document.getElementById("customProcessSummary");
  const steps = document.getElementById("customProcessSteps");
  const apply = document.getElementById("applyCustomProcess");
  const fields = [name, category, summary, steps].filter(Boolean);

  apply?.addEventListener("click", () => {
    const customProcess = readCustomProcessFields();
    state.customProcess = customProcess;
    state.processId = "custom-process";
    const process = getProcess(state);
    state.params = { ...process.defaultParams, ...state.params };
    model = modelScenario(state);
    persistState();
    renderAll();
    toast("Custom process flow applied.");
  });

  fields.forEach(field => field.addEventListener("change", () => {
    if (state.processId !== "custom-process") return;
    state.customProcess = readCustomProcessFields();
    model = modelScenario(state);
    persistState();
    renderAll({ skipSliders: true });
  }));
}

function readCustomProcessFields() {
  const stepsText = document.getElementById("customProcessSteps")?.value || "";
  const steps = stepsText.split(/\n+/).map(item => item.trim()).filter(Boolean);
  return {
    ...(state.customProcess || {}),
    name: document.getElementById("customProcessName")?.value?.trim() || "Custom process flow",
    category: document.getElementById("customProcessCategory")?.value?.trim() || "Custom",
    summary: document.getElementById("customProcessSummary")?.value?.trim() || "User-defined process flow.",
    steps: steps.length ? steps : ["Receive task", "Execute activity", "Validate output", "Close transaction"]
  };
}

function bindUploadControls() {
  const input = document.getElementById("engineeringUploads");
  input?.addEventListener("change", async event => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const assets = [];
    for (const file of files) {
      const asset = {
        name: file.name,
        type: file.type || inferFileType(file.name),
        sizeKb: Math.round(file.size / 1024),
        uploadedAt: new Date().toISOString()
      };
      assets.push(asset);
      await tryApplyProcessFile(file);
    }
    state.uploadedAssets = [...(state.uploadedAssets || []), ...assets].slice(-12);
    persistState();
    renderAll();
    toast(`${files.length} file(s) attached to scenario.`);
    event.target.value = "";
  });
}

async function tryApplyProcessFile(file) {
  const lower = file.name.toLowerCase();
  if (!lower.endsWith(".json") && !lower.endsWith(".txt") && !lower.endsWith(".csv")) return;
  try {
    const text = await file.text();
    let steps = [];
    let name = state.customProcess?.name || "Custom process flow";
    let summary = state.customProcess?.summary || "Imported from uploaded process/material-flow file.";
    if (lower.endsWith(".json")) {
      const json = JSON.parse(text);
      if (json.name) name = json.name;
      if (json.summary) summary = json.summary;
      if (Array.isArray(json.steps)) steps = json.steps.map(item => typeof item === "string" ? item : item.name || item.detail || "Imported step");
    } else {
      steps = text.split(/\n+/).map(line => line.split(",")[0].trim()).filter(Boolean).slice(0, 10);
    }
    if (steps.length) {
      state.customProcess = { ...(state.customProcess || {}), name, summary, steps };
      state.processId = "custom-process";
    }
  } catch (error) {
    console.warn("Could not parse uploaded process file", error);
  }
}

function inferFileType(name) {
  const extension = name.split(".").pop()?.toUpperCase() || "FILE";
  if (["IFC", "DWG", "DXF", "STEP", "STP", "GLB", "GLTF"].includes(extension)) return "Engineering model";
  if (["CSV", "XLS", "XLSX"].includes(extension)) return "Material flow data";
  if (["PDF", "PNG", "JPG", "JPEG", "SVG"].includes(extension)) return "Process / layout document";
  return extension;
}

function renderParameterSliders() {
  const container = document.getElementById("parameterSliders");
  const definitions = parameterDefinitionsForProcess(state.processId);
  container.innerHTML = definitions.map(def => {
    const value = state.params[def.key] ?? getParams(state)[def.key] ?? def.min;
    return `
      <div class="slider-row" data-param="${def.key}">
        <header>
          <label for="param-${def.key}">${def.label}</label>
          <span class="slider-value" id="value-${def.key}">${formatSliderValue(def, value)}</span>
        </header>
        <div class="slider-meta">${escapeHtml(def.group || "Parameter")}</div>
        <input id="param-${def.key}" type="range" min="${def.min}" max="${def.max}" step="${def.step}" value="${value}" />
      </div>
    `;
  }).join("");

  definitions.forEach(def => {
    const input = document.getElementById(`param-${def.key}`);
    input.addEventListener("input", event => {
      const value = Number(event.target.value);
      state.params[def.key] = value;
      const valueEl = document.getElementById(`value-${def.key}`);
      if (valueEl) valueEl.textContent = formatSliderValue(def, value);
      model = modelScenario(state);
      persistState();
      renderAll({ skipSliders: true });
    });
  });
}

function formatSliderValue(def, value) {
  const prefix = def.prefix || "";
  const suffix = def.suffix || "";
  const decimals = Number.isInteger(value) ? 0 : 1;
  return `${prefix}${formatNumber(value, decimals)}${suffix}`;
}

function bindMarketplaceControls() {
  document.getElementById("oemSearch").addEventListener("input", () => renderMarketplace());
  document.getElementById("oemFilter").addEventListener("change", () => renderMarketplace());
}

function bindAssistant() {
  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatInput");
  form.addEventListener("submit", event => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question) return;
    addChatMessage("user", escapeHtml(question));
    input.value = "";
    setTimeout(() => addChatMessage("assistant", markdownLite(answerQuestion(question, model))), 120);
  });

  document.querySelectorAll(".prompt-chip").forEach(button => {
    button.addEventListener("click", () => {
      input.value = button.textContent.trim();
      form.requestSubmit();
    });
  });
}

function addChatMessage(role, html) {
  const messages = document.getElementById("chatMessages");
  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.innerHTML = html;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function markdownLite(text) {
  return escapeHtml(text).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
}

function bindSimulation() {
  const canvas = document.getElementById("warehouseCanvas");
  simulation = new WarehouseSimulation(canvas);
  simulation.setModel(model);

  document.getElementById("simPlay").addEventListener("click", () => {
    simulation.play();
    document.getElementById("simStateTag").textContent = "Running";
  });
  document.getElementById("simPause").addEventListener("click", () => {
    simulation.pause();
    document.getElementById("simStateTag").textContent = "Paused";
  });
  document.getElementById("simReset").addEventListener("click", () => {
    simulation.reset();
    document.getElementById("simStateTag").textContent = "Ready";
    renderTimeline();
  });
  document.getElementById("simSpeed").addEventListener("input", event => simulation.setSpeed(event.target.value));

  telemetryTimer = setInterval(() => {
    renderTelemetry();
    renderTimeline();
  }, 350);
}

function renderAll(options = {}) {
  model = modelScenario(state);
  renderControls(options);
  renderCockpit();
  renderProcessSummary();
  renderCapabilities();
  renderRecommendationGrid();
  renderAutomationMix();
  renderMarketplace();
  renderGuardrails();
  renderTelemetry();
  renderTimeline();
  if (simulation) simulation.setModel(model);
}

function renderControls(options = {}) {
  document.getElementById("processSelect").value = state.processId;
  document.getElementById("regionSelect").value = state.regionId;
  document.getElementById("commercialModel").value = state.commercialModel;
  renderCustomProcessControls();
  renderUploadedAssets();
  if (!options.skipSliders) renderParameterSliders();
}

function renderCustomProcessControls() {
  const builder = document.getElementById("customProcessBuilder");
  const isCustom = state.processId === "custom-process";
  if (builder) builder.classList.toggle("visible", isCustom);
  const custom = state.customProcess || DEFAULT_STATE.customProcess;
  const name = document.getElementById("customProcessName");
  const category = document.getElementById("customProcessCategory");
  const summary = document.getElementById("customProcessSummary");
  const steps = document.getElementById("customProcessSteps");
  if (name) name.value = custom.name || "";
  if (category) category.value = custom.category || "";
  if (summary) summary.value = custom.summary || "";
  if (steps) steps.value = (custom.steps || []).map(item => typeof item === "string" ? item : item.name || item.detail || "").join("\n");
}

function renderUploadedAssets() {
  const container = document.getElementById("uploadedAssetList");
  if (!container) return;
  const assets = state.uploadedAssets || [];
  if (!assets.length) {
    container.innerHTML = `<p class="muted small">No engineering, process-flow, or material-flow files attached yet.</p>`;
    return;
  }
  container.innerHTML = assets.map(asset => `
    <div class="asset-pill">
      <span>${escapeHtml(asset.name)}</span>
      <strong>${escapeHtml(asset.type || "File")} - ${formatNumber(asset.sizeKb)} KB</strong>
    </div>
  `).join("");
}

function renderCockpit() {
  const decision = model.decision;
  document.getElementById("recommendationTitle").textContent = decision.title;
  document.getElementById("recommendationText").textContent = decision.text;
  document.getElementById("confidenceValue").textContent = percent(model.confidence);
  document.getElementById("confidenceBar").style.width = `${model.confidence}%`;

  const primaryMix = model.automationMix.slice(0, 3).map(item => item.label.split(" /")[0]).join(" + ");
  const kpis = [
    { label: "Recommended solution", value: primaryMix, trend: `${model.selected.score.toFixed(0)}/100 primary match` },
    { label: "Primary units", value: formatNumber(model.robotsRequired), trend: "Automation fleet required" },
    { label: "FTE offset per shift", value: model.fteOffset.toFixed(1), trend: `${model.manualFte.toFixed(1)} manual FTE base` },
    { label: "Net annual savings", value: formatCurrency(model.netAnnualSavings), trend: `${percent(model.roi)} ROI` },
    { label: "Payback", value: Number.isFinite(model.paybackYears) ? `${model.paybackYears.toFixed(1)} yrs` : "No payback", trend: formatCurrency(model.startupCapex) + " startup" },
    { label: "Service level", value: percent(model.projectedServiceLevel, 1), trend: `${percent(model.errorReduction)} error reduction` }
  ];

  document.getElementById("kpiGrid").innerHTML = kpis.map(item => `
    <article class="kpi-card">
      <p class="eyebrow">${escapeHtml(item.label)}</p>
      <strong>${escapeHtml(item.value)}</strong>
      <span class="kpi-trend">${escapeHtml(item.trend)}</span>
    </article>
  `).join("");

  drawPerformanceChart();
  drawCostChart();
}

function renderProcessSummary() {
  const process = model.process;
  const techTags = (process.recommendedTech || []).map(tech => `<span>${escapeHtml(TECHNOLOGY_LABELS[tech] || tech)}</span>`).join("");
  const assets = (state.uploadedAssets || []).length ? `<p style="margin-top:10px"><strong>Attached files:</strong> ${(state.uploadedAssets || []).length} file(s) linked to this scenario.</p>` : "";
  document.getElementById("processSummary").innerHTML = `
    <h4>${escapeHtml(process.name)}</h4>
    <p>${escapeHtml(process.summary)}</p>
    <p style="margin-top:10px"><strong>Category:</strong> ${escapeHtml(process.category)} | <strong>Pilot fit:</strong> ${escapeHtml(process.pilotFit)}</p>
    <div class="tech-tags">${techTags}</div>
    ${assets}
  `;
}

function renderCapabilities() {
  const req = processAdjustedRequirements(model.process, model.params);
  const entries = Object.entries(req);
  document.getElementById("capabilityRadar").innerHTML = entries.map(([key, value]) => `
    <article class="cap-card">
      <header>
        <h4>${escapeHtml(CAPABILITY_LABELS[key] || key)}</h4>
        <strong>${value.toFixed(0)}</strong>
      </header>
      <div class="cap-bar"><span style="width:${value}%"></span></div>
    </article>
  `).join("");

  const notes = [
    `Capability demand: ${req.lift.toFixed(0)}/100 lifting, ${req.dexterity.toFixed(0)}/100 dexterity, ${req.vision.toFixed(0)}/100 vision, and ${req.api.toFixed(0)}/100 API readiness based on this process configuration.`,
    `Primary selected option: ${model.robot.name}, with ${model.robot.payloadKg} kg indicative payload capacity and ${model.robot.enduranceHours} hour indicative endurance.`,
    model.process.pilotFit.includes("Specialist") ? "Guardrail: specialist robotics should lead the core flow; humanoids should be evaluated for exceptions, flexible support, or edge cases." : "Pilot thesis: this process has enough repeatability to test hybrid workforce automation without over-customizing the site."
  ];
  document.getElementById("decisionNotes").innerHTML = notes.map((note, idx) => `
    <div class="note"><span class="note-icon">${idx + 1}</span><span>${escapeHtml(note)}</span></div>
  `).join("");
}

function renderRecommendationGrid() {
  const top3 = model.ranked.slice(0, 3);
  const payback = Number.isFinite(model.paybackYears) ? `${model.paybackYears.toFixed(1)} years` : "No payback";
  const cards = [
    { title: "Primary automation", value: model.robot.name, text: model.selected.reason },
    { title: "Hybrid mix", value: model.automationMix.slice(0, 3).map(item => item.label.split(" /")[0]).join(" + "), text: model.automationMix.map(item => `${item.label} ${item.share}%`).join(" | ") },
    { title: "Fleet sizing", value: `${model.robotsRequired} units`, text: `Raw requirement is ${model.robotsRequiredRaw.toFixed(1)} primary units at ${model.params.robotUtilization}% utilization.` },
    { title: "Commercial model", value: commercialLabel(state.commercialModel), text: `Estimated monthly primary robot cost is ${formatCurrency(model.monthlyRobotCost, false)} per unit.` },
    { title: "Economics", value: payback, text: `Net annual savings: ${formatCurrency(model.netAnnualSavings)}. 3-year simple NPV: ${formatCurrency(model.annualNpv3Year)}.` },
    { title: "Top alternatives", value: top3.map(item => item.robot.company.split(" ")[0]).join(" / "), text: top3.map(item => `${item.robot.name}: ${item.score.toFixed(0)}`).join(" | ") },
    { title: "Readiness", value: percent(model.confidence), text: model.decision.text },
    { title: "Safety impact", value: percent(model.safetyImprovement), text: "Estimated ergonomics reduction from removing repetitive or high-risk manual handling." },
    { title: "Service level", value: percent(model.projectedServiceLevel, 1), text: "Projected SLA after quality, error, and exception handling adjustments." }
  ];

  document.getElementById("recommendationGrid").innerHTML = cards.map(card => `
    <article class="recommendation-card">
      <h4>${escapeHtml(card.title)}</h4>
      <strong>${escapeHtml(card.value)}</strong>
      <p>${escapeHtml(card.text)}</p>
    </article>
  `).join("");
}

function renderAutomationMix() {
  const containers = [document.getElementById("automationMix"), document.getElementById("automationMixPanel")].filter(Boolean);
  const html = model.automationMix.map(item => `
    <article class="mix-card">
      <div>
        <span class="mix-share">${item.share}%</span>
        <h4>${escapeHtml(item.label)}</h4>
        <p>${escapeHtml(item.robot.name)}</p>
      </div>
      <strong>${item.score.toFixed(0)}/100</strong>
    </article>
  `).join("");
  containers.forEach(container => { container.innerHTML = html; });
}

function renderMarketplace() {
  const search = document.getElementById("oemSearch")?.value?.trim().toLowerCase() || "";
  const filter = document.getElementById("oemFilter")?.value || "all";
  const body = document.querySelector("#oemTable tbody");
  if (!body) return;

  const rows = model.ranked
    .filter(item => filter === "all" || item.robot.technology === filter)
    .filter(item => {
      if (!search) return true;
      const text = `${item.robot.name} ${item.robot.company} ${item.robot.typeLabel} ${item.robot.technology} ${item.robot.caution}`.toLowerCase();
      return text.includes(search);
    });

  body.innerHTML = rows.map((item, idx) => {
    const r = item.robot;
    return `
      <tr>
        <td><span class="rank-pill">${idx + 1}</span></td>
        <td><strong>${escapeHtml(r.name)}</strong><br>${escapeHtml(r.company)}</td>
        <td><span class="tech-badge">${escapeHtml(TECHNOLOGY_LABELS[r.technology] || r.technology)}</span><br>${escapeHtml(r.typeLabel)}</td>
        <td>${formatNumber(r.payloadKg)} kg</td>
        <td>${r.enduranceHours} hrs</td>
        <td>${r.speedMps} m/s</td>
        <td>${r.deployment.map(escapeHtml).join("<br>")}</td>
        <td><span class="match-pill">${item.score.toFixed(0)}/100</span></td>
        <td>${r.commercialMaturity}/100</td>
        <td>${escapeHtml(r.caution)}</td>
      </tr>
    `;
  }).join("");

  drawOemScoreChart();
}

function renderGuardrails() {
  const guardrails = buildGuardrails(model);
  document.getElementById("guardrails").innerHTML = guardrails.map(item => `
    <article class="guardrail">
      <h4>${escapeHtml(item.title)}</h4>
      <p>${escapeHtml(item.text)}</p>
    </article>
  `).join("");
}

function renderTelemetry() {
  if (!document.getElementById("simTelemetry")) return;
  const simData = simulation?.currentTelemetry?.() || { activeStep: 0, robotProgress: 0, humanProgress: 0 };
  const step = model.process.steps[simData.activeStep] || model.process.steps[0];
  document.getElementById("simProcessTitle").textContent = model.process.name;
  const telemetry = [
    { label: "Active workflow step", value: step.name },
    { label: "Hybrid robot progress", value: percent(simData.robotProgress * 100) },
    { label: "Manual progress", value: percent(simData.humanProgress * 100) },
    { label: "Manual cycle time", value: `${model.manualCycleSec.toFixed(1)} sec` },
    { label: "Hybrid cycle time", value: `${model.robotCycleSec.toFixed(1)} sec` },
    { label: "Projected throughput gain", value: percent(model.throughputGain) },
    { label: "Primary OEM", value: model.robot.name },
    { label: "Decision", value: model.decision.title }
  ];
  document.getElementById("simTelemetry").innerHTML = telemetry.map(item => `
    <div class="telemetry-item"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>
  `).join("");
}

function renderTimeline() {
  if (!document.getElementById("workflowTimeline")) return;
  const simData = simulation?.currentTelemetry?.() || { activeStep: 0 };
  document.getElementById("workflowTimeline").innerHTML = model.process.steps.map((step, idx) => {
    const cls = idx < simData.activeStep ? "complete" : idx === simData.activeStep ? "active" : "";
    return `
      <article class="timeline-step ${cls}">
        <span class="bubble">${idx + 1}</span>
        <div><h4>${escapeHtml(step.name)}</h4><p>${escapeHtml(step.detail)}</p></div>
      </article>
    `;
  }).join("");
}

function drawPerformanceChart() {
  const data = [
    { label: "Cycle time", unit: "sec", manual: model.manualCycleSec, robot: model.robotCycleSec, lowerBetter: true },
    { label: "FTE/shift", unit: "FTE", manual: model.manualFte, robot: model.assistedFte, lowerBetter: true },
    { label: "Error rate", unit: "%", manual: model.process.manual.errorRate, robot: model.process.robot.errorRate, lowerBetter: true },
    { label: "Throughput", unit: "/hr", manual: model.manualJobsPerHour, robot: model.robotJobsPerHour, lowerBetter: false }
  ];
  drawGroupedBarChart(document.getElementById("performanceChart"), data, {
    series: ["manual", "robot"],
    labels: { manual: "Manual", robot: "Hybrid-assisted" },
    colors: { manual: "#3c6df0", robot: "#ef2f73" }
  });
}

function drawCostChart() {
  const data = [
    { label: "Labor avoided", value: model.annualLaborAvoided },
    { label: "Robot cost", value: model.annualRobotCost },
    { label: "Platform", value: model.annualCloudCost },
    { label: "Maintenance", value: model.annualMaintenanceReserve },
    { label: "Net savings", value: model.netAnnualSavings }
  ];
  drawSingleBarChart(document.getElementById("costChart"), data);
}

function drawOemScoreChart() {
  const canvas = document.getElementById("oemScoreChart");
  if (!canvas) return;
  const top = model.selected.robot;
  const data = Object.entries(top.capabilities).map(([key, value]) => ({ label: CAPABILITY_LABELS[key] || key, value }));
  drawHorizontalScoreChart(canvas, data, top.name);
}

function drawGroupedBarChart(canvas, data, options) {
  const ctx = setupCanvas(canvas);
  const { width, height } = canvasMetrics(canvas);
  ctx.clearRect(0, 0, width, height);
  const padding = { top: 48, right: 165, bottom: 70, left: 62 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const max = Math.max(...data.flatMap(item => options.series.map(key => Math.abs(item[key])))) * 1.2 || 1;
  drawChartTitle(ctx, "Manual vs hybrid-assisted KPIs", padding.left, 24);
  drawLegendRight(ctx, [
    { label: options.labels.manual, color: options.colors.manual },
    { label: options.labels.robot, color: options.colors.robot }
  ], width - padding.right + 26, padding.top + 18);
  drawAxis(ctx, padding, width, height);

  const groupW = plotW / data.length;
  const barW = Math.min(32, groupW / 4.2);
  data.forEach((item, i) => {
    const x0 = padding.left + i * groupW + groupW / 2;
    options.series.forEach((series, j) => {
      const value = item[series];
      const barH = Math.abs(value) / max * plotH;
      const x = x0 + (j === 0 ? -barW - 4 : 4);
      const y = padding.top + plotH - barH;
      const gradient = ctx.createLinearGradient(x, y, x, y + barH);
      gradient.addColorStop(0, options.colors[series]);
      gradient.addColorStop(1, series === "manual" ? "#82a1ff" : "#ff93b8");
      ctx.fillStyle = gradient;
      roundRect(ctx, x, y, barW, barH, 8);
      ctx.fill();
      ctx.fillStyle = "#1b2640";
      ctx.font = "800 10px Inter, Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(shortValue(value), x + barW / 2, y - 7);
    });
    ctx.fillStyle = "#647089";
    ctx.font = "800 11px Inter, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    wrapCanvasText(ctx, item.label, x0, height - 42, groupW - 10, 13);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "700 10px Inter, Segoe UI, sans-serif";
    ctx.fillText(item.unit, x0, height - 13);
  });
}

function drawSingleBarChart(canvas, data) {
  const ctx = setupCanvas(canvas);
  const { width, height } = canvasMetrics(canvas);
  ctx.clearRect(0, 0, width, height);
  const padding = { top: 48, right: 34, bottom: 70, left: 76 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const maxAbs = Math.max(...data.map(item => Math.abs(item.value))) * 1.2 || 1;
  const zeroY = padding.top + plotH * 0.72;
  drawChartTitle(ctx, "Annual financial profile", padding.left, 24);
  drawAxis(ctx, padding, width, height, zeroY);

  const groupW = plotW / data.length;
  const barW = Math.min(58, groupW * 0.48);
  data.forEach((item, i) => {
    const x = padding.left + i * groupW + (groupW - barW) / 2;
    const value = item.value;
    const barH = Math.abs(value) / maxAbs * plotH * 0.75;
    const y = value >= 0 ? zeroY - barH : zeroY;
    const gradient = ctx.createLinearGradient(x, y, x + barW, y + barH);
    if (value >= 0) {
      gradient.addColorStop(0, "#23c487");
      gradient.addColorStop(1, item.label.includes("Net") ? "#2bc2ff" : "#3c6df0");
    } else {
      gradient.addColorStop(0, "#ff8a3d");
      gradient.addColorStop(1, "#ef2f73");
    }
    ctx.fillStyle = gradient;
    roundRect(ctx, x, y, barW, barH, 9);
    ctx.fill();
    ctx.fillStyle = "#1b2640";
    ctx.font = "900 11px Inter, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(formatCurrency(value), x + barW / 2, value >= 0 ? y - 8 : y + barH + 15);
    ctx.fillStyle = "#647089";
    ctx.font = "800 11px Inter, Segoe UI, sans-serif";
    wrapCanvasText(ctx, item.label, x + barW / 2, height - 43, groupW - 8, 13);
  });
}

function drawHorizontalScoreChart(canvas, data, title) {
  const ctx = setupCanvas(canvas);
  const { width, height } = canvasMetrics(canvas);
  ctx.clearRect(0, 0, width, height);
  const padding = { top: 50, right: 30, bottom: 24, left: 178 };
  const rowH = (height - padding.top - padding.bottom) / data.length;
  drawChartTitle(ctx, title, 22, 24);
  data.forEach((item, i) => {
    const y = padding.top + i * rowH + rowH * 0.22;
    const barH = Math.max(8, rowH * 0.42);
    const barW = (width - padding.left - padding.right) * (item.value / 100);
    ctx.fillStyle = "#647089";
    ctx.font = "800 11px Inter, Segoe UI, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(item.label, padding.left - 12, y + barH * 0.76);
    ctx.fillStyle = "#e7edf5";
    roundRect(ctx, padding.left, y, width - padding.left - padding.right, barH, 999);
    ctx.fill();
    const gradient = ctx.createLinearGradient(padding.left, y, padding.left + barW, y);
    gradient.addColorStop(0, "#23c487");
    gradient.addColorStop(0.55, "#2bc2ff");
    gradient.addColorStop(1, "#ef2f73");
    ctx.fillStyle = gradient;
    roundRect(ctx, padding.left, y, barW, barH, 999);
    ctx.fill();
    ctx.fillStyle = "#1b2640";
    ctx.textAlign = "left";
    ctx.font = "900 11px Inter, Segoe UI, sans-serif";
    ctx.fillText(item.value.toFixed(0), padding.left + barW + 7, y + barH * 0.76);
  });
}

function setupCanvas(canvas) {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(360, Math.floor(rect.width));
  const height = Math.max(260, Number(canvas.getAttribute("height")) || Math.floor(rect.height));
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  canvas.dataset.metricWidth = width;
  canvas.dataset.metricHeight = height;
  return ctx;
}

function canvasMetrics(canvas) {
  return { width: Number(canvas.dataset.metricWidth), height: Number(canvas.dataset.metricHeight) };
}

function drawChartTitle(ctx, title, x, y) {
  ctx.fillStyle = "#0b1020";
  ctx.font = "900 14px Inter, Segoe UI, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(title, x, y);
}

function drawLegendRight(ctx, items, x, y) {
  ctx.fillStyle = "rgba(248,251,255,0.94)";
  ctx.strokeStyle = "rgba(28,38,66,0.1)";
  roundRect(ctx, x - 14, y - 18, 136, 72, 14);
  ctx.fill();
  ctx.stroke();
  items.forEach((item, idx) => {
    const offsetY = idx * 30;
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(x, y + offsetY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#334155";
    ctx.font = "850 11px Inter, Segoe UI, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(item.label, x + 12, y + 4 + offsetY);
  });
}

function drawAxis(ctx, padding, width, height, zeroY = null) {
  const bottom = padding.top + (height - padding.top - padding.bottom);
  ctx.strokeStyle = "rgba(28, 38, 66, 0.12)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i += 1) {
    const y = padding.top + (bottom - padding.top) * (i / 5);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }
  if (zeroY !== null) {
    ctx.strokeStyle = "rgba(11, 16, 32, 0.32)";
    ctx.beginPath();
    ctx.moveTo(padding.left, zeroY);
    ctx.lineTo(width - padding.right, zeroY);
    ctx.stroke();
  }
}

function roundRect(ctx, x, y, width, height, radius) {
  const h = Math.max(0, height);
  const r = Math.min(radius, Math.abs(width) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + h, r);
  ctx.arcTo(x + width, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text).split(" ");
  let line = "";
  let lines = [];
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  lines.slice(0, 2).forEach((item, index) => ctx.fillText(item, x, y + index * lineHeight));
}

function shortValue(value) {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`;
  if (Math.abs(value) >= 100) return value.toFixed(0);
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function commercialLabel(modelKey) {
  return modelKey === "raas" ? "RaaS / managed service" : modelKey === "lease" ? "Operating lease" : "Purchase + service";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toast(message) {
  const toastEl = document.getElementById("toast");
  toastEl.textContent = message;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 2800);
}

window.addEventListener("resize", () => {
  clearTimeout(window.__dpwResizeTimer);
  window.__dpwResizeTimer = setTimeout(() => {
    drawPerformanceChart();
    drawCostChart();
    drawOemScoreChart();
    if (simulation) simulation.resize();
  }, 150);
});

window.addEventListener("beforeunload", () => {
  if (telemetryTimer) clearInterval(telemetryTimer);
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
