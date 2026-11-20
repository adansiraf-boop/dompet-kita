'use strict';
/* ====== PENGATURAN: tempel URL Web App dari Apps Script di sini ====== */
const API_URL='https://script.google.com/macros/s/AKfycbwfKtxYr-2_z4qRWIfgiCyMv_xPDsTbwZla43tv8XgPcdb99KHA4bvzwZFY7BgxsKn5/exec';
/* ===================================================================== */
const $=s=>document.querySelector(s),LS=localStorage;
let PIN=LS.pin||'',NAME=LS.name||'',busy=0,f={};
let D=JSON.parse(LS.cache||'null')||{pemasukan:[],pengeluaran:[],transfer:[],rekening:[],kategori:[]};
D={tagihan:[],target:[],...D};
let Q=JSON.parse(LS.queue||'[]');applyQ();
const st={tab:'home',per:'bulan',from:'',to:'',trend:'harian',sub:'rek',q:'',fc:'',ff:'',ft:''};
const iso=d=>new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
const today=()=>iso(new Date()),dt=s=>new Date(s+'T00:00');
const addD=(s,n)=>{const d=dt(s);d.setDate(d.getDate()+n);return iso(d)};
let HID=LS.hide=='1';
const rp=n=>HID?'Rp ••••••':(n<0?'-':'')+'Rp '+Math.abs(Math.round(Number(n)||0)).toLocaleString('id-ID');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtD=s=>dt(s).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});
const sum=a=>a.reduce((s,x)=>s+Number(x.nominal),0);
const inR=(a,x,y)=>a.filter(r=>r.tanggal>=x&&r.tanggal<=y);
const sv=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const I={in:sv('<path d="M12 5v14M6 13l6 6 6-6"/>'),out:sv('<path d="M12 19V5M6 11l6-6 6 6"/>'),tf:sv('<path d="M7 7h12M15 3l4 4-4 4M17 17H5M9 13l-4 4 4 4"/>'),bank:sv('<path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/>'),empty:sv('<path d="M22 12h-6l-2 3h-4l-2-3H2M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/>')};
I.eye=sv('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>');
I.eyeoff=sv('<path d="M17.94 17.94A10.9 10.9 0 0 1 12 19c-6.4 0-10-7-10-7a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.1 9.1 0 0 1 12 5c6.4 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24M1 1l22 22"/>');
const shortD=s=>dt(s).toLocaleDateString('id-ID',{day:'numeric',month:'short'});
const gl=s=>s==today()?'Hari ini':s==addD(today(),-1)?'Kemarin':fmtD(s);
const empty=(m,b)=>`<div class="empty"><div class="eic">${I.empty}</div><p>${m}</p>${b||''}</div>`;
const grp=a=>{const m={};a.forEach(x=>m[x.kategori]=(m[x.kategori]||0)+Number(x.nominal));return Object.entries(m).sort((a,b)=>b[1]-a[1])};
const cats=k=>D.kategori.filter(c=>c.jenis==(k=='in'?'Pemasukan':'Pengeluaran')).map(c=>String(c.nama)).sort((a,b)=>a.localeCompare(b,'id'));
const allTx=()=>[...D.pemasukan.map(x=>({...x,k:'in'})),...D.pengeluaran.map(x=>({...x,k:'out'})),...D.transfer.map(x=>({...x,k:'tf'}))]
 .sort((a,b)=>b.tanggal.localeCompare(a.tanggal)||String(b.dibuat).localeCompare(String(a.dibuat)));
function bal(){const m={};D.rekening.forEach(a=>m[a.nama]=Number(a.saldoawal)||0);
 D.pemasukan.forEach(x=>m[x.rekening]=(m[x.rekening]||0)+Number(x.nominal));
 D.pengeluaran.forEach(x=>m[x.rekening]=(m[x.rekening]||0)-Number(x.nominal));
 D.transfer.forEach(x=>{m[x.dari]=(m[x.dari]||0)-Number(x.nominal);m[x.ke]=(m[x.ke]||0)+Number(x.nominal)});return m}
function range(){const t=today(),d=dt(t);
 if(st.per=='hari')return[t,t];
 if(st.per=='minggu'){const f=addD(t,-((d.getDay()+6)%7));return[f,addD(f,6)]}
 if(st.per=='bulan')return[iso(new Date(d.getFullYear(),d.getMonth(),1)),iso(new Date(d.getFullYear(),d.getMonth()+1,0))];
 const a=st.from||t,b=st.to||t;return a>b?[b,a]:[a,b]}
function prevR(a,b){if(st.per=='bulan'){const d=dt(a);return[iso(new Date(d.getFullYear(),d.getMonth()-1,1)),iso(new Date(d.getFullYear(),d.getMonth(),0))]}
 const n=(dt(b)-dt(a))/864e5+1;return[addD(a,-n),addD(a,-1)]}

/* ---------- API ---------- */
const setSync=m=>$('#sync').textContent=m;
async function api(action,data){busy++;syncLabel(action=='getAll'?'Menyinkronkan…':'Menyimpan…');
 const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),30000),fail=(m,r)=>Object.assign(new Error(m),{retry:r});
 try{let txt;
  try{const r=await fetch(API_URL,{method:'POST',body:JSON.stringify({pin:PIN,action,data}),signal:ctl.signal});txt=await r.text()}catch(e){throw fail(offMsg(),1)}
  let j;try{j=JSON.parse(txt)}catch(e){throw fail('Server sedang sibuk. Coba lagi sebentar lagi.',1)}
  if(!j.ok)throw fail(j.error,!!j.busy);
  D={tagihan:[],target:[],...j.data};LS.cache=JSON.stringify(D);applyQ();syncLabel();return D
 }catch(e){syncLabel(e.retry?(navigator.onLine?'Gagal sinkron':'Offline'):undefined);throw e}
 finally{clearTimeout(tm);busy--}}
