# Application Architecture

This local demonstrator is designed around the four-layer DP World hybrid workforce framework. It is also structured to map cleanly to a production architecture with presentation, business logic, data access, and integration layers.

## Layer 1: Business Processes

Purpose: Standardize DP World's 3PL workflows into process templates that can be evaluated, simulated, and deployed repeatedly.

Implemented in this app:

- Process library in `src-modules/data.js`
- Process selection UI in `index.html`
- Parameter sliders for volume, payload, travel distance, complexity, variability, ergonomics risk, service level, utilization, cloud cost, and integration budget
- Process workflow steps rendered in the 3D simulation timeline

Production evolution:

- Connect to WMS/WES/TMS event logs
- Build task ontologies for inbound, outbound, picking, packing, returns, cross dock, inspection, and container unloading
- Maintain versioned process templates by customer, site, SKU class, and automation maturity

## Layer 2: Capability Library

Purpose: Translate process requirements into capability requirements rather than selecting robots by brand alone.

Implemented in this app:

- Capability requirements engine in `src-modules/engine.js`
- Requirements include lifting, mobility, dexterity, vision, endurance, speed, autonomy, safety, API readiness, and scalability
- Capability cards update dynamically as process parameters change

Production evolution:

- Maintain a governed capability taxonomy
- Add test-protocol results from pilots
- Store robot performance under DP World operating conditions
- Use safety and compliance constraints as hard filters before economic scoring

## Layer 3: OEM Marketplace

Purpose: Compare certified robotics OEMs in a vendor-neutral marketplace and avoid lock-in.

Implemented in this app:

- OEM library in `src-modules/data.js`
- Matching algorithm in `src-modules/engine.js`
- OEM Marketplace table with rank, technology, payload, endurance, speed, deployment options, match score, maturity, and notes
- Includes humanoids plus specialist warehouse robotics as guardrails

Production evolution:

- OEM certification workflow
- Standard API contracts for telemetry, tasking, health, safety events, and software versioning
- SLA and commercial model repository
- Vendor scorecards from real DP World pilots

## Layer 4: Hybrid Workforce Platform

Purpose: Orchestrate simulation, fleet management, scheduling, AI guidance, task allocation, analytics, maintenance, software updates, safety, security, and knowledge management.

Implemented in this app:

- KPI cockpit in `src-modules/app.js`
- Simulation engine in `src-modules/simulation3d.js`
- ROI and fleet sizing logic in `src-modules/engine.js`
- Conversational AI advisor in `src-modules/assistant.js`
- Local scenario export/import

Production evolution:

- AWS digital twin layer
- Edge gateways in warehouses
- Real-time telemetry from robots and automation equipment
- Integration with WMS/WES/TMS/ERP/HR systems
- AI assistant connected to governed knowledge and operational data
- Fleet scheduler and task allocator
- Cybersecurity, identity, audit, and governance services

## Mapping to software architecture layers

### Presentation layer

Files:

- `index.html`
- `css/styles.css`
- UI rendering parts of `src-modules/app.js`

Responsibilities:

- Executive cockpit
- Forms and sliders
- 3D simulation canvas
- OEM marketplace
- AI chat interface
- Architecture view

### Business logic layer

Files:

- `src-modules/engine.js`
- `src-modules/assistant.js`

Responsibilities:

- Matching algorithm
- Capability scoring
- ROI calculation
- Fleet sizing
- Payback and NPV
- Guardrail generation
- Offline advisor responses

### Data access layer

Files:

- `src-modules/data.js`
- Browser local storage
- JSON import/export

Responsibilities:

- Process library
- Region assumptions
- Robot capability library
- Scenario state

### Integration layer

Files:

- `server.py` for local hosting
- Integration architecture represented in the app but not connected to external systems

Production responsibilities:

- WMS/WES/TMS/ERP connectors
- OEM API gateway
- AWS IoT and digital twin services
- Enterprise identity and audit
- Data lake and analytics
- Enterprise LLM gateway

## Production reference architecture

A production version should use a modern cloud-native architecture:

- Front end: React, Next.js, or Angular
- API layer: Python FastAPI, Node.js, or Java/Spring Boot
- Data: PostgreSQL for process and capability master data, time-series store for robot telemetry, object storage for simulation artifacts
- Simulation: warehouse digital twin service and event-based simulation engine
- AI: enterprise LLM gateway with retrieval from approved DP World knowledge sources
- Integration: API gateway, message bus, WMS/WES/TMS/ERP connectors, OEM connectors
- Security: SSO, RBAC, audit, secrets management, network segmentation, and device identity
