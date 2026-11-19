'use strict';
/* ====== PENGATURAN: tempel URL Web App dari Apps Script di sini ====== */
const API_URL='https://script.google.com/macros/s/AKfycbwfKtxYr-2_z4qRWIfgiCyMv_xPDsTbwZla43tv8XgPcdb99KHA4bvzwZFY7BgxsKn5/exec';
/* ===================================================================== */
const $=s=>document.querySelector(s),LS=localStorage;
let PIN=LS.pin||'',NAME=LS.name||'',busy=0,f={};
let D=JSON.parse(LS.cache||'null')||{pemasukan:[],pengeluaran:[],transfer:[],rekening:[],kategori:[]};
const st={tab:'home',per:'bulan',from:'',to:'',trend:'harian',q:'',fc:'',ff:'',ft:''};
const iso=d=>new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
const today=()=>iso(new Date()),dt=s=>new Date(s+'T00:00');
const addD=(s,n)=>{const d=dt(s);d.setDate(d.getDate()+n);return iso(d)};
const rp=n=>(n<0?'-':'')+'Rp '+Math.abs(Math.round(Number(n)||0)).toLocaleString('id-ID');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtD=s=>dt(s).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});
const sum=a=>a.reduce((s,x)=>s+Number(x.nominal),0);
const inR=(a,x,y)=>a.filter(r=>r.tanggal>=x&&r.tanggal<=y);
const empty=(m,b)=>`<div class="empty"><div>📭</div><p>${m}</p>${b||''}</div>`;
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
async function api(action,data){busy++;setSync(action=='getAll'?'Menyinkronkan…':'Menyimpan…');
 try{const r=await fetch(API_URL,{method:'POST',body:JSON.stringify({pin:PIN,action,data})});
  const j=await r.json();if(!j.ok)throw new Error(j.error);
  D=j.data;LS.cache=JSON.stringify(D);setSync('');return D}
 catch(e){setSync(e.message=='PIN salah'?'':'Offline');throw e}finally{busy--}}
async function load(){if(busy||API_URL.startsWith('GANTI'))return;
 try{await api('getAll');softRender()}
 catch(e){if(e.message=='PIN salah'){PIN='';delete LS.pin;showLogin();toast('PIN salah, coba lagi','err')}else if(!LS.cache)toast('Gagal memuat: '+e.message,'err')}}
const sheetOpen=()=>$('#sheet').classList.contains('show');
function softRender(){if(sheetOpen()||document.activeElement.matches('input,select'))return;render()}

/* ---------- Tampilan ---------- */
const views={home,hist,stat,acc};
function render(){$('#title').textContent={home:'Beranda',hist:'Riwayat',stat:'Statistik',acc:'Rekening'}[st.tab];
 document.querySelectorAll('.nav [data-v]').forEach(b=>b.classList.toggle('on',b.dataset.v==st.tab));
 $('#app').innerHTML=(!LS.cache&&!D.rekening.length&&PIN)?'<div class="sk"></div><div class="sk"></div><div class="sk"></div>':views[st.tab]()}
function perBar(){const P=[['hari','Hari ini'],['minggu','Minggu ini'],['bulan','Bulan ini'],['custom','Kustom']];
 return `<div class="chips scroll">${P.map(p=>`<button class="chip ${st.per==p[0]?'on':''}" data-a="per" data-v="${p[0]}">${p[1]}</button>`).join('')}</div>`+
 (st.per=='custom'?`<div class="grid mb"><input type="date" id="cf" value="${st.from||today()}"><input type="date" id="ct" value="${st.to||today()}"></div>`:'')}
