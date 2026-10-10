import { REGIONS, PROCESSES, DEFAULT_STATE, TECHNOLOGY_LABELS, parameterDefinitionsForProcess } from "./data.js";
import {
  modelScenario,
  getProcess,
  getParams,
  formatCurrency,
  formatNumber,
  percent,
  processAdjustedRequirements,
  buildGuardrails,
  exportState,
  normalizeImportedState
} from "./engine.js";
import { WarehouseSimulation } from "./simulation3d.js";
import { answerQuestion } from "./assistant.js";

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
