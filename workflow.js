'use strict';
(() => {
const baseRender=render,baseOpen=openDetail,baseLicenseDetail=licenseDetail,baseTasks=tasks,baseCommit=commit;
const assistance={'':'ไม่มี / ยังไม่ระบุ','เยี่ยมบ้าน':'ประเมินและดูแลที่บ้าน','ติดตามสุขภาพ':'ติดตามอาการและให้คำแนะนำ','ช่วยเหลือการเดินทาง':'ประสานการเดินทางไปรับบริการ','ช่วยเหลือด้านสวัสดิการ':'ประสานสิทธิและสวัสดิการ','อื่น ๆ':'ระบุความต้องการเพิ่มเติม'};
const flows={
 dashboard:['ตรวจภาพรวมและงานเกินกำหนด','เปิดรายการต้นทาง','มอบหมายและติดตามผล'],
 visits:['รับข้อมูลจากประชาชน / ผู้ดูแล / อสม.','ตรวจข้อมูลและนัดเจ้าหน้าที่','ลงพื้นที่และบันทึกผล','นัดติดตามหรือสิ้นสุดการเยี่ยม'],
 complaints:['รับและตรวจข้อมูลคำร้อง','มอบหมายผู้รับผิดชอบและกำหนดติดตาม','บันทึกการดำเนินงาน','ยืนยันผลแก้ไขและรับประเมิน'],
 licenses:['รับข้อมูลร้านและเอกสารใบอนุญาต','ตรวจข้อมูลเจ้าของและวันหมดอายุ','ลงทะเบียนหรือบันทึกการต่ออายุ','ติดตามกำหนดต่ออายุ'],
 establishments:['เลือกสถานประกอบการ','ลงพื้นที่ตรวจสุขาภิบาล','แจ้งข้อบกพร่องและกำหนดแก้ไข','ตรวจติดตามและสรุปผล'],
 projects:['กำหนดวัตถุประสงค์และผู้รับผิดชอบ','ประสานเครือข่ายและติดตามงาน','บันทึกผลและปัญหา','ตรวจงานค้างก่อนปิดโครงการ'],
 tasks:['ตรวจวันครบกำหนด','เปิดงานต้นทาง','ดำเนินการและบันทึกผล','ตรวจว่างานค้างอัปเดต']
};
function workflowNote(){return '<div class="workflow-note"><strong>ขั้นตอนการทำงาน</strong><ol>'+flows[page].map(x=>'<li>'+x+'</li>').join('')+'</ol></div>'}
function guardDate(d,label){if(d>today())throw Error(label+'ต้องไม่เป็นวันที่ในอนาคต')}
function currentActor(){return staff[0]}
commit=async function(fn,message){return baseCommit(s=>{
 fn(s);s.audit=s.audit||[];
 for(const type of ['people','visits','complaints','establishments','projects']){
 const old=new Map((state[type]||[]).map(x=>[x.id,x]));
 for(const x of s[type]||[]){const prior=old.get(x.id);if(JSON.stringify(prior)!==JSON.stringify(x)){const fields=Object.keys(x).filter(k=>JSON.stringify(prior?.[k])!==JSON.stringify(x[k])).filter(k=>!['images','id'].includes(k));s.audit.unshift({id:uid('A'),recordId:x.id,type,at:stamp(),date:today(),actor:role==='staff'?'เจ้าหน้าที่':'ประชาชน',action:prior?'ปรับปรุงข้อมูล':'เพิ่มข้อมูล',fields:fields.join(', ')})}}
 }s.audit=s.audit.slice(0,1000);
},message)};
function auditHtml(id){const rows=(state.audit||[]).filter(a=>a.recordId===id);return '<h3 style="margin-top:24px">ประวัติการเปลี่ยนแปลง</h3>'+table(['วันเวลา','ผู้ดำเนินการ','รายการ'],rows.map(a=>[new Date(a.at).toLocaleString('th-TH',{timeZone:'Asia/Bangkok'}),esc(a.actor),esc(a.action)]))}
render=function(){baseRender();if(role!=='staff')return;
 if(flows[page]&&!$('.workflow-note'))$('#content').insertAdjacentHTML('afterbegin',workflowNote());
 if(page==='licenses'&&!$('#new-establishment')){$('.heading').insertAdjacentHTML('beforeend','<button id="new-establishment">＋ เพิ่มสถานประกอบการ</button>');$('#new-establishment').onclick=()=>establishmentForm()}
 if(page==='tasks'){const overdue=tasks().filter(t=>t.due<today()).length;$('#content').insertAdjacentHTML('afterbegin','<p class="sub">งานเกินกำหนด '+overdue+' รายการ · รวมการต่ออายุใบอนุญาต</p>')}
};
function sourceFields(x){return field('source','แหล่งที่มาของข้อมูล',x.source||'ประชาชนแจ้ง','text',['ประชาชนแจ้ง','ผู้ดูแลแจ้ง','อสม.ประสาน','ลงพื้นที่สำรวจ','เอกสารจากหน่วยงาน'],true)+field('received','วันที่รับข้อมูล',x.received||today(),'date',null,true)}
visitForm=function(v={},personId=''){
 const persons=state.people.map(p=>({value:p.id,label:p.name+' · '+p.contact}));
 if(!v.id)persons.unshift({value:'NEW',label:'＋ ผู้รับการเยี่ยมบ้านรายใหม่'});
 modal(v.id?'แก้ไขนัดหมาย / บันทึกผลเยี่ยมบ้าน':'เพิ่มนัดเยี่ยมบ้าน',form(
 field('personId','ผู้รับการเยี่ยมบ้าน',v.personId||personId||(state.people[0]?.id||'NEW'),'text',persons,true)+
 field('owner','เจ้าหน้าที่ผู้รับผิดชอบ',v.owner||staff[0],'text',staff,true)+
 '<div id="new-person-fields" class="field full" hidden><div class="fields">'+
 field('personName','ชื่อ–นามสกุล','','text')+field('personAge','อายุ',60,'number')+
 field('personContact','เบอร์ติดต่อ','','tel')+field('personAddress','ที่อยู่','','textarea')+
 field('personCommunity','ชุมชน',communities[0],'text',communities)+field('personGroup','กลุ่มผู้รับบริการ',groups[0],'text',groups)+'</div></div>'+
 sourceFields(v)+field('due','วันนัด',v.due||today(),'date',null,true)+field('actual','วันที่เยี่ยมจริง',v.actual||'','date')+
 field('status','สถานะ',v.status||'รอดำเนินการ','text',v.status==='ยกเลิกนัด'?['ยกเลิกนัด']:['รอดำเนินการ','เยี่ยมแล้ว','ต้องติดตาม'],true)+
 field('follow','วันติดตามครั้งถัดไป',v.follow||'','date')+
 field('result','ผลการดูแล',v.result||'','textarea')+field('problem','ปัญหาที่พบ',v.problem||'','textarea')+
 field('assistance','ความต้องการรับบริการ / การช่วยเหลือ (ถ้ามี)',Object.hasOwn(assistance,v.needs)?v.needs:'','text',Object.keys(assistance).map(k=>({value:k,label:k||'ไม่มี / ยังไม่ระบุ'})))+
 field('needsDetail','รายละเอียดเพิ่มเติม',Object.hasOwn(assistance,v.needs)?'':v.needs||'','textarea')+
 '<div id="assistance-help" class="field full sub"></div>'));
 if(!v.id){for(const key of ['actual','follow','result','assistance'])$('#f-'+key)?.closest('.field')?.remove();$('#f-status').innerHTML='<option value="รอดำเนินการ">รอดำเนินการ</option>';$('#assistance-help').remove()}
 const toggle=()=>{const isNew=$('#f-personId').value==='NEW';$('#new-person-fields').hidden=!isNew;['personName','personContact','personAddress'].forEach(k=>$('#f-'+k).required=isNew)};
 $('#f-personId').onchange=toggle;toggle();
 if($('#f-assistance')){const help=()=>$('#assistance-help').textContent=assistance[$('#f-assistance').value];$('#f-assistance').onchange=help;help()}
 bindForm(d=>{
 if(!v.id)Object.assign(d,{actual:'',follow:'',result:'',assistance:''});
 guardDate(d.received,'วันที่รับข้อมูล');if(d.actual)guardDate(d.actual,'วันที่เยี่ยมจริง');
 if(d.status==='ต้องติดตาม'&&!d.follow)throw Error('กรุณาระบุวันติดตามครั้งถัดไป');
 if(['เยี่ยมแล้ว','ต้องติดตาม'].includes(d.status)&&(!d.actual||!d.result))throw Error('กรุณากรอกวันที่เยี่ยมจริงและผลการดูแล');
 if(d.follow&&d.follow<=(d.actual||d.due))throw Error('วันติดตามต้องหลังวันเยี่ยมหรือวันนัด');
 if(d.personId==='NEW'&&!normalizePhone(d.personContact))throw Error('กรุณากรอกเบอร์ติดต่อให้ถูกต้อง');
 if(state.visits.some(x=>x.id!==v.id&&x.personId===d.personId&&x.due===d.due&&!['เยี่ยมแล้ว','ยกเลิกนัด'].includes(x.status)))throw Error('มีนัดของบุคคลนี้ในวันเดียวกันแล้ว');
 return commit(s=>{
 let pid=d.personId;if(pid==='NEW'){pid=uid('P');s.people.push({id:pid,name:d.personName,age:Number(d.personAge),contact:d.personContact,address:d.personAddress,community:d.personCommunity,group:d.personGroup,needs:d.assistance,services:[],source:d.source,received:d.received})}
 const id=v.id||uid('V'),record={id,personId:pid,owner:d.owner,source:d.source,received:d.received,due:d.due,actual:d.actual,status:d.status,result:d.result,problem:d.problem,needs:d.assistance,needsDetail:d.needsDetail,follow:d.follow};
 if(v.id)Object.assign(s.visits.find(x=>x.id===v.id),record);else s.visits.push(record);
 if(d.follow){const follow=s.visits.find(x=>x.parentId===id&&!['เยี่ยมแล้ว','ยกเลิกนัด'].includes(x.status));if(follow)Object.assign(follow,{due:d.follow,owner:d.owner,personId:pid});else s.visits.push({id:uid('V'),parentId:id,personId:pid,owner:d.owner,due:d.follow,status:'รอดำเนินการ',source:'ลงพื้นที่สำรวจ',received:today(),actual:'',result:'',problem:'',needs:'',follow:''})}
 else s.visits=s.visits.filter(x=>x.parentId!==id||['เยี่ยมแล้ว','ยกเลิกนัด'].includes(x.status));
 log(s,'บันทึกการเยี่ยมบ้าน · '+s.people.find(p=>p.id===pid).name);
 });
 });
};
function cancelVisit(v){modal('ยกเลิกนัดเยี่ยมบ้าน',form(field('reason','เหตุผลการยกเลิก','','textarea',null,true,true),'ยืนยันยกเลิกนัด'));bindForm(d=>commit(s=>{const ids=[v.id,...s.visits.filter(x=>x.parentId===v.id&&x.status!=='เยี่ยมแล้ว').map(x=>x.id)];s.visits.filter(x=>ids.includes(x.id)).forEach(x=>{x.status='ยกเลิกนัด';x.cancelReason=d.reason});log(s,'ยกเลิกนัดเยี่ยมบ้าน · '+v.id)},'ยกเลิกนัดแล้ว'))}
function establishmentForm(e={}){
 const l=e.license||{};modal(e.id?'แก้ไขข้อมูลสถานประกอบการ':'เพิ่มสถานประกอบการ',form(
 field('name','ชื่อสถานประกอบการ',e.name||'','text',null,true,true)+
 field('type','ประเภท',e.type||'ร้านอาหาร','text',['ร้านอาหาร','ตลาด / ศูนย์อาหาร'],true)+field('community','ชุมชน',e.community||communities[0],'text',communities,true)+
 field('address','ที่ตั้ง',e.address||'','textarea',null,true,true)+field('contact','เบอร์ติดต่อ',e.contact||'','tel',null,true)+field('owner','เจ้าหน้าที่ผู้รับผิดชอบ',e.owner||staff[0],'text',staff,true)+
 field('ownerName','ชื่อเจ้าของ',l.ownerName||'','text',null,true)+field('opened','วันที่เปิด',l.opened||today(),'date',null,true)+
 field('number','เลขที่ใบอนุญาต',l.number||'','text',null,true)+field('issued','วันที่ออกใบอนุญาต',l.issued||l.opened||today(),'date',null,true)+
 field('expires','วันหมดอายุใบอนุญาต',l.expires||date(365),'date',null,true)+field('certifier','ผู้รับรองตามเอกสาร',l.certifier||'','text',null,true)+sourceFields(e)+(e.id?field('correctionReason','เหตุผลการแก้ไขข้อมูล','','textarea',null,true,true):'')));
 bindForm(d=>{if(!normalizePhone(d.contact))throw Error('กรุณาระบุเบอร์ติดต่อที่ถูกต้อง');if(d.expires<=d.issued||d.issued<d.opened)throw Error('วันออกใบอนุญาตต้องไม่ก่อนวันเปิด และวันหมดอายุต้องหลังวันออก');guardDate(d.issued,'วันออกใบอนุญาต');guardDate(d.received,'วันที่รับข้อมูล');
 if(state.establishments.some(x=>x.id!==e.id&&x.license.number&&x.license.number===d.number))throw Error('เลขที่ใบอนุญาตนี้ถูกบันทึกแล้ว');
 return commit(s=>{const record={name:d.name,type:d.type,community:d.community,address:d.address,contact:d.contact,owner:d.owner,source:d.source,received:d.received,license:{ownerName:d.ownerName,opened:d.opened,number:d.number,issued:d.issued,expires:d.expires,certifier:d.certifier}};
 if(e.id)Object.assign(s.establishments.find(x=>x.id===e.id),record);else s.establishments.push({...record,id:uid('E'),status:'รอตรวจ',deadline:'',inspections:[],renewals:[]});log(s,'บันทึกสถานประกอบการ · '+d.name)});
 });
}
function renewLicense(e){modal('บันทึกการต่ออายุใบอนุญาต',form(field('number','เลขที่ใบอนุญาตใหม่',e.license.number||'','text',null,true)+field('issued','วันที่ออกใบอนุญาต',today(),'date',null,true)+field('expires','วันหมดอายุใหม่',date(365),'date',null,true)+field('certifier','ผู้รับรองตามเอกสาร',e.license.certifier,'text',null,true)+field('note','รายละเอียดการตรวจสอบเอกสาร','','textarea',null,true,true)+'<label class="field full"><input type="checkbox" name="verified" value="yes" required style="width:auto"> ตรวจสอบเอกสารใบอนุญาตแล้ว</label>','บันทึกการต่ออายุ'));bindForm(d=>{guardDate(d.issued,'วันที่ออกใบอนุญาต');if(d.expires<=e.license.expires||d.expires<=d.issued)throw Error('วันหมดอายุใหม่ต้องหลังวันหมดอายุเดิมและวันออกใบอนุญาต');if(state.establishments.some(x=>x.id!==e.id&&x.license.number===d.number))throw Error('เลขที่ใบอนุญาตซ้ำ');const save=()=>commit(s=>{const x=s.establishments.find(x=>x.id===e.id);x.renewals=x.renewals||[];x.renewals.push({date:today(),previous:{...x.license},...d});Object.assign(x.license,{number:d.number,issued:d.issued,expires:d.expires,certifier:d.certifier});log(s,'บันทึกการต่ออายุใบอนุญาต · '+x.name)});confirmModal('ยืนยันบันทึกการต่ออายุ','ยืนยันข้อมูลตามเอกสาร วันหมดอายุใหม่ '+fmt(d.expires),save)})}
function complaintInfo(c){modal('แก้ไขข้อมูลรับเรื่อง '+c.id,form(field('reporter','ชื่อผู้แจ้ง',c.reporter,'text',null,true)+field('contact','ช่องทางติดต่อ',c.contact,'text',null,true)+field('category','ประเภท',c.category,'text',cats,true)+field('community','ชุมชน',c.community,'text',communities,true)+field('location','สถานที่',c.location,'text',null,true,true)+field('description','รายละเอียด',c.description,'textarea',null,true,true)+field('reason','เหตุผลการแก้ไขข้อมูล','','textarea',null,true,true)));bindForm(d=>{validateContact(d.contact);return commit(s=>{const x=s.complaints.find(x=>x.id===c.id);const {reason,...data}=d;Object.assign(x,data);x.timeline.push({at:stamp(),date:today(),status:x.status,public:'ปรับปรุงข้อมูลรับเรื่อง',internal:'เหตุผล: '+reason});log(s,'แก้ไขข้อมูลรับเรื่อง · '+c.id)})})}
licenseDetail=function(id,tab){baseLicenseDetail(id,tab);const e=state.establishments.find(x=>x.id===id);if($('#edit-license')){$('#edit-license').textContent='แก้ไขข้อมูลสถานประกอบการ';$('#edit-license').onclick=()=>establishmentForm(e);$('.actions').insertAdjacentHTML('beforeend','<button id="renew-license">บันทึกต่ออายุ</button>');$('#renew-license').onclick=()=>renewLicense(e);$('.dialog').insertAdjacentHTML('beforeend',detailPairs({'เลขที่ใบอนุญาต':e.license.number,'วันที่ออก':fmt(e.license.issued),'ที่ตั้ง':e.address,'เบอร์ติดต่อ':e.contact})+'<h3 style="margin-top:24px">ประวัติการต่ออายุ</h3>'+table(['วันที่บันทึก','เลขที่ใบอนุญาต','วันหมดอายุใหม่','ผลตรวจเอกสาร'],(e.renewals||[]).map(r=>[fmt(r.date),esc(r.number),fmt(r.expires),esc(r.note)])))}$('.dialog').insertAdjacentHTML('beforeend',auditHtml(id))};
openDetail=function(type,id,tab){
 if(type==='licenses'){licenseDetail(id);return}baseOpen(type,id,tab);if(type==='establishments')return;const x=state[type]?.find(x=>x.id===id);if(!x)return;
 if(type==='complaints'){$('.actions').insertAdjacentHTML('afterbegin','<button class="secondary" id="edit-complaint-info">แก้ไขข้อมูลรับเรื่อง</button>');$('#edit-complaint-info').onclick=()=>complaintInfo(x)}
 if(type==='visits'){$('.actions').insertAdjacentHTML('afterbegin','<button class="secondary" id="edit-visit-person">แก้ไขข้อมูลผู้รับการเยี่ยมบ้าน</button>');$('#edit-visit-person').onclick=()=>personForm(state.people.find(p=>p.id===x.personId));$('.dialog').insertAdjacentHTML('beforeend',detailPairs({'แหล่งที่มา':x.source,'วันที่รับข้อมูล':fmt(x.received),'รายละเอียดความช่วยเหลือ':x.needsDetail,'เหตุผลยกเลิก':x.cancelReason}));
 if(!['เยี่ยมแล้ว','ยกเลิกนัด'].includes(x.status)){$('.actions').insertAdjacentHTML('beforeend','<button class="danger" id="cancel-visit">ยกเลิกนัด</button>');$('#cancel-visit').onclick=()=>cancelVisit(x)}
 if(x.status==='ยกเลิกนัด'&&$('#edit-detail'))$('#edit-detail').remove();
 }
 if(type==='projects'){
 if($('#finish-project'))$('#finish-project').onclick=()=>{if(x.coord.some(c=>c.task&&!c.done)){notify('กรุณาดำเนินงานติดตามให้เสร็จก่อนปิดโครงการ');return}if(!x.results.some(r=>r.result.trim())){notify('กรุณาบันทึกผลดำเนินงานก่อนปิดโครงการ');return}confirmModal('ยืนยันปิดโครงการ','ตรวจผลดำเนินงานและงานติดตามครบแล้ว',()=>commit(s=>{s.projects.find(p=>p.id===id).status='เสร็จสิ้น';log(s,'ปิดโครงการ · '+x.name)}))};
 if(x.status==='เสร็จสิ้น')for(const selector of ['#coord','#result','#edit-detail'])$(selector)?.remove();
 }
 $('.dialog').insertAdjacentHTML('beforeend',auditHtml(id));
};
tasks=function(){return [...baseTasks().filter(t=>t.page!=='visits'||state.visits.find(v=>v.id===t.id)?.status!=='ยกเลิกนัด'),...state.establishments.filter(e=>e.license?.expires&&e.license.expires<=date(30)).map(e=>({key:'LIC-'+e.id,type:'ใบอนุญาต',name:'ต่ออายุใบอนุญาต · '+e.name,owner:e.owner,due:e.license.expires,page:'licenses',id:e.id}))].sort((a,b)=>a.due.localeCompare(b.due))};
const oldInspection=inspectionForm;inspectionForm=function(e){oldInspection(e);const oldSubmit=$('#editor').onsubmit;$('#editor').onsubmit=async event=>{const d=Object.fromEntries(new FormData(event.target));if(d.date>today()||(d.result==='ต้องปรับปรุง'&&d.deadline<d.date)){event.preventDefault();$('#form-error').textContent='วันที่ตรวจต้องไม่เป็นวันในอนาคต และกำหนดแก้ไขต้องไม่ก่อนวันตรวจ';return}return oldSubmit(event)}};
const oldProgress=progressForm;progressForm=function(c){oldProgress(c);const oldSubmit=$('#editor').onsubmit;$('#editor').onsubmit=async event=>{const d=Object.fromEntries(new FormData(event.target));if(d.status!=='แก้ไขแล้ว'&&!d.follow){event.preventDefault();$('#form-error').textContent='กรุณากำหนดวันติดตามสำหรับคำร้องที่ยังไม่ปิด';return}if(c.status==='รับเรื่องแล้ว'&&d.status==='แก้ไขแล้ว'){event.preventDefault();$('#form-error').textContent='กรุณาบันทึกสถานะกำลังดำเนินการก่อนปิดเรื่อง';return}return oldSubmit(event)}};

function coordinationForm(project,record={}){modal(record.id?'แก้ไขการประสานงาน':'บันทึกการประสานงาน',form(field('date','วันที่ติดต่อ',record.date||today(),'date',null,true)+field('contact','ผู้ประสานงาน',record.contact||'','text',null,true)+field('detail','รายละเอียด',record.detail||'','textarea',null,true,true)+field('task','งานที่ต้องติดตาม',record.task||'','text')+field('due','กำหนดติดตาม',record.due||'','date')+field('completion','สถานะงานติดตาม',record.done?'เสร็จสิ้น':'รอดำเนินการ','text',['รอดำเนินการ','เสร็จสิ้น'])+field('outcome','ผลการติดตาม',record.outcome||'','textarea',null,false,true)));bindForm(d=>{guardDate(d.date,'วันที่ติดต่อ');if(d.task&&!d.due)throw Error('กรุณาระบุกำหนดติดตาม');if(d.due&&d.due<d.date)throw Error('กำหนดติดตามต้องไม่ก่อนวันติดต่อ');if(d.completion==='เสร็จสิ้น'&&!d.outcome)throw Error('กรุณาบันทึกผลการติดตามก่อนระบุว่าเสร็จสิ้น');return commit(s=>{const p=s.projects.find(p=>p.id===project.id);const data={id:record.id||uid('CO'),date:d.date,contact:d.contact,detail:d.detail,task:d.task,due:d.due,done:d.completion==='เสร็จสิ้น',outcome:d.outcome};if(record.id)Object.assign(p.coord.find(c=>c.id===record.id),data);else p.coord.push(data);log(s,'บันทึกการประสานงาน · '+p.name)})})}
coordForm=function(p){coordinationForm(p)};
const detailWithWorkflow=openDetail;
openDetail=function(type,id,tab){detailWithWorkflow(type,id,tab);if(type!=='projects')return;const p=state.projects.find(p=>p.id===id);if(!p||p.status==='เสร็จสิ้น')return;
if(tab==='การประสานงาน'){$('.dialog').insertAdjacentHTML('beforeend','<h3 style="margin-top:20px">จัดการรายการประสานงาน</h3>'+p.coord.map(c=>'<div class="task"><span class="taskbody">'+esc(c.task||c.detail)+'<small>'+esc(c.outcome||'ยังไม่มีผลติดตาม')+'</small></span><button class="secondary" data-co-edit="'+c.id+'">แก้ไข / บันทึกผล</button></div>').join(''));document.querySelectorAll('[data-co-edit]').forEach(b=>b.onclick=()=>coordinationForm(p,p.coord.find(c=>c.id===b.dataset.coEdit)));document.querySelectorAll('[data-co-done]').forEach(b=>b.onclick=()=>coordinationForm(p,p.coord.find(c=>c.id===b.dataset.coDone)))}};


const plainLicensePage=licensePage;
licensePage=function(){plainLicensePage();if(!$('.workflow-note'))$('#content').insertAdjacentHTML('afterbegin',workflowNote());if(!$('#new-establishment')){$('.heading').insertAdjacentHTML('beforeend','<button id="new-establishment">＋ เพิ่มสถานประกอบการ</button>');$('#new-establishment').onclick=()=>establishmentForm()}};

if(typeof state!=='undefined'&&state)render();
})();