function row(x){const tf=x.k=='tf';return `<div class="row" data-a="edit" data-k="${x.k}" data-id="${x.id}"><div class="ic ${x.k}">${tf?'⇄':x.k=='in'?'↓':'↑'}</div><div class="rm"><b>${tf?esc(x.dari)+' → '+esc(x.ke):esc(x.kategori)}</b><small>${tf?'':esc(x.rekening)+' · '}${fmtD(x.tanggal)}${x.catatan?' · '+esc(x.catatan):''}</small></div><div class="am ${x.k}">${x.k=='out'?'-':x.k=='in'?'+':''}${rp(x.nominal)}</div></div>`}
function home(){const [a,b]=range(),m=bal(),tot=Object.values(m).reduce((s,v)=>s+v,0);
 const o=inR(D.pengeluaran,a,b),inc=sum(inR(D.pemasukan,a,b)),exp=sum(o);
 const [pa,pb]=prevR(a,b),pe=sum(inR(D.pengeluaran,pa,pb)),pi=sum(inR(D.pemasukan,pa,pb));
 const days=Math.max(1,(dt(b<today()?b:today())-dt(a))/864e5+1),g=grp(o);
 const cmp=(x,y,l)=>y?`${l} <b style="display:inline;font-size:inherit">${x>=y?'naik':'turun'} ${Math.abs((x-y)/y*100).toFixed(0)}%</b> dibanding periode sebelumnya (${rp(y)})`:`${l}: belum ada pembanding periode sebelumnya`;
 const rec=allTx().slice(0,5);
 return perBar()+`<div class="card hero"><small>Total saldo semua rekening</small><b>${rp(tot)}</b><small>${D.rekening.length} rekening</small></div>
 <div class="grid mb"><div class="card"><small>Pemasukan</small><b class="in">${rp(inc)}</b></div><div class="card"><small>Pengeluaran</small><b class="out">${rp(exp)}</b></div></div>
 <div class="card"><small>Saldo bersih periode</small><b>${rp(inc-exp)}</b></div>
 <h3>Saldo per rekening</h3><div class="card">${D.rekening.length?D.rekening.map(r=>`<div class="row2"><span>${esc(r.nama)}</span><b style="margin:0;font-size:15px">${rp(m[r.nama])}</b></div>`).join(''):empty('Belum ada rekening','<button class="btn" data-a="goacc">Tambah rekening</button>')}</div>
 <h3>Insight</h3><div class="card ins"><p>🏆 Pengeluaran terbesar: ${g.length?`<b style="display:inline;font-size:inherit">${esc(g[0][0])}</b> (${rp(g[0][1])})`:'belum ada data'}</p>
 <p>📅 Rata-rata pengeluaran harian: <b style="display:inline;font-size:inherit">${rp(exp/days)}</b></p><p>📉 ${cmp(exp,pe,'Pengeluaran')}</p><p>📈 ${cmp(inc,pi,'Pemasukan')}</p></div>
 <h3>Transaksi terbaru</h3>${rec.length?rec.map(row).join(''):empty('Belum ada transaksi.<br>Tekan tombol + untuk mencatat.')}`}
function histList(){const q=st.q.toLowerCase();
 const l=allTx().filter(x=>(!st.fc||x.kategori==st.fc)&&(!st.ff||x.tanggal>=st.ff)&&(!st.ft||x.tanggal<=st.ft)&&(!q||[x.kategori,x.catatan,x.rekening,x.dari,x.ke,x.nominal,x.oleh].join(' ').toLowerCase().includes(q)));
 return l.length?l.slice(0,100).map(row).join('')+(l.length>100?'<small>Menampilkan 100 transaksi terbaru. Persempit filter untuk melihat lainnya.</small>':''):empty('Tidak ada transaksi yang cocok')}
function hist(){const all=[...new Set(D.kategori.map(c=>String(c.nama)))].sort((a,b)=>a.localeCompare(b,'id'));
 return `<input id="q" class="mb" placeholder="🔍 Cari catatan, kategori, rekening" value="${esc(st.q)}"><select id="fc" class="mb"><option value="">Semua kategori</option>${all.map(c=>`<option ${st.fc==c?'selected':''}>${esc(c)}</option>`).join('')}</select>
 <div class="grid mb"><input type="date" id="ff" value="${st.ff}"><input type="date" id="ft" value="${st.ft}"></div><div id="list">${histList()}</div>`}
