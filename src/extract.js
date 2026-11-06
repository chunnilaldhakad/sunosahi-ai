/** Conservative text-to-fields preview. Null means human review required. No model inference here. */
import {normalizeDigits} from './core.js';
export function extractSpokenTerms(text){
  const s=normalizeDigits(String(text||'')).replace(/,(?=\d{3}(\D|$))/g,'');
  const out={work:null,days:null,rate:null,advance:null};
  const words=s.toLowerCase().replace(/\b(pandrah|pandara|fifteen)\b/g,'15').replace(/\b(pachas|pachaas|fifty)\b/g,'50').replace(/पंद्रह|पन्द्रह/g,'15').replace(/पचास/g,'50').replace(/छह सौ पचास|six hundred fifty/g,'650');
  const day=/(\d{1,3})\s*(?:din|days?\b|दिन|दिवस)/iu.exec(words);
  if(day)out.days=day[1];
  const ratePatterns=[/(?:रोज|रोज़|रोजाना|दिहाड़ी|daily|per\s*day|har\s*din)\s*(?:का|के|rate|रेट|₹|rs\.?|रुपये)?\s*(\d+(?:\.\d{1,2})?)/iu,/(?:₹|rs\.?|inr)\s*(\d+(?:\.\d{1,2})?)\s*(?:per\s*day|daily|रोज|रोजाना|प्रतिदिन)/iu,/(\d+(?:\.\d{1,2})?)\s*(?:रुपये|रुपए|rupees?)?\s*(?:per\s*day|रोज|रोजाना|दिहाड़ी)/iu];
  for(const pattern of ratePatterns){const m=pattern.exec(words);if(m){out.rate=m[1];break;}}
  const adv=/(?:advance|एडवांस|पेशगी|अग्रिम)\s*(?:₹|rs\.?|रुपये|रुपए|का|की)?\s*(\d+(?:\.\d{1,2})?)/iu.exec(words);
  if(adv)out.advance=adv[1];
  else if(/(?:no\s*advance|advance\s*(?:nahi|nahin|none)|एडवांस\s*(?:नहीं|नही)|बिना\s*एडवांस)/iu.test(words))out.advance='0';
  const work=/(?:काम|work|kaam)\s*[:\-–]\s*([\p{L}\p{M}\s]{3,55}?)(?=[,.;।\n]|$)/iu.exec(words);
  if(work)out.work=work[1].trim().replace(/\s+/g,' ').slice(0,100);
  return out;
}