async function load(){if(busy||API_URL.startsWith('GANTI'))return;
 try{await flush();await api('getAll');softRender()}
 catch(e){if(e.message=='PIN salah'){PIN='';delete LS.pin;showLogin();toast('PIN salah, coba lagi','err')}else if(!LS.cache)toast('Gagal memuat: '+e.message,'err')}}
const sheetOpen=()=>$('#sheet').classList.contains('show');
function softRender(){if(sheetOpen()||document.activeElement.matches('input,select'))return;render()}

/* ---------- Tampilan ---------- */
const views={home,hist,stat,acc};
function render(){$('#eye').innerHTML=I[HID?'eyeoff':'eye'];$('#title').textContent={home:'Beranda',hist:'Riwayat',stat:'Statistik',acc:{rek:'Rekening',tag:'Tagihan',tgt:'Target'}[st.sub]}[st.tab];
 document.querySelectorAll('.nav [data-v]').forEach(b=>b.classList.toggle('on',b.dataset.v==st.tab));
 $('#app').innerHTML=(!LS.cache&&!D.rekening.length&&PIN)?'<div class="sk"></div><div class="sk"></div><div class="sk"></div>':views[st.tab]()}
function perBar(){const P=[['hari','Hari ini'],['minggu','Minggu ini'],['bulan','Bulan ini'],['custom','Kustom']];
 return `<div class="chips scroll">${P.map(p=>`<button class="chip ${st.per==p[0]?'on':''}" data-a="per" data-v="${p[0]}">${p[1]}</button>`).join('')}</div>`+
 (st.per=='custom'?`<div class="grid mb">${dateField('cf',st.from||today())}${dateField('ct',st.to||today())}</div>`:'')}
function row(x,d){const tf=x.k=='tf',sub=[x.pending?'belum terkirim':'',tf?'':x.rekening,d?shortD(x.tanggal):'',x.catatan].filter(Boolean).map(esc).join(' · ');
 return `<div class="row" data-a="edit" data-k="${x.k}" data-id="${x.id}"><div class="ic ${x.k}">${I[x.k]}</div><div class="rm"><b>${tf?esc(x.dari)+' → '+esc(x.ke):esc(x.kategori)}</b><small>${sub||'&nbsp;'}</small></div><div class="am ${x.k}">${x.k=='out'?'−':x.k=='in'?'+':''}${rp(x.nominal)}</div></div>`}
function home(){const [a,b]=range(),m=bal(),tot=Object.values(m).reduce((s,v)=>s+v,0);
 const o=inR(D.pengeluaran,a,b),inc=sum(inR(D.pemasukan,a,b)),exp=sum(o);
 const [pa,pb]=prevR(a,b),pe=sum(inR(D.pengeluaran,pa,pb)),pi=sum(inR(D.pemasukan,pa,pb));
 const days=Math.max(1,(dt(b<today()?b:today())-dt(a))/864e5+1),g=grp(o),rec=allTx().slice(0,5);
 const chg=(x,y,up)=>y?`<b class="${(x>=y)==up?'in':'out'}">${x>=y?'▲':'▼'} ${Math.abs((x-y)/y*100).toFixed(0)}%</b>`:'<b class="mu">–</b>';
 return perBar()+banner()+`<div class="card hero"><small>Total saldo semua rekening</small><b>${rp(tot)}</b><small>${D.rekening.length} rekening</small></div>
 <div class="grid mb"><div class="card"><small>Pemasukan</small><b class="in">${rp(inc)}</b></div><div class="card"><small>Pengeluaran</small><b class="out">${rp(exp)}</b></div></div>
 <div class="card"><small>Saldo bersih periode</small><b>${rp(inc-exp)}</b></div>
 <h3>Insight</h3><div class="card">
 <div class="row2"><span>Pengeluaran terbesar</span><b>${g.length?esc(g[0][0])+' · '+rp(g[0][1]):'–'}</b></div>
 <div class="row2"><span>Rata-rata pengeluaran harian</span><b>${rp(exp/days)}</b></div>
 <div class="row2"><span>Pengeluaran vs periode lalu<small>${rp(pe)}</small></span>${chg(exp,pe,false)}</div>
 <div class="row2"><span>Pemasukan vs periode lalu<small>${rp(pi)}</small></span>${chg(inc,pi,true)}</div></div>
 ${goalsHome()}<h3>Transaksi terbaru</h3>${rec.length?`<div class="list">${rec.map(x=>row(x,1)).join('')}</div>`:empty('Belum ada transaksi.<br>Tekan tombol + untuk mencatat.')}`}
function histList(){const q=st.q.toLowerCase();
 const l=allTx().filter(x=>(!st.fc||x.kategori==st.fc)&&(!st.ff||x.tanggal>=st.ff)&&(!st.ft||x.tanggal<=st.ft)&&(!q||[x.kategori,x.catatan,x.rekening,x.dari,x.ke,x.nominal,x.oleh].join(' ').toLowerCase().includes(q)));
 if(!l.length)return empty('Tidak ada transaksi yang cocok');
 let h='',last='';l.slice(0,100).forEach(x=>{if(x.tanggal!=last){if(last)h+='</div>';h+=`<div class="gh">${gl(x.tanggal)}</div><div class="list">`;last=x.tanggal}h+=row(x)});
 return h+'</div>'+(l.length>100?'<small class="note">Menampilkan 100 transaksi terbaru. Persempit filter untuk melihat lainnya.</small>':'')}
function hist(){const all=[...new Set(D.kategori.map(c=>String(c.nama)))].sort((a,b)=>a.localeCompare(b,'id'));
 return `<input id="q" class="mb" placeholder="Cari catatan, kategori, rekening" value="${esc(st.q)}"><button type="button" class="dpb sel mb" data-a="pickcat">${esc(st.fc||'Semua kategori')}</button>
 <div class="grid mb"><div><label>Dari tanggal</label>${dateField('ff',st.ff,1)}</div><div><label>Sampai tanggal</label>${dateField('ft',st.ft,1)}</div></div>
 <button class="lnk mb" data-a="reset">Reset filter</button><div id="list">${histList()}</div>`}