function trend(){let keys=[],lab=[];
 if(st.trend=='harian'){let [a,b]=range();if(b>today())b=today();if(b<a)b=a;let s=addD(b,-30);if(s<a)s=a;for(let d=s;d<=b;d=addD(d,1)){keys.push(d);lab.push(d.slice(8))}}
 else{const n=new Date();for(let i=5;i>=0;i--){const d=new Date(n.getFullYear(),n.getMonth()-i,1);keys.push(iso(d).slice(0,7));lab.push(d.toLocaleDateString('id-ID',{month:'short'}))}}
 const L=st.trend=='harian'?10:7,pick=a=>keys.map(k=>sum(a.filter(x=>x.tanggal.slice(0,L)==k)));
 const I=pick(D.pemasukan),O=pick(D.pengeluaran),mx=Math.max(1,...I,...O),w=320/keys.length,bw=Math.min(14,w*.34);
 return `<svg viewBox="0 0 320 130" width="100%">${keys.map((k,i)=>{const x=i*w+w/2,hi=I[i]/mx*100,ho=O[i]/mx*100;
 return `<rect x="${x-bw-1}" y="${108-hi}" width="${bw}" height="${hi}" rx="3" fill="#10b981"/><rect x="${x+1}" y="${108-ho}" width="${bw}" height="${ho}" rx="3" fill="#f43f5e"/>`+(i%Math.ceil(keys.length/9)==0?`<text x="${x}" y="124">${lab[i]}</text>`:'')}).join('')}</svg>`}
function stat(){const [a,b]=range(),[pa,pb]=prevR(a,b),o=inR(D.pengeluaran,a,b),g=grp(o),tot=sum(o);
 const v=[['Pemasukan ini',sum(inR(D.pemasukan,a,b)),'in'],['Pengeluaran ini',tot,'out'],['Pemasukan sebelumnya',sum(inR(D.pemasukan,pa,pb)),'in'],['Pengeluaran sebelumnya',sum(inR(D.pengeluaran,pa,pb)),'out']],mx=Math.max(1,...v.map(x=>x[1]));
 return perBar()+`<div class="card"><h3 style="margin-top:0">Pengeluaran per kategori</h3>${g.length?g.map(([k,x])=>`<div class="bar"><div><span>${esc(k)}</span><span>${rp(x)} · ${(x/tot*100).toFixed(0)}%</span></div><i style="width:${x/g[0][1]*100}%"></i></div>`).join(''):empty('Belum ada pengeluaran di periode ini')}</div>
 <div class="card"><h3 style="margin-top:0">Tren</h3><div class="chips">${['harian','bulanan'].map(t=>`<button class="chip ${st.trend==t?'on':''}" data-a="trend" data-v="${t}">${t=='harian'?'Harian':'Bulanan'}</button>`).join('')}</div>${trend()}<div class="leg"><span class="in">■ Pemasukan</span><span class="out">■ Pengeluaran</span></div></div>
 <div class="card"><h3 style="margin-top:0">Pemasukan vs pengeluaran</h3>${v.map(x=>`<div class="bar ${x[2]}"><div><span>${x[0]}</span><span>${rp(x[1])}</span></div><i style="width:${x[1]/mx*100}%"></i></div>`).join('')}</div>`}
function acc(){const m=bal(),tot=Object.values(m).reduce((s,v)=>s+v,0),T=['auto','light','dark'],TL={auto:'Otomatis',light:'Terang',dark:'Gelap'};
 return `<div class="card hero"><small>Total semua rekening</small><b>${rp(tot)}</b></div>`+
 (D.rekening.length?D.rekening.map(a=>`<div class="row" data-a="editacc" data-id="${a.id}"><div class="ic">🏦</div><div class="rm"><b>${esc(a.nama)}</b><small>Saldo awal ${rp(a.saldoawal||0)} · ketuk untuk ubah</small></div><div class="am">${rp(m[a.nama])}</div></div>`).join(''):empty('Belum ada rekening.<br>Tambahkan BCA, Mandiri, Tunai, dll.'))+
 `<button class="btn" data-a="addacc">+ Tambah rekening</button><button class="btn ghost" data-a="tf">⇄ Transfer antar rekening</button>
 <h3>Pengaturan</h3><button class="btn ghost" data-a="name">Nama pengguna: ${esc(NAME||'-')}</button><button class="btn ghost" data-a="theme">Tema: ${TL[LS.theme||'auto']}</button><button class="btn ghost" data-a="logout">Keluar</button>`}

