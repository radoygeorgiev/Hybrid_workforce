import { formatCurrency, percent, buildGuardrails } from "./engine.js";

export function answerQuestion(question, model) {
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
