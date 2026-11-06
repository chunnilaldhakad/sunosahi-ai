import test from 'node:test';import assert from 'node:assert/strict';
import {extractSpokenTerms} from '../src/extract.js';

test('Hindi digit transcription detects days, rate and advance',()=>{
  const x=extractSpokenTerms('मैंने १५ दिन काम किया, रोज ₹६५० और एडवांस ₹०');
  assert.equal(x.days,'15');assert.equal(x.rate,'650');assert.equal(x.advance,'0');
});
test('spoken code mix detects fifteen days and daily wages',()=>{
  const x=extractSpokenTerms('Maine pandrah din kaam kiya, daily 650 advance 0');assert.equal(x.days,'15');assert.equal(x.rate,'650');assert.equal(x.advance,'0');
});
test('fifty vs fifteen remain distinct',()=>{
  const a=extractSpokenTerms('15 days, daily 650, advance 0');const b=extractSpokenTerms('fifty days, daily 560, advance 0');assert.equal(a.days,'15');assert.equal(b.days,'50');assert.equal(a.rate,'650');assert.equal(b.rate,'560');
});
test('unrecognized values must remain null',()=>{const x=extractSpokenTerms('kal kaam ke bare mein baat hui');assert.equal(x.days,null);assert.equal(x.rate,null);assert.equal(x.advance,null);});
test('negative rates are not extracted',()=>{const x=extractSpokenTerms('daily -500 advance -50');assert.equal(x.rate,null);assert.equal(x.advance,null);});
test('generic kaam kiya is not hallucinated into work description',()=>{const x=extractSpokenTerms('Maine 15 din kaam kiya, daily 650 advance 0');assert.equal(x.work,null);});
