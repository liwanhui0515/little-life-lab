import {validateRecord} from './core.js';
import {snapshot,restore} from './db.js';
export const MAX_BACKUP=150*1024*1024;
export function asDataURL(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('照片读取失败'));r.readAsDataURL(blob);});}
export async function digest(value){const bytes=new TextEncoder().encode(JSON.stringify(value));const hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('');}
export async function makeBackup(){const {records,photos}=await snapshot();const serialized=[];for(const p of photos)serialized.push({id:p.id,data:await asDataURL(p.blob)});const payload={records,photos:serialized};const envelope={app:'little-life-lab',version:1,exportedAt:new Date().toISOString(),checksum:await digest(payload),payload};const text=JSON.stringify(envelope);if(new Blob([text]).size>MAX_BACKUP)throw Error('备份超过 150 MB 的 V1.0 导入上限；请先在电脑端保留数据，勿清理浏览器。');return text;}
export async function inspectBackup(text){
 let b;try{b=JSON.parse(text);}catch{throw Error('不是有效的 JSON 备份文件');}
 if(b.app!=='little-life-lab'||b.version!==1)throw Error('不支持此文件或备份版本；请使用 V1 完整备份');
 if(!b.payload||!Array.isArray(b.payload.records)||!Array.isArray(b.payload.photos)||b.payload.records.length>100000||b.payload.photos.length>10000)throw Error('备份结构或数量无效');
 if(await digest(b.payload)!==b.checksum)throw Error('完整性校验失败：文件可能不完整或被修改，未更改本机数据');
 const ids=new Set();for(const r of b.payload.records){validateRecord(r);if(ids.has(r.id))throw Error('备份包含重复记录');ids.add(r.id);}
 const photoIds=new Set(),photos=[];
 for(const p of b.payload.photos){if(typeof p.id!=='string'||!p.id||p.id.length>160||photoIds.has(p.id)||typeof p.data!=='string'||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(p.data))throw Error('照片格式无效');photoIds.add(p.id);const [head,body]=p.data.split(',');let bytes;try{bytes=Uint8Array.from(atob(body),c=>c.charCodeAt(0));}catch{throw Error('照片数据损坏');}if(bytes.length>8*1024*1024)throw Error('单张备份照片超过 8 MB 上限');const blob=new Blob([bytes],{type:head.slice(5,head.indexOf(';'))});try{const bitmap=await createImageBitmap(blob);if(bitmap.width>6000||bitmap.height>6000)throw Error();bitmap.close();}catch{throw Error('备份中有无法解码的照片');}photos.push({id:p.id,blob});}
 for(const r of b.payload.records)for(const id of r.photos||[])if(!photoIds.has(id))throw Error('备份缺少照片，无法完整恢复');
 return {records:b.payload.records,photos,exportedAt:b.exportedAt,checksum:b.checksum};
}
export async function applyBackup(checked,mode){if(!['merge','replace'].includes(mode))throw Error('无效恢复模式');await restore(checked.records,checked.photos,mode);}
export function downloadBackup(text,name){const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
export async function processPhoto(file){if(!/^image\/(jpeg|png|webp)$/.test(file.type))throw Error('请选择 JPG、PNG 或 WebP 照片；HEIC 请先转换');if(file.size>20*1024*1024)throw Error('单张原照片请小于 20 MB');let bitmap;try{bitmap=await createImageBitmap(file);}catch{throw Error('照片无法读取，请换一张重试');}const ratio=Math.min(1,1600/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*ratio);canvas.height=Math.round(bitmap.height*ratio);const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.82));if(!blob)throw Error('照片处理失败');return {id:crypto.randomUUID(),blob};}
