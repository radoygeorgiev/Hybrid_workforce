import { PROCESSES, ROBOTS, REGIONS, buildCustomProcess, TECHNOLOGY_LABELS } from "./data.js";

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function formatNumber(value, decimals = 0) {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  }).format(value);
}

export function formatCurrency(value, compact = true) {
  if (!Number.isFinite(value)) return "-";
  if (compact && Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (compact && Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export function percent(value, decimals = 0) {
  if (!Number.isFinite(value)) return "-";
  return `${value.toFixed(decimals)}%`;
}

export function getProcess(state) {
  if (state.processId === "custom-process") return buildCustomProcess(state.customProcess || {});
  return PROCESSES.find(item => item.id === state.processId) || PROCESSES[0];
}

export function getRegion(state) {
  return REGIONS.find(item => item.id === state.regionId) || REGIONS[0];
}

export function getParams(state) {
  const process = getProcess(state);
  return { ...process.defaultParams, ...(state.params || {}) };
}

export function fullyLoadedLaborCostPerHour(region) {
  return region.wageUsdHour * region.burden;
}

export function annualFteCost(region, shiftHours) {
  const annualHours = shiftHours * 250;
  return fullyLoadedLaborCostPerHour(region) * annualHours;
}

export function processAdjustedRequirements(process, params) {
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

export function scoreRobot(robot, process, params) {
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

export function rankedRobots(state) {
  const process = getProcess(state);
  const params = getParams(state);
  return ROBOTS
    .map(robot => scoreRobot(robot, process, params))
    .sort((a, b) => b.score - a.score);
}

export function selectedRobotResult(state) {
  const ranked = rankedRobots(state);
  if (state.selectedRobotId) {
    const selected = ranked.find(item => item.robot.id === state.selectedRobotId);
    if (selected) return selected;
  }
  return ranked[0];
}

export function robotMonthlyCost(robot, commercialModel) {
  if (commercialModel === "lease") return robot.leaseMonthlyUsd;
  if (commercialModel === "purchase") return (robot.purchaseUsd / 60) + (robot.purchaseUsd * 0.14 / 12);
  return robot.raasMonthlyUsd;
}

export function buildAutomationMix(ranked, process, robotsRequired) {
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

export function modelScenario(state) {
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

export function buildGuardrails(model) {
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

export function exportState(state) {
  const payload = {
    version: "2.0",
    exportedAt: new Date().toISOString(),
    state
  };
  return JSON.stringify(payload, null, 2);
}

export function normalizeImportedState(payload) {
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
