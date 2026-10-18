# Data and calculation notes

- All supplied sites, action times, cost figures, product envelopes, assets, and observations are examples unless the user supplies evidence.
- The AGIBOT target has unknown physical and task performance. It cannot qualify through a price or a vendor name.
- A new text action list has unknown timing, skill, and physical requirements. The app does not infer robot performance from prose.
- Human time is active work per action × repeat count. Parallel work needs a separate resource model.
- Daily demand covers all shifts. Peak demand is used for capacity. The peak factor does not inflate annual demand.
- Charging and other downtime are disjoint shares of the same operating window.
- One retry is modelled per machine work bundle. Remaining failure and extra intervention events add human recovery time. Recovery is assumed to complete the outstanding unit; test this at the site.
- Whole-shift staffing is conservative. Shared roles, time fragments, arrival patterns, queues, and schedules can change the result.
- Cashable positions are capped at the modelled staffing change. A time fraction is not a staff reduction. Redeployed capacity is separate from cash benefit.
- Extra staffing is an added cost. Benefit retention does not remove recovery work or added labour cost.
- Purchase capital is paid upfront. It is not charged again as depreciation in cash flow. Allocated cost per unit spreads upfront cost over the study horizon.
- Lease/RaaS fees include service only when that inclusion is recorded. Energy and additional site support remain separate.
- The first year delays benefit for the entered ramp-up period. Payback follows monthly cash flow, including the ramp months. Recurring costs run for the full year. Taxes and financing are not modelled.
- NPV discounts annual cash flows at year end, using the entered scenario rate. The sample rate is not an approved finance policy.
- The recommendation ranks the tested set by NPV. Generated matches use eligible action times to form drafts; they are not a global assignment optimizer.
- A share of passing stress cases is not a confidence probability. Source status, fit, financial sensitivity, and delivery readiness remain separate.
- Measured observation cost delta needs a comparable baseline cost for the same output and time window. The app does not annualise that delta.
- Local JSON export preserves editable records and references. File bytes remain in the local server's `.data` directory.

Use real process records, valid supplier quotes, applicable task tests, and site engineering review before a capital or pilot decision.
