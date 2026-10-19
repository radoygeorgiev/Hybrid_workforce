// Local contracts for the September 2026 AWS prototype scope. No external runner.
export const STUDY_STAGES = [
 ['capture','Warehouse capture','Core','Zed 2i / OpenUSD',[['captureRef','Capture file or dataset reference'],['sceneVersion','OpenUSD scene version'],['geometryChecks','Scale, floor, collision, and geometry checks'],['textures','Texture assets · photorealism is a stretch goal']]],
 ['robots','Robot assets and common interface','Core','Isaac Sim robot assets',[['robotAssets','Robot asset URIs and exact versions'],['embodiment','Joints, limits, tools, sensors, and embodiment mapping'],['robotInterface','Common commands, observations, and reset contract']]],
 ['task','Common task and baseline policy','Core','Isaac Sim / Isaac Lab / Gymnasium',[['taskVersion','KLT task version'],['protocol','Common benchmark protocol version'],['conditions','Common objects, start states, seeds, and limits'],['observations','Observation configuration'],['actions','Action configuration'],['rewards','Reward configuration'],['terminations','Termination criteria'],['episodes','Episode length, reset, and seed settings'],['policy','Foundation model, encoder, policy, and version'],['fallback','Scripted or motion-planned fallback']]],
 ['data','Seed demonstrations and adaptation','Core','Quest 3S / agent scripts / Isaac Lab Mimic',[['demoMethod','VR, agent-scripted, or both'],['demoDataset','Seed dataset reference and version'],['primitives','Move, hold/lift, release, and other supported primitives'],['baseTransit','Separate planned base-transit segment'],['mimic','Mimic generation, adaptation dataset, and validation split']]],
 ['benchmark','Common task benchmarks','Core','Isaac Sim',[['metrics','Cycle time, first-pass success, intervention, recovery, and energy definitions'],['testPlan','Robots, policies, seeds, repetitions, failure tests, and acceptance limits']]],
 ['des','Whole-process scenarios','Core','SimPy DES',[['arrivals','Volumes, arrival distribution, shifts, and peak profile'],['serviceTimes','Human and robot task distributions and benchmark references'],['layout','Routes, buffers, queues, and layout versions'],['fleets','Fleet counts and alternative human/robot work splits'],['availability','Charge, downtime, maintenance, and recovery rules'],['replications','Horizon, warm-up, seeds, and replication count'],['desOutputs','External result reference: throughput, queues, wait time, utilisation, and confidence intervals']]],
 ['learning','Policy refinement','Stretch','Isaac Lab / Hugging Face LeRobot',[['trainingDataset','Training and held-out evaluation datasets'],['trainingConfig','Baseline release, RL configuration, checkpoint, and stop criteria'],['refinedPolicy','Refined policy version and result reference']]],
 ['review','Review, assistant, and handover','Core + stretch','Review UI / design assistant',[['assistantBrief','Task description, requirements, exclusions, and shortlist rationale · stretch'],['assistantConfig','Proposed scene, robot, task, and test configuration · stretch'],['toolingMetrics','Design time, vendor-evaluation time, integration effort, and reuse measures'],['runningCost','GPU instance, region, hourly rate, runtime, storage, and budget limits'],['handover','Artifacts, runbook, running-cost report, and path to production']]]
];
export const newStudy = () => ({revision:1,settings:{},benchmarks:[],requests:[]});
export function validateBenchmark(b,configIds) {
 const errors=[];
 if(!b||typeof b!=='object'||Array.isArray(b))return ['Invalid benchmark record.'];
 for(const k of ['id','configId','policy','policyKind','protocol','taskVersion','sceneVersion','conditions','source','evidence','date'])if(typeof b[k]!=='string'||!b[k].trim()||b[k].length>20000)errors.push('Benchmark needs '+k+'.');
 if(!configIds.has(b.configId))errors.push('Benchmark configuration is missing.');
 if(!['Sample','Simulated','Measured'].includes(b.evidence))errors.push('Use Sample, Simulated, or Measured benchmark evidence.');
 if(!['Baseline','Refined','Scripted'].includes(b.policyKind))errors.push('Use a baseline, refined, or scripted policy.');
 if(b.studyRevision!==undefined&&(!Number.isInteger(b.studyRevision)||b.studyRevision<1))errors.push('Invalid AWS plan revision.');
 if(!Number.isInteger(b.caseRevision)||b.caseRevision<1)errors.push('Benchmark case revision is invalid.');
 if(!Number.isInteger(b.attempts)||b.attempts<1||b.attempts>10000000)errors.push('Attempts must be a positive whole number.');
 if(!Number.isInteger(b.successes)||b.successes<0||b.successes>b.attempts)errors.push('Successes must be within attempts.');
 for(const k of ['cycleSec','recoverySec','energyKwh'])if(b[k]!=null&&(typeof b[k]!=='number'||!Number.isFinite(b[k])||b[k]<0||(k==='cycleSec'&&b[k]===0)))errors.push('Invalid benchmark '+k+'.');
 if(b.interventions!=null&&(!Number.isInteger(b.interventions)||b.interventions<0))errors.push('Interventions must be a non-negative count.');
 return errors;
}
export function validateStudy(study,configIds) {
 if(study===undefined)return [];
 if(!study||typeof study!=='object'||Array.isArray(study)||!study.settings||typeof study.settings!=='object'||Array.isArray(study.settings)||!Array.isArray(study.benchmarks)||!Array.isArray(study.requests))return ['Invalid simulation study.'];
 const errors=[];
 if(study.revision!==undefined&&(!Number.isInteger(study.revision)||study.revision<1))errors.push('Invalid AWS plan revision.');
 if(Object.keys(study.settings).length>100||Object.values(study.settings).some(x=>typeof x!=='string'||x.length>20000))errors.push('Study settings must be bounded text.');
 if(study.benchmarks.length>500||study.requests.length>500)errors.push('Study record limit exceeded.');
 for(const b of study.benchmarks.slice(0,501))errors.push(...validateBenchmark(b,configIds));
 if(new Set(study.benchmarks.map(b=>b?.id)).size!==study.benchmarks.length)errors.push('Benchmark identifiers must be unique.');
 for(const r of study.requests.slice(0,501))if(!r||typeof r.id!=='string'||!STUDY_STAGES.some(s=>s[0]===r.stage)||r.status!=='Prepared locally'||!Number.isInteger(r.caseRevision)||r.caseRevision<1||typeof r.date!=='string')errors.push('Invalid study request record.');
 return errors;
}
export function benchmarkKey(b){return JSON.stringify([b.protocol,b.taskVersion,b.sceneVersion,b.conditions,b.evidence]);}
export function studyRequest(c,configs,stage,id,date){
 const area=STUDY_STAGES.find(x=>x[0]===stage);if(!area)throw new Error('Unknown study stage.');
 const settings=c.study?.settings||{};
 return {id,date,stage,status:'Prepared locally',externalExecution:false,caseId:c.id,caseRevision:c.revision,studyRevision:c.study?.revision||1,scope:'September 2026 AWS functional prototype',runner:area[3],settings:{...settings},process:c.actions,scenarios:c.scenarios,robotConfigurations:configs.filter(v=>v.realProduct),taskSchema:{format:'Planning manifest; not an executable Isaac Lab configuration',scene:'OpenUSD reference',environment:'Isaac Lab manager-based configuration',registration:'Gymnasium task',observations:settings.observations||null,actions:settings.actions||null,rewards:settings.rewards||null,terminations:settings.terminations||null,episodes:settings.episodes||null},requiredOutputs:['Versioned artifacts and exact configuration','Run conditions, seeds, and sample counts','Failures, recovery, and task timing distributions','Performance and GPU running costs','Case revision and validity limits'],boundary:'No GPU, capture, simulation, training, production integration, or physical robot command is executed here.'};
}