/* ---------- Form transaksi ---------- */
function openTx(k,id){const names=D.rekening.map(a=>a.nama),def=names.includes(LS.lastAcc)?LS.lastAcc:names[0]||'';
 if(id){const x=(k=='in'?D.pemasukan:k=='out'?D.pengeluaran:D.transfer).find(r=>String(r.id)==String(id));if(!x)return;f={...x,k,nominal:Number(x.nominal).toLocaleString('id-ID'),edit:1}}
 else f={k,nominal:'',tanggal:today(),catatan:'',rekening:def,dari:def,ke:'',kategori:''};
 drawTx();$('#sheet').classList.add('show')}
function drawTx(){const k=f.k,kt=k=='tf'?[]:cats(k),names=D.rekening.map(a=>a.nama);if(f.kategori&&k!='tf'&&!kt.includes(f.kategori))kt.push(f.kategori);
 const ch=(fl,l,sel)=>`<div class="chips">${l.map(n=>`<button class="chip ${sel==n?'on':''}" data-a="pick" data-f="${fl}" data-v="${esc(n)}">${esc(n)}</button>`).join('')}</div>`;
 $('#sheet').innerHTML=`<div class="back" data-a="close"></div><div class="pane"><div class="ph"><h2>${f.edit?'Ubah':'Tambah'} transaksi</h2><button class="x" data-a="close">✕</button></div>
 ${f.edit?'':`<div class="seg">${[['out','Pengeluaran'],['in','Pemasukan'],['tf','Transfer']].map(s=>`<button class="${k==s[0]?'on '+s[0]:''}" data-a="type" data-v="${s[0]}">${s[1]}</button>`).join('')}</div>`}
 <label>Nominal (Rp)</label><input id="nom" class="big" inputmode="numeric" placeholder="0" value="${f.nominal}" autocomplete="off">
 ${names.length?'':`<div class="warn">Belum ada rekening. <button class="lnk" data-a="goacc">Tambah rekening dulu</button></div>`}
 ${k=='tf'?`<label>Dari rekening</label>${ch('dari',names,f.dari)}<label>Ke rekening</label>${ch('ke',names,f.ke)}`:`<label>Rekening</label>${ch('rekening',names,f.rekening)}<label>Kategori</label>${ch('kategori',kt,f.kategori)}`}
 <label>Tanggal</label><input type="date" id="tgl" value="${f.tanggal}"><label>Catatan (opsional)</label><input id="cat" maxlength="120" value="${esc(f.catatan)}" placeholder="mis. makan siang">
 <button class="btn" id="sv" data-a="save">Simpan</button>${f.edit?'<button class="btn dng" data-a="del">Hapus transaksi</button>':''}</div>`;
 setTimeout(()=>{if(!f.edit&&!f.nominal&&$('#nom'))$('#nom').focus()},60)}
const readF=()=>{f.nominal=$('#nom').value;f.tanggal=$('#tgl').value;f.catatan=$('#cat').value};
const close=()=>$('#sheet').classList.remove('show');
async function run(fn,ok){const bs=document.querySelectorAll('.pane .btn');bs.forEach(b=>b.disabled=true);const sv=$('#sv');if(sv)sv.textContent='Menyimpan…';
 try{await fn();close();toast(ok,'ok');render()}catch(e){toast('Gagal: '+e.message,'err');bs.forEach(b=>b.disabled=false);if(sv)sv.textContent='Simpan'}}