function trend(){let keys=[],lab=[];
 if(st.trend=='harian'){let [a,b]=range();if(b>today())b=today();if(b<a)b=a;let s=addD(b,-30);if(s<a)s=a;for(let d=s;d<=b;d=addD(d,1)){keys.push(d);lab.push(d.slice(8))}}
 else{const n=new Date();for(let i=5;i>=0;i--){const d=new Date(n.getFullYear(),n.getMonth()-i,1);keys.push(iso(d).slice(0,7));lab.push(d.toLocaleDateString('id-ID',{month:'short'}))}}
 const L=st.trend=='harian'?10:7,pick=a=>keys.map(k=>sum(a.filter(x=>x.tanggal.slice(0,L)==k)));
 const I=pick(D.pemasukan),O=pick(D.pengeluaran),mx=Math.max(1,...I,...O),w=320/keys.length,bw=Math.min(14,w*.34);
 if(!I.some(Boolean)&&!O.some(Boolean))return empty('Belum ada data untuk tren');
 return `<svg viewBox="0 0 320 130" width="100%">${keys.map((k,i)=>{const x=i*w+w/2,hi=I[i]/mx*100,ho=O[i]/mx*100;
 return `<rect x="${x-bw-1}" y="${108-hi}" width="${bw}" height="${hi}" rx="3" fill="#10b981"/><rect x="${x+1}" y="${108-ho}" width="${bw}" height="${ho}" rx="3" fill="#f43f5e"/>`+(i%Math.ceil(keys.length/9)==0?`<text x="${x}" y="124">${lab[i]}</text>`:'')}).join('')}</svg>`}
function stat(){const [a,b]=range(),o=inR(D.pengeluaran,a,b),g=grp(o),tot=sum(o);
 return perBar()+`<div class="card"><h3 style="margin-top:0">Pengeluaran per kategori</h3>${g.length?g.map(([k,x])=>`<div class="bar"><div><span>${esc(k)}</span><span>${rp(x)} · ${(x/tot*100).toFixed(0)}%</span></div><i style="width:${x/g[0][1]*100}%"></i></div>`).join(''):empty('Belum ada pengeluaran di periode ini')}</div>
 <div class="card"><h3 style="margin-top:0">Tren</h3><div class="chips">${['harian','bulanan'].map(t=>`<button class="chip ${st.trend==t?'on':''}" data-a="trend" data-v="${t}">${t=='harian'?'Harian':'Bulanan'}</button>`).join('')}</div>${trend()}<div class="leg"><span class="in">■ Pemasukan</span><span class="out">■ Pengeluaran</span></div></div>`}
function acc(){return subBar()+(st.sub=='tag'?tagView():st.sub=='tgt'?tgtView():accRek())}
function accRek(){const m=bal(),tot=Object.values(m).reduce((s,v)=>s+v,0),TL={auto:'Otomatis',light:'Terang',dark:'Gelap'};
 return `<div class="card hero"><small>Total semua rekening</small><b>${rp(tot)}</b></div>`+
 (D.rekening.length?`<div class="list">${D.rekening.map(a=>`<div class="row" data-a="editacc" data-id="${a.id}"><div class="ic">${I.bank}</div><div class="rm"><b>${esc(a.nama)}</b></div><div class="am">${rp(m[a.nama])}</div></div>`).join('')}</div>`:empty('Belum ada rekening.<br>Tambahkan BCA, Mandiri, Tunai, dll.'))+
 `<button class="btn" data-a="addacc">+ Tambah rekening</button><button class="btn ghost" data-a="tf">Transfer antar rekening</button>
 <h3>Pengaturan</h3><div class="list"><div class="row" data-a="name"><div class="ic">${sv('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>')}</div><div class="rm"><b>Nama pengguna</b></div><div class="am mu">${esc(NAME||'-')}</div></div>
 <div class="row" data-a="theme"><div class="ic">${sv('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>')}</div><div class="rm"><b>Tema</b></div><div class="am mu">${TL[LS.theme||'auto']}</div></div>
 <div class="row" data-a="exp"><div class="ic">${sv('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>')}</div><div class="rm"><b>Ekspor laporan</b></div><div></div></div><div class="row" data-a="bak"><div class="ic">${sv('<path d="M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7"/>')}</div><div class="rm"><b>Cadangkan sekarang</b></div><div></div></div><div class="row" data-a="logout"><div class="ic out">${sv('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>')}</div><div class="rm"><b class="out">Keluar</b></div><div></div></div></div>`}

/* ---------- Form transaksi ---------- */
function openTx(k,id){const names=D.rekening.map(a=>a.nama),def=names.includes(LS.lastAcc)?LS.lastAcc:names[0]||'';
 if(id){const x=(k=='in'?D.pemasukan:k=='out'?D.pengeluaran:D.transfer).find(r=>String(r.id)==String(id));if(!x)return;if(x.pending)return toast('Transaksi ini belum terkirim. Tunggu sampai tersambung.','err');f={...x,k,nominal:Number(x.nominal).toLocaleString('id-ID'),edit:1}}
 else f={k,nominal:'',tanggal:today(),catatan:'',rekening:def,dari:def,ke:'',kategori:''};
 drawTx();$('#sheet').classList.add('show')}
