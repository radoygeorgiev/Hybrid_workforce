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

export class WarehouseSimulation {
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