function saveTx(){readF();const n=parseInt(String(f.nominal).replace(/\D/g,''),10)||0,bad=m=>toast(m,'err');
 if(n<=0){const e=$('#nom');e.classList.add('shake');setTimeout(()=>e.classList.remove('shake'),400);return bad('Nominal wajib diisi dan harus lebih dari 0')}
 if(f.k=='tf'){if(!f.dari||!f.ke)return bad('Pilih rekening asal dan tujuan');if(f.dari==f.ke)return bad('Rekening asal dan tujuan harus berbeda')}
 else{if(!f.rekening)return bad('Pilih rekening');if(!f.kategori)return bad('Pilih kategori')}
 if(!f.tanggal)return bad('Tanggal wajib diisi');
 const row={id:f.id,tanggal:f.tanggal,nominal:n,catatan:f.catatan.trim(),oleh:f.oleh||NAME};
 Object.assign(row,f.k=='tf'?{dari:f.dari,ke:f.ke}:{rekening:f.rekening,kategori:f.kategori});
 if(f.k!='tf')LS.lastAcc=f.rekening;
 run(()=>api('save',{t:f.k,row}),f.edit?'Perubahan disimpan':'Transaksi tersimpan')}
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
 if(confirm(`Hapus rekening "${n}"?`))run(()=>api('delAcc',{id:f.id}),'Rekening dihapus')}

/* ---------- Event ---------- */
function toast(m,t){const e=$('#toast');e.textContent=(t=='ok'?'✓ ':'⚠ ')+m;e.className='show '+t;clearTimeout(toast.t);toast.t=setTimeout(()=>e.className='',3000)}
const showLogin=()=>$('#login').classList.remove('hide');
const mq=matchMedia('(prefers-color-scheme:dark)');
function theme(){const t=LS.theme||'auto';document.documentElement.dataset.theme=t=='auto'?(mq.matches?'dark':'light'):t;
 document.querySelector('meta[name=theme-color]').content=getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()}
mq.onchange=theme;
const A={tab:d=>{st.tab=d.v;render();scrollTo(0,0)},per:d=>{st.per=d.v;render()},trend:d=>{st.trend=d.v;render()},
 fab:()=>openTx('out'),tf:()=>openTx('tf'),edit:d=>openTx(d.k,d.id),close,save:saveTx,saveacc:saveAcc,delacc:delAcc,
 type:d=>{readF();f.k=d.v;f.kategori='';drawTx()},
 pick:(d,el)=>{f[d.f]=d.v;el.parentElement.querySelectorAll('.chip').forEach(c=>c.classList.remove('on'));el.classList.add('on')},
 del:()=>confirm('Hapus transaksi ini? Tindakan ini tidak bisa dibatalkan.')&&run(()=>api('del',{t:f.k,id:f.id}),'Transaksi dihapus'),
 addacc:()=>openAcc(),editacc:d=>openAcc(d.id),goacc:()=>{close();A.tab({v:'acc'})},
 theme:()=>{const T=['auto','light','dark'];LS.theme=T[(T.indexOf(LS.theme||'auto')+1)%3];theme();render()},
 name:()=>{const n=prompt('Nama kamu (tampil di kolom "Oleh")',NAME);if(n!==null){NAME=n.trim();LS.name=NAME;render()}},
 logout:()=>{if(confirm('Keluar dari aplikasi di HP ini?')){delete LS.pin;delete LS.cache;location.reload()}},
 login:()=>{const p=$('#pin').value.trim();if(!p)return toast('PIN wajib diisi','err');if(API_URL.startsWith('GANTI'))return toast('URL Web App belum diisi di app.js','err');
  PIN=p;NAME=$('#nm').value.trim();LS.pin=PIN;LS.name=NAME;$('#login').classList.add('hide');render();load()}};
document.addEventListener('click',e=>{const a=e.target.closest('[data-a]');if(a)A[a.dataset.a]?.(a.dataset,a)});
document.addEventListener('input',e=>{const t=e.target;
 if(t.matches('#nom,#as')){const d=t.value.replace(/\D/g,'');t.value=d?Number(d).toLocaleString('id-ID'):''}
 if(t.id=='q'){st.q=t.value;$('#list').innerHTML=histList()}});
document.addEventListener('change',e=>{const i=e.target.id;
 if(i=='fc'||i=='ff'||i=='ft'){st[i]=e.target.value;$('#list').innerHTML=histList()}
 if(i=='cf'||i=='ct'){st[i=='cf'?'from':'to']=e.target.value;render()}});
theme();render();
if(!PIN)showLogin();else load();
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&PIN)load()});
setInterval(()=>{if(!document.hidden&&PIN)load()},30000);
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