function drawTx(){const k=f.k,kt=k=='tf'?[]:cats(k),names=D.rekening.map(a=>a.nama);if(f.kategori&&k!='tf'&&!kt.includes(f.kategori))kt.push(f.kategori);
 const ch=(fl,l,sel)=>`<div class="chips">${l.map(n=>`<button class="chip ${sel==n?'on':''}" data-a="pick" data-f="${fl}" data-v="${esc(n)}">${esc(n)}</button>`).join('')}</div>`;
 $('#sheet').innerHTML=`<div class="back" data-a="close"></div><div class="pane"><div class="ph"><h2>${f.edit?'Ubah':'Tambah'} transaksi</h2><button class="x" data-a="close">✕</button></div>
 ${f.edit?'':`<div class="seg">${[['out','Pengeluaran'],['in','Pemasukan'],['tf','Transfer']].map(s=>`<button class="${k==s[0]?'on '+s[0]:''}" data-a="type" data-v="${s[0]}">${s[1]}</button>`).join('')}</div>`}
 <label>Nominal (Rp)</label><input id="nom" class="big" inputmode="numeric" placeholder="0" value="${f.nominal}" autocomplete="off">
 ${names.length?'':`<div class="warn">Belum ada rekening. <button class="lnk" data-a="goacc">Tambah rekening dulu</button></div>`}
 ${k=='tf'?`<label>Dari rekening</label>${ch('dari',names,f.dari)}<label>Ke rekening</label>${ch('ke',names,f.ke)}`:`<label>Rekening</label>${ch('rekening',names,f.rekening)}<label>Kategori</label>${ch('kategori',kt,f.kategori)}`}
 <label>Tanggal</label>${dateField('tgl',f.tanggal)}<label>Catatan (opsional)</label><input id="cat" maxlength="120" value="${esc(f.catatan)}" placeholder="mis. makan siang">
 <button class="btn" id="sv" data-a="save">Simpan</button>${f.edit?'<button class="btn dng" data-a="del">Hapus transaksi</button>':''}</div>`;
 setTimeout(()=>{if(!f.edit&&!f.nominal&&$('#nom'))$('#nom').focus()},60)}
const readF=()=>{f.nominal=$('#nom').value;f.tanggal=$('#tgl').value;f.catatan=$('#cat').value};
const close=()=>$('#sheet').classList.remove('show');
async function run(fn,ok){const bs=document.querySelectorAll('.pane .btn');bs.forEach(b=>b.disabled=true);const sv=$('#sv');if(sv)sv.textContent='Menyimpan…';
 try{await fn();close();toast(ok,'ok');render()}catch(e){if(e.queued){close();toast('Tersimpan di HP, akan dikirim otomatis saat tersambung','ok');render();return}toast('Gagal: '+e.message,'err');bs.forEach(b=>b.disabled=false);if(sv)sv.textContent='Simpan'}}
function saveTx(){readF();const n=parseInt(String(f.nominal).replace(/\D/g,''),10)||0,bad=m=>toast(m,'err');
 if(n<=0){const e=$('#nom');e.classList.add('shake');setTimeout(()=>e.classList.remove('shake'),400);return bad('Nominal wajib diisi dan harus lebih dari 0')}
 if(f.k=='tf'){if(!f.dari||!f.ke)return bad('Pilih rekening asal dan tujuan');if(f.dari==f.ke)return bad('Rekening asal dan tujuan harus berbeda')}
 else{if(!f.rekening)return bad('Pilih rekening');if(!f.kategori)return bad('Pilih kategori')}
 if(!f.tanggal)return bad('Tanggal wajib diisi');
 const row={id:f.id,tanggal:f.tanggal,nominal:n,catatan:f.catatan.trim(),oleh:f.oleh||NAME};
 Object.assign(row,f.k=='tf'?{dari:f.dari,ke:f.ke}:{rekening:f.rekening,kategori:f.kategori});
 if(f.k!='tf')LS.lastAcc=f.rekening;
 if(!f.edit){f.id=f.id||uid();row.id=f.id;row.neu=1}
 run(async()=>{try{await api('save',{t:f.k,row});if(f.bill)await api('payBill',{id:f.bill,periode:ym()})}catch(e){if(!e.retry||f.edit)throw e;Q.push({t:f.k,row,bill:f.bill,per:ym()});saveQ();applyQ();syncLabel();throw{queued:1}}},f.edit?'Perubahan disimpan':'Transaksi tersimpan')}
/* ---------- Form rekening ---------- */
function openAcc(id){const a=D.rekening.find(r=>String(r.id)==String(id))||{};
 f={id:a.id,nama:a.nama||'',sa:a.saldoawal?Number(a.saldoawal).toLocaleString('id-ID'):''};
 $('#sheet').innerHTML=`<div class="back" data-a="close"></div><div class="pane"><div class="ph"><h2>${a.id?'Ubah':'Tambah'} rekening</h2><button class="x" data-a="close">✕</button></div>
 <label>Nama rekening</label><input id="an" maxlength="30" value="${esc(f.nama)}" placeholder="mis. BCA Gaji"><label>Saldo awal (Rp)</label><input id="as" inputmode="numeric" placeholder="0" value="${f.sa}">
 <button class="btn" id="sv" data-a="saveacc">Simpan</button>${a.id?'<button class="btn dng" data-a="delacc">Hapus rekening</button>':''}</div>`;
 $('#sheet').classList.add('show')}
function saveAcc(){const nama=$('#an').value.trim();if(!nama)return toast('Nama rekening wajib diisi','err');
 run(()=>api('saveAcc',{id:f.id,nama,saldoawal:parseInt($('#as').value.replace(/\D/g,''),10)||0}),'Rekening disimpan')}
function delAcc(){const n=f.nama,u=D.pemasukan.concat(D.pengeluaran).filter(x=>x.rekening==n).length+D.transfer.filter(x=>x.dari==n||x.ke==n).length;
 if(u)return toast(`Tidak bisa dihapus: sudah ada ${u} transaksi di rekening ini`,'err');
 ask('Hapus rekening?',`Rekening "${esc(n)}" akan dihapus.`,'Hapus',1).then(ok=>ok&&run(()=>api('delAcc',{id:f.id}),'Rekening dihapus'))}

