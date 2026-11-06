import {verifyGnaniLive} from '../src/gnani-live-smoke.js';
if(!process.env.GNANI_API_KEY){console.error('GNANI_API_KEY environment setting missing. No live request sent.');process.exit(1);}
const r=await verifyGnaniLive({apiKey:process.env.GNANI_API_KEY});
console.log(JSON.stringify(r,null,2));
if(!r.ok)process.exitCode=1;
