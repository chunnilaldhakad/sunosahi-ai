/** Vercel serverless function. Live Gnani credentials remain in Vercel environment settings. */
import {createSunoSahiHandler} from '../../server.js';
const route='/api/gnani/selftest';
const handle=createSunoSahiHandler();
export default function handler(req,res){
  // The serverless function owns a fixed route; never trust incoming rewritten paths.
  req.url=route;
  return handle(req,res);
}