/* ---------- Tagihan, Target, Ekspor ---------- */
I.bill=sv('<path d="M6 2h12v20l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>');
const ym=()=>today().slice(0,7);
const rpx=n=>(n<0?'-':'')+'Rp '+Math.abs(Math.round(Number(n)||0)).toLocaleString('id-ID');
function billInfo(b){const t=today(),p=t.slice(0,7),last=new Date(+p.slice(0,4),+p.slice(5),0).getDate(),due=p+'-'+String(Math.min(+b.jatuhtempo,last)).padStart(2,'0'),diff=Math.round((dt(due)-dt(t))/864e5);
 if(String(b.dibayar)>=p)return{s:'paid',txt:'Sudah dibayar bulan ini'};
 if(diff<0)return{s:'late',txt:`Terlambat ${-diff} hari`};
 if(diff<=+b.ingatkan)return{s:'soon',txt:diff?`Jatuh tempo ${diff} hari lagi`:'Jatuh tempo hari ini'};
 return{s:'wait',txt:'Belum jatuh tempo'}}
const alerts=()=>D.tagihan.map(b=>({b,i:billInfo(b)})).filter(x=>x.i.s=='late'||x.i.s=='soon');
const banner=()=>alerts().map(({b,i})=>`<div class="alert ${i.s}"><div class="rm"><b>Tagihan ${esc(b.nama)}</b><small>${i.txt}</small></div><button class="pill" data-a="paybill" data-id="${b.id}">Bayar</button></div>`).join('');
const subBar=()=>`<div class="chips">${[['rek','Rekening'],['tag','Tagihan'],['tgt','Target']].map(p=>`<button class="chip ${st.sub==p[0]?'on':''}" data-a="sub" data-v="${p[0]}">${p[1]}${p[0]=='tag'&&alerts().length?' •':''}</button>`).join('')}</div>`;
const tagView=()=>(D.tagihan.length?`<div class="list">${D.tagihan.slice().sort((a,b)=>a.jatuhtempo-b.jatuhtempo).map(b=>{const i=billInfo(b);return `<div class="row" data-a="editbill" data-id="${b.id}"><div class="ic ${i.s=='late'?'out':i.s=='paid'?'in':''}">${I.bill}</div><div class="rm"><b>${esc(b.nama)}</b><small>Tiap tgl ${b.jatuhtempo} · ${i.txt}</small></div><div class="am">${Number(b.nominal)?rp(b.nominal):''}</div></div>`}).join('')}</div>`:empty('Belum ada tagihan.<br>Tambahkan PDAM, listrik, internet, dll.'))+`<button class="btn" data-a="addbill">+ Tambah tagihan</button><small class="note">Pengingat juga dikirim lewat email setiap pagi jika tagihan belum dibayar.</small>`;
function goalCard(g,act){const t=Number(g.target),k=Number(g.terkumpul),p=Math.min(100,k/t*100);let note;
 if(k>=t)note='Target tercapai ✓';
 else if(g.tenggat&&dt(g.tenggat)>=dt(today()))note=`Perlu ${rp((t-k)/Math.max(1,Math.ceil((dt(g.tenggat)-dt(today()))/2592e6)))}/bulan sampai ${fmtD(g.tenggat)}`;
 else note=`Kurang ${rp(t-k)}${g.tenggat?' · tenggat terlewat':''}`;
 return `<div class="card goal" ${act?`data-a="editgoal" data-id="${g.id}"`:''}><div class="gt"><span>${esc(g.nama)}</span><span>${Math.round(p)}%</span></div><div class="bar"><i style="width:${p}%"></i></div><small>${rp(k)} dari ${rp(t)}</small><small class="blk">${note}</small>${act?`<button class="pill ghostp" data-a="addfund" data-id="${g.id}">+ Tambah dana</button>`:''}</div>`}
const goalsHome=()=>D.target.length?`<h3>Target tabungan</h3>${D.target.slice(0,3).map(g=>goalCard(g)).join('')}`:'';
const tgtView=()=>(D.target.length?D.target.map(g=>goalCard(g,1)).join(''):empty('Belum ada target tabungan.<br>Mis. dana darurat, liburan, atau DP rumah.'))+`<button class="btn" data-a="addgoal">+ Tambah target</button><small class="note">Target hanya pencatat progres, tidak mengubah saldo rekening.</small>`;
const pane=(t,b)=>{$('#sheet').innerHTML=`<div class="back" data-a="close"></div><div class="pane"><div class="ph"><h2>${t}</h2><button class="x" data-a="close">✕</button></div>${b}</div>`;$('#sheet').classList.add('show')};
const fm=v=>Number(v)?Number(v).toLocaleString('id-ID'):'';
function openBill(id){const b=D.tagihan.find(r=>String(r.id)==String(id))||{};f={id:b.id,paid:!!b.id&&String(b.dibayar)>=ym()};
 pane((b.id?'Ubah':'Tambah')+' tagihan',`<label>Nama tagihan</label><input id="bn" maxlength="30" value="${esc(b.nama||'')}" placeholder="mis. PDAM">
 <div class="grid"><div><label>Jatuh tempo (tanggal)</label><input id="bj" inputmode="numeric" maxlength="2" value="${b.jatuhtempo||''}" placeholder="20"></div><div><label>Ingatkan (hari sebelum)</label><input id="bi" inputmode="numeric" maxlength="2" value="${b.ingatkan??7}"></div></div>
 <label>Perkiraan nominal (opsional)</label><input id="as" inputmode="numeric" placeholder="0" value="${fm(b.nominal)}">
 <button class="btn" id="sv" data-a="savebill">Simpan</button>${b.id?`<button class="btn ghost" data-a="billpaid">${f.paid?'Batalkan tanda lunas':'Tandai sudah dibayar bulan ini'}</button><button class="btn dng" data-a="delbill">Hapus tagihan</button>`:''}`)}
