# Data Notes and Assumptions

Created for strategic simulation and executive demonstration. This is not a procurement database.

## What the app models

The application estimates whether a 3PL process is a good candidate for hybrid robotic-assisted deployment. It models:

- Volume per shift
- Shift length
- Fully loaded labor cost by region
- Process complexity
- SKU and task variability
- Average payload
- Travel distance
- Ergonomics risk
- Target service level
- Human and robot utilization
- Cloud/platform support cost
- Startup integration cost
- Robot capability fit
- Robot commercial maturity
- CapEx-light deployment model

## How to interpret robot data

The robot capability library combines public information, domain assumptions, and conservative planning estimates. Many humanoid vendors do not publish complete, stable, or directly comparable specifications for payload, endurance, speed, pricing, API readiness, service economics, and warehouse maturity.

The values in `src-modules/data.js` should therefore be treated as placeholders. They should be replaced by:

- OEM RFQ/RFP responses
- DP World pilot results
- Actual site measurements
- Safety validation results
- WMS/WES transaction data
- Maintenance and uptime data
- Contracted RaaS/lease/purchase pricing
- Cybersecurity and API validation

## Why the app includes specialist robots

The strategy should not force every process into a humanoid answer. Some 3PL workflows, such as container unloading or high-rate palletizing, may be better served by specialist warehouse robots or fixed automation. The app includes specialist options to demonstrate this guardrail.

## Public reference sources used for calibration

The following sources informed the model direction and data ranges. Final procurement work should verify all values directly with each OEM.

- Agility Robotics Digit spec page: https://www.agilityrobotics.com/solutions/digit/spec-sheet
- Apptronik Apollo official page: https://apptronik.com/jerome/apollo
- Unitree G1 official page: https://www.unitree.com/g1/
- Fourier GR-1 official page: https://www.fftai.com/products-gr1
- Sanctuary AI Phoenix announcement: https://sanctuary.ai/news/sanctuary-ai-unveils-phoenix-a-humanoid-general-purpose-robot-designed-for-work/
- UBTECH Walker S official page: https://www.ubtrobot.com/en/humanoid/products/walker-s
- Boston Dynamics Stretch official page: https://bostondynamics.com/products/stretch/
- AWS IoT TwinMaker: https://aws.amazon.com/iot-twinmaker/
- AWS warehouse simulation and digital twin blog: https://aws.amazon.com/blogs/supply-chain/aws-simulation-and-digital-twin-to-increase-warehouse-productivity/

## Financial assumptions

The application uses a planning model, not an accounting model:

- 250 working days per year
- Fully loaded labor cost is hourly wage multiplied by burden factor
- RaaS and lease estimates are illustrative
- Purchase model amortizes hardware over 60 months plus service reserve
- Startup integration is treated as upfront cost
- 3-year NPV uses a simple 10 percent discount rate

For executive review, replace these with DP World finance-approved assumptions by region, customer, and site.

## Technical assumptions

The app assumes a production platform would integrate with:

- WMS and WES for tasks, inventory, and transaction confirmation
- TMS for outbound and transport planning
- ERP and finance systems for cost and asset data
- HR/workforce systems for labor baseline and availability
- OEM APIs for robot tasking, telemetry, health, safety, and maintenance
- AWS or equivalent cloud services for digital twin, data, AI, edge, monitoring, security, and analytics

## Safety assumptions

Any real deployment must include local safety review before physical testing:

- Site risk assessment
- Mixed human/robot traffic rules
- Emergency stop and safe-stop behavior
- Speed and separation monitoring
- Payload and lifting limitations
- Battery and charging safety
- Cybersecurity review
- Incident reporting
- Operator training
- Regulatory and insurance review
