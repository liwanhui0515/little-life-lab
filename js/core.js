export const CATEGORIES=['学习','睡眠','运动','娱乐','吃饭','通勤','生活琐事','其他'];
export const MEALS=['早餐','午餐','晚餐','加餐'];
export const STATUS=['未完成','部分完成','已完成'];
export const COLORS=['#91aa8c','#a6aec8','#dca998','#d8bc86','#a9c5bd','#c1aed1','#b6b89b','#b4c5d2','#e9ebe5'];
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function dateKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function shiftDate(date,days){const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+days);return dateKey(d);}
export function weekDates(date){const d=new Date(date+'T12:00:00'), start=shiftDate(date,-((d.getDay()+6)%7));return Array.from({length:7},(_,i)=>shiftDate(start,i));}
export const minutesLabel=n=>n>=60?`${Math.floor(n/60)}小时${n%60?`${n%60}分`:''}`:`${n}分钟`;
export const sum=(rows,key)=>rows.reduce((s,r)=>s+(Number(r[key])||0),0);
export function validDate(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00');return !isNaN(d)&&dateKey(d)===s&&s>='1900-01-01'&&s<='2199-12-31';}
export function clockMinutes(s){if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(s))return NaN;return Number(s.slice(0,2))*60+Number(s.slice(3));}
export function validateRecord(r){
 const fail=m=>{throw Error(m);};const str=(x,max=20000)=>typeof x==='string'&&x.length<=max;const num=(x,max)=>Number.isFinite(x)&&x>=0&&x<=max;
 if(!r||!['weight','meal','task','time','journal'].includes(r.type)||!str(r.id,160)||!r.id||!validDate(r.date)||!Number.isFinite(r.updatedAt)||r.updatedAt<0)fail('记录格式或日期无效');
 if(r.type==='weight'&&(r.id!==`weight:${r.date}`||!num(r.kg,500)||r.kg<=0))fail('体重须大于 0 且不超过 500 kg');
 if(r.type==='journal'&&r.id!==`journal:${r.date}`)fail('日记标识与日期不一致');
 if(['meal','journal'].includes(r.type)&&(!Array.isArray(r.photos)||r.photos.length>12||r.photos.some(p=>!str(p,160)||!p)))fail('每条记录最多 12 张照片');
 if(r.type==='meal'&&(!MEALS.includes(r.meal)||!str(r.text)||!(r.time===''||Number.isFinite(clockMinutes(r.time)))||(!r.text.trim()&&!r.photos.length)))fail('请填写饮食描述或添加照片，并检查时间');
 if(r.type==='task'&&(!str(r.title,200)||!r.title.trim()||!STATUS.includes(r.status)||!(r.planned===null||num(r.planned,1440)&&Number.isInteger(r.planned))||!num(r.actual,1440)||!Number.isInteger(r.actual)||!str(r.result)||!str(r.difficulty)))fail('请检查任务名称、完成状态和时长（0～1440 分钟）');
 if(r.type==='journal'&&(['text','happy','hard','quote'].some(k=>!str(r[k]))||(!['text','happy','hard','quote'].some(k=>r[k].trim())&&!r.photos.length)))fail('写下一句话，或留下一张照片吧');
 if(r.type==='time'){
  if(!str(r.category,40)||!r.category.trim()||!num(r.minutes,1440)||r.minutes<1||!Number.isInteger(r.minutes)||!str(r.note,2000)||!['duration','range'].includes(r.mode))fail('请检查时间类别与时长（1～1440 分钟）');
  if(r.mode==='range'){const a=clockMinutes(r.start),b=clockMinutes(r.end);if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a||b-a!==r.minutes)fail('结束时间须晚于开始时间；跨午夜请分两天记录');}
 }
 return r;
}
export function timeSummary(rows){const total=sum(rows,'minutes'),groups=new Map();for(const r of rows)groups.set(r.category,(groups.get(r.category)||0)+r.minutes);const ranges=rows.filter(r=>r.mode==='range').sort((a,b)=>a.start.localeCompare(b.start));let overlap=false,end=-1;for(const r of ranges){const a=clockMinutes(r.start),b=clockMinutes(r.end);if(a<end)overlap=true;end=Math.max(end,b);}return {total,unrecorded:Math.max(0,1440-total),groups:[...groups],overlap,over24:total>1440,hasDuration:rows.some(r=>r.mode==='duration')};}
export function mergeRecords(existing,incoming){const map=new Map(existing.map(r=>[r.id,r]));for(const r of incoming){const old=map.get(r.id);if(!old||r.updatedAt>old.updatedAt)map.set(r.id,r);}return [...map.values()];}