function submitBill(){const nama=$('#bn').value.trim(),j=parseInt($('#bj').value,10),g=parseInt($('#bi').value,10)||0;
 if(!nama)return toast('Nama tagihan wajib diisi','err');if(!(j>=1&&j<=31))return toast('Tanggal jatuh tempo harus 1-31','err');if(g>30)return toast('Pengingat maksimal 30 hari','err');
 run(()=>api('saveBill',{id:f.id,nama,jatuhtempo:j,ingatkan:g,nominal:parseInt($('#as').value.replace(/\D/g,''),10)||0}),'Tagihan disimpan')}
function openPay(id){const b=D.tagihan.find(r=>String(r.id)==String(id));if(!b)return;openTx('out');Object.assign(f,{kategori:'Tagihan',catatan:b.nama,bill:b.id,nominal:fm(b.nominal)});drawTx()}
function openGoal(id){const g=D.target.find(r=>String(r.id)==String(id))||{};f={id:g.id};
 pane((g.id?'Ubah':'Tambah')+' target',`<label>Nama target</label><input id="gn" maxlength="30" value="${esc(g.nama||'')}" placeholder="mis. Dana darurat"><label>Nominal target (Rp)</label><input id="gt" class="fmt" inputmode="numeric" placeholder="0" value="${fm(g.target)}">
 <label>Dana terkumpul (Rp)</label><input id="gk" class="fmt" inputmode="numeric" placeholder="0" value="${fm(g.terkumpul)}"><label>Tenggat (opsional)</label>${dateField('gd',g.tenggat,1)}
 <button class="btn" id="sv" data-a="savegoal">Simpan</button>${g.id?'<button class="btn dng" data-a="delgoal">Hapus target</button>':''}`)}
function submitGoal(){const n=$('#gn').value.trim(),num=id=>parseInt($('#'+id).value.replace(/\D/g,''),10)||0;
 if(!n)return toast('Nama target wajib diisi','err');if(num('gt')<=0)return toast('Nominal target harus lebih dari 0','err');
 run(()=>api('saveGoal',{id:f.id,nama:n,target:num('gt'),terkumpul:num('gk'),tenggat:$('#gd').value}),'Target disimpan')}
function openExp(){const t=today(),d=dt(t);pane('Ekspor laporan',`<label>Dari tanggal</label>${dateField('ea',iso(new Date(d.getFullYear(),d.getMonth(),1)))}<label>Sampai tanggal</label>${dateField('eb',t)}
 <button class="btn" data-a="csv">Unduh CSV (Excel / Sheets)</button><button class="btn ghost" data-a="pdf">Laporan PDF (cetak / simpan)</button>`)}
const NM={in:'Pemasukan',out:'Pengeluaran',tf:'Transfer'};
function exportCSV(a,b){if(!a||!b)return toast('Isi rentang tanggal','err');const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
 const L=[['Tanggal','Jenis','Rekening','Kategori','Nominal','Catatan','Oleh'].join(';')].concat(allTx().filter(x=>x.tanggal>=a&&x.tanggal<=b).reverse().map(x=>[x.tanggal,NM[x.k],x.k=='tf'?x.dari+' → '+x.ke:x.rekening,x.kategori||'',x.nominal,x.catatan,x.oleh].map(q).join(';')));
 const el=document.createElement('a');el.href=URL.createObjectURL(new Blob(['\ufeff'+L.join('\r\n')],{type:'text/csv;charset=utf-8'}));el.download=`PetaDana_${a}_${b}.csv`;document.body.appendChild(el);el.click();el.remove();toast('File CSV diunduh','ok')}
function exportPDF(a,b){if(!a||!b)return toast('Isi rentang tanggal','err');const rows=allTx().filter(x=>x.tanggal>=a&&x.tanggal<=b),inc=sum(rows.filter(x=>x.k=='in')),o=rows.filter(x=>x.k=='out'),exp=sum(o),g=grp(o);
 const w=window.open('','_blank');if(!w)return toast('Pop-up diblokir. Izinkan pop-up lalu coba lagi','err');
 w.document.write(`<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Laporan PetaDana ${a} s.d. ${b}</title><style>body{font:13px Arial,sans-serif;margin:20px;color:#111}h1{font-size:20px;color:#1d4ed8;margin:0}h3{margin:20px 0 6px}table{width:100%;border-collapse:collapse}td,th{padding:6px 4px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}.r{text-align:right}.s{display:flex;gap:10px;margin-top:12px}.s div{flex:1;border:1px solid #ddd;border-radius:8px;padding:10px}.s b{display:block;font-size:15px;margin-top:4px}small{color:#666}</style>
 <h1>Laporan Keuangan PetaDana</h1><p>${fmtD(a)} – ${fmtD(b)}</p><div class="s"><div>Pemasukan<b>${rpx(inc)}</b></div><div>Pengeluaran<b>${rpx(exp)}</b></div><div>Selisih<b>${rpx(inc-exp)}</b></div></div>
 <h3>Pengeluaran per kategori</h3><table>${g.map(([k,v])=>`<tr><td>${esc(k)}</td><td class="r">${rpx(v)}</td></tr>`).join('')||'<tr><td>Tidak ada data</td></tr>'}</table>
 <h3>Daftar transaksi (${rows.length})</h3><table><tr><th>Tanggal</th><th>Jenis</th><th>Rekening</th><th>Kategori</th><th class="r">Nominal</th></tr>${rows.slice().reverse().map(x=>`<tr><td>${x.tanggal}</td><td>${NM[x.k]}</td><td>${esc(x.k=='tf'?x.dari+' → '+x.ke:x.rekening)}</td><td>${esc(x.kategori||'')}${x.catatan?'<br><small>'+esc(x.catatan)+'</small>':''}</td><td class="r">${rpx(x.nominal)}</td></tr>`).join('')}</table><script>setTimeout(()=>print(),400)<\/script>`);w.document.close()}

/* ---------- Antrean offline, dialog, kalender, pilihan ---------- */
const uid=()=>Math.random().toString(36).slice(2,10);
const saveQ=()=>{LS.queue=JSON.stringify(Q)};
const offMsg=()=>navigator.onLine?'Server sedang sibuk atau koneksi lambat. Coba lagi sebentar lagi.':'Tidak ada koneksi internet.';
function syncLabel(m){$('#sync').textContent=m!==undefined?m:(Q.length?`${Q.length} menunggu kirim`:'')}
function applyQ(){Q.forEach(q=>{const a=q.t=='in'?D.pemasukan:q.t=='out'?D.pengeluaran:D.transfer;if(!a.some(x=>String(x.id)==String(q.row.id)))a.push({...q.row,pending:true,dibuat:new Date().toISOString()})})}
async function flush(){if(!Q.length||busy||!navigator.onLine)return;
 while(Q.length){const q=Q[0];
  try{await api('save',{t:q.t,row:q.row});if(q.bill)await api('payBill',{id:q.bill,periode:q.per})}
  catch(e){if(e.retry||e.message=='PIN salah')break;toast('Transaksi offline ditolak server: '+e.message,'err')}
  Q.shift();saveQ()}
 syncLabel()}
let OVR=null,OVP=null,PL=[],DP=null;
function dlg(o){return new Promise(res=>{OVR=res;
 $('#ov').innerHTML=`<div class="back" data-a="ovx"></div><div class="pane dpane"><h2>${o.t}</h2>${o.m?`<p class="dm">${o.m}</p>`:''}${o.input?`<input id="dli" class="${o.num?'fmt':''}" ${o.num?'inputmode="numeric"':''} value="${esc(o.val||'')}" placeholder="${esc(o.ph||'')}">`:''}<div class="dbt"><button class="btn ghost" data-a="ovx">Batal</button><button class="btn ${o.danger?'dng':''}" data-a="ovok">${o.ok||'OK'}</button></div></div>`;
 $('#ov').classList.add('show');if(o.input)setTimeout(()=>$('#dli').focus(),60)})}
const ask=(t,m,ok,danger)=>dlg({t,m,ok,danger}).then(v=>!!v);
function ovDone(v){$('#ov').classList.remove('show');const r=OVR;OVR=null;if(r)r(v)}
function openPick(title,items,cur,cb){OVP=cb;PL=items;
 $('#ov').innerHTML=`<div class="back" data-a="ovx"></div><div class="pane"><div class="ph"><h2>${title}</h2><button class="x" data-a="ovx">✕</button></div>${items.map((it,i)=>`<div class="opt ${it[0]==cur?'on':''}" data-a="ovpick" data-i="${i}"><span>${esc(it[1])}</span>${it[0]==cur?sv('<path d="M5 12l5 5 9-10"/>'):''}</div>`).join('')}</div>`;$('#ov').classList.add('show')}
const dateField=(id,v,clr)=>`<input type="hidden" id="${id}" value="${v||''}"><button type="button" class="dpb ${v?'':'ph'}" data-a="pickdate" data-t="${id}" ${clr?'data-c="1"':''}>${v?fmtD(v):'Pilih tanggal'}</button>`;
function openDP(id,clr){const d=dt($('#'+id).value||today());DP={id,y:d.getFullYear(),m:d.getMonth(),clr};drawDP();$('#ov').classList.add('show')}
function drawDP(){const{y,m,id,clr}=DP,sel=$('#'+id).value,t=today(),first=(new Date(y,m,1).getDay()+6)%7,n=new Date(y,m+1,0).getDate();let c='<i></i>'.repeat(first);
 for(let d=1;d<=n;d++){const s=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;c+=`<button type="button" class="${s==sel?'on':''} ${s==t?'td':''}" data-a="dpset" data-v="${s}">${d}</button>`}
 $('#ov').innerHTML=`<div class="back" data-a="ovx"></div><div class="pane dpane"><div class="dph"><button class="x" data-a="dpnav" data-v="-1">‹</button><b>${new Date(y,m,1).toLocaleDateString('id-ID',{month:'long',year:'numeric'})}</b><button class="x" data-a="dpnav" data-v="1">›</button></div>
 <div class="dpg wd">${['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map(w=>`<span>${w}</span>`).join('')}</div><div class="dpg">${c}</div>
 <div class="dpf"><button class="chip" data-a="dpset" data-v="${t}">Hari ini</button>${clr?'<button class="chip" data-a="dpset" data-v="">Hapus</button>':''}<button class="chip" data-a="ovx">Tutup</button></div></div>`}
function setDate(v){const el=$('#'+DP.id),b=document.querySelector(`[data-t="${DP.id}"]`);el.value=v;if(b){b.textContent=v?fmtD(v):'Pilih tanggal';b.classList.toggle('ph',!v)}
 $('#ov').classList.remove('show');el.dispatchEvent(new Event('change',{bubbles:true}))}

/* ---------- Event ---------- */
function toast(m,t){const e=$('#toast');e.textContent=(t=='ok'?'✓ ':'⚠ ')+m;e.className='show '+t;clearTimeout(toast.t);toast.t=setTimeout(()=>e.className='',3000)}
const showLogin=()=>$('#login').classList.remove('hide');
const mq=matchMedia('(prefers-color-scheme:dark)');
function theme(){const t=LS.theme||'auto';document.documentElement.dataset.theme=t=='auto'?(mq.matches?'dark':'light'):t;
 document.querySelector('meta[name=theme-color]').content=getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()}
mq.onchange=theme;
const A={eye:()=>{HID=!HID;LS.hide=HID?'1':'0';render()},reset:()=>{st.q=st.fc=st.ff=st.ft='';render()},tab:d=>{st.tab=d.v;render();scrollTo(0,0)},per:d=>{st.per=d.v;render()},trend:d=>{st.trend=d.v;render()},
 fab:()=>openTx('out'),tf:()=>openTx('tf'),edit:d=>openTx(d.k,d.id),close,save:saveTx,saveacc:saveAcc,delacc:delAcc,
 type:d=>{readF();f.k=d.v;f.kategori='';drawTx()},
 pick:(d,el)=>{f[d.f]=d.v;el.parentElement.querySelectorAll('.chip').forEach(c=>c.classList.remove('on'));el.classList.add('on')},
 del:()=>ask('Hapus transaksi?','Tindakan ini tidak bisa dibatalkan.','Hapus',1).then(ok=>ok&&run(()=>api('del',{t:f.k,id:f.id}),'Transaksi dihapus')),
 addacc:()=>openAcc(),editacc:d=>openAcc(d.id),goacc:()=>{close();A.tab({v:'acc'})},
 theme:()=>{const T=['auto','light','dark'];LS.theme=T[(T.indexOf(LS.theme||'auto')+1)%3];theme();render()},
 name:()=>dlg({t:'Nama pengguna',m:'Tampil di kolom "Oleh" pada setiap transaksi.',input:1,val:NAME,ok:'Simpan'}).then(n=>{if(n!==null&&n!==true){NAME=String(n).trim();LS.name=NAME;render()}}),
 logout:()=>ask('Keluar dari aplikasi?',Q.length?`Ada ${Q.length} transaksi yang belum terkirim dan akan hilang.`:'Kamu perlu memasukkan PIN lagi untuk masuk.','Keluar',1).then(ok=>{if(ok){delete LS.pin;delete LS.cache;delete LS.queue;location.reload()}}),
 login:()=>{const p=$('#pin').value.trim();if(!p)return toast('PIN wajib diisi','err');if(API_URL.startsWith('GANTI'))return toast('URL Web App belum diisi di app.js','err');
  PIN=p;NAME=$('#nm').value.trim();LS.pin=PIN;LS.name=NAME;$('#login').classList.add('hide');render();load()}};
Object.assign(A,{sub:d=>{st.sub=d.v;render()},addbill:()=>openBill(),editbill:d=>openBill(d.id),paybill:d=>openPay(d.id),savebill:submitBill,
 billpaid:()=>run(()=>api('payBill',{id:f.id,periode:f.paid?'':ym()}),f.paid?'Tanda lunas dibatalkan':'Ditandai sudah dibayar'),
 delbill:()=>ask('Hapus tagihan?','Tagihan ini akan dihapus dari daftar.','Hapus',1).then(ok=>ok&&run(()=>api('delBill',{id:f.id}),'Tagihan dihapus')),
 addgoal:()=>openGoal(),editgoal:d=>openGoal(d.id),savegoal:submitGoal,
 delgoal:()=>ask('Hapus target?','Target ini akan dihapus dari daftar.','Hapus',1).then(ok=>ok&&run(()=>api('delGoal',{id:f.id}),'Target dihapus')),
 addfund:d=>dlg({t:'Tambah dana',m:'Jumlah dana yang ditambahkan ke target ini.',input:1,num:1,ph:'0',ok:'Tambah'}).then(v=>{const n=parseInt(String(v||'').replace(/\D/g,''),10);if(n>0)api('addFund',{id:d.id,jumlah:n}).then(()=>{toast('Dana ditambahkan','ok');render()}).catch(e=>toast('Gagal: '+e.message,'err'))}),
 exp:openExp,csv:()=>exportCSV($('#ea').value,$('#eb').value),pdf:()=>exportPDF($('#ea').value,$('#eb').value),
 bak:()=>{toast('Membuat cadangan…','ok');api('backup').then(()=>toast('Cadangan tersimpan di Google Drive','ok')).catch(e=>toast('Gagal: '+e.message,'err'))}});
Object.assign(A,{ovx:()=>ovDone(null),ovok:()=>ovDone($('#dli')?$('#dli').value:true),ovpick:d=>{$('#ov').classList.remove('show');OVP&&OVP(PL[d.i][0])},
 pickdate:d=>openDP(d.t,d.c),dpset:d=>setDate(d.v),dpnav:d=>{DP.m+=+d.v;if(DP.m<0){DP.m=11;DP.y--}if(DP.m>11){DP.m=0;DP.y++}drawDP()},
 pickcat:()=>{const all=[...new Set(D.kategori.map(c=>String(c.nama)))].sort((a,b)=>a.localeCompare(b,'id'));openPick('Pilih kategori',[['','Semua kategori'],...all.map(c=>[c,c])],st.fc,v=>{st.fc=v;render()})}});
document.addEventListener('click',e=>{const a=e.target.closest('[data-a]');if(a)A[a.dataset.a]?.(a.dataset,a)});
document.addEventListener('input',e=>{const t=e.target;
 if(t.matches('#nom,#as,.fmt')){const d=t.value.replace(/\D/g,'');t.value=d?Number(d).toLocaleString('id-ID'):''}
 if(t.id=='q'){st.q=t.value;$('#list').innerHTML=histList()}});
document.addEventListener('change',e=>{const i=e.target.id;
 if(i=='fc'||i=='ff'||i=='ft'){st[i]=e.target.value;$('#list').innerHTML=histList()}
 if(i=='cf'||i=='ct'){st[i=='cf'?'from':'to']=e.target.value;render()}});
theme();render();syncLabel(navigator.onLine?undefined:'Offline');
if(!PIN)showLogin();else load();
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&PIN)load()});
setInterval(()=>{if(!document.hidden&&PIN)load()},30000);
addEventListener('online',()=>load());addEventListener('offline',()=>syncLabel('Offline'));
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
