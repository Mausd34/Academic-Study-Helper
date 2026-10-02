const KEY='academic-study-helper-v3';
const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const R=[
['CSE 4357','F','Saturday','09:35–10:35','1009'],['CSC 471','B','Saturday','11:45–12:45','1123'],
['ENG 250','A','Sunday','08:30–09:30','906'],['CSE 4357','F','Sunday','09:35–10:35','1005'],
['ENG 250','A','Monday','08:30–09:30','906'],['CSE 4357','F','Monday','09:35–10:35','1004'],['CSC 465','B','Monday','10:40–11:40','1004'],
['CSE 3308','C','Monday','13:10–14:10','EEELab6'],['CSE 3308','C','Monday','14:15–15:15','EEELab6'],
['EEN 184','B','Tuesday','08:30–09:30','EEELab1'],['EEN 184','B','Tuesday','09:35–10:35','EEELab1'],['CSC 465','B','Tuesday','10:40–11:40','912'],['CSC 471','B','Tuesday','11:45–12:45','1123'],
['ENG 250','A','Wednesday','08:30–09:30','906'],['CSC 465','B','Wednesday','10:40–11:40','909'],['CSC 471','B','Wednesday','11:45–12:45','501']];
const C=[...new Set(R.map(x=>x[0]))];
const base={
att:Object.fromEntries(C.map(c=>[c,{p:0,a:0}])),
tasks:[],notes:[],expenses:[],
skills:[['Python',55],['SQL',35],['Machine Learning',30],['Data Analysis',25],['Git/GitHub',65],['FastAPI',15],['Flutter',10],['DSA',25]].map(x=>({name:x[0],value:x[1]})),
goals:[['Portfolio projects',1,4],['Python + SQL',45,100],['ML fundamentals',30,100],['Tonu Student AI',10,100]].map(x=>({name:x[0],value:x[1],target:x[2]})),
study:{sessions:0,minutes:0},profile:{name:'Masud Rana',id:'22303062'},theme:'light'
};
let S=read();
let timer={seconds:1500,running:false,id:null};

function read(){
 try{
  const saved=JSON.parse(localStorage.getItem(KEY)||'{}');
  const s=structuredClone(base);
  Object.keys(saved).forEach(k=>{if(saved[k]!==undefined)s[k]=saved[k]});
  return s;
 }catch{return structuredClone(base)}
}
function save(){localStorage.setItem(KEY,JSON.stringify(S))}
function safe(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function toast(v){const x=document.getElementById('toast');x.textContent=v;x.classList.add('show');setTimeout(()=>x.classList.remove('show'),1800)}
function uid(){return Date.now()+Math.random().toString(16).slice(2)}
function todayName(){return DAYS[new Date().getDay()]}
function page(p){
 document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===p));
 document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
 document.getElementById('page-'+p).classList.add('active');
 document.getElementById('pageTitle').textContent=p==='assistant'?'AI Study Assistant':p[0].toUpperCase()+p.slice(1);
 document.getElementById('sidebar').classList.remove('open');
 render[p]();
}
function card(title,body){return '<div class="card">'+(title?'<h2>'+title+'</h2>':'')+body+'</div>'}
function list(rows){return '<div class="list">'+(rows.length?rows.join(''):'<div class="empty">Nothing here yet.</div>')+'</div>'}
function percent(n,d){return d?Math.round(n/d*100):0}
function dateLabel(v){if(!v)return 'No due date';const d=new Date(v+'T00:00:00');return d.toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})}

const render={
dashboard(){
 const present=Object.values(S.att).reduce((n,x)=>n+x.p,0), total=Object.values(S.att).reduce((n,x)=>n+x.p+x.a,0);
 const done=S.tasks.filter(x=>x.done).length, expense=S.expenses.reduce((n,x)=>n+Number(x.amount),0);
 const avg=Math.round(S.skills.reduce((n,x)=>n+x.value,0)/S.skills.length);
 const today=todayName(), todayClasses=R.filter(x=>x[2]===today);
 const upcoming=[...S.tasks].filter(x=>!x.done).sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')).slice(0,5);
 document.getElementById('page-dashboard').innerHTML=
 '<div class="grid grid-2"><div class="card hero"><h2>Welcome, '+safe(S.profile.name)+' 👋</h2><p class="muted">Fall 2026 · personal academic command center.</p><span class="badge">ID '+safe(S.profile.id)+'</span></div>'+
 '<div class="card"><div class="muted small">Today</div><div class="stat-value">'+today+'</div><div class="small muted">'+todayClasses.length+' class slots · '+new Date().toLocaleDateString(undefined,{day:'numeric',month:'long'})+'</div></div></div>'+
 '<div class="grid grid-4" style="margin-top:16px"><div class="card"><div class="muted small">Attendance</div><div class="stat-value">'+percent(present,total)+'%</div></div><div class="card"><div class="muted small">Tasks done</div><div class="stat-value">'+done+'/'+S.tasks.length+'</div></div><div class="card"><div class="muted small">Expenses</div><div class="stat-value">৳'+expense.toFixed(0)+'</div></div><div class="card"><div class="muted small">Skill average</div><div class="stat-value">'+avg+'%</div></div></div>'+
 '<div class="section-head"><h2>Today\'s classes</h2><button class="btn" onclick="page(\'routine\')">Full routine →</button></div>'+
 card('',list(todayClasses.map(x=>'<div class="list-row routine-card"><div><strong>'+x[0]+'</strong><div class="small muted">Section '+x[1]+' · Room '+x[4]+'</div></div><strong>'+x[3]+'</strong></div>')))+
 '<div class="section-head"><h2>Upcoming assignments</h2><button class="btn" onclick="page(\'tasks\')">Assignments →</button></div>'+
 card('',list(upcoming.map(x=>'<div class="list-row"><div><strong>'+safe(x.title)+'</strong><div class="small muted">'+safe(x.course)+' · '+dateLabel(x.due)+'</div></div><span class="badge '+(x.due&&x.due<new Date().toISOString().slice(0,10)?'danger':'warning')+'">'+(x.done?'Done':'Pending')+'</span></div>')))+
 '<div class="section-head"><h2>4-month career plan</h2></div><div class="grid grid-4">'+[['1','Python + SQL'],['2','Data Science + ML'],['3','FastAPI + Flutter'],['4','Ship + Portfolio']].map(x=>'<div class="card"><span class="badge">MONTH '+x[0]+'</span><h3>'+x[1]+'</h3><p class="small muted">Learn → build → publish.</p></div>').join('')+'</div>';
},
routine(){
 const days=['Saturday','Sunday','Monday','Tuesday','Wednesday'];
 document.getElementById('page-routine').innerHTML=card('Fall 2026 routine','<p class="small muted">Student ID '+safe(S.profile.id)+' · 16 weekly class slots</p><div class="calendar-strip">'+days.map(d=>'<button class="day-chip '+(d===todayName()?'active':'')+'" onclick="showDay(\''+d+'\')"><strong>'+d.slice(0,3)+'</strong><small>'+R.filter(x=>x[2]===d).length+' classes</small></button>').join('')+'</div>')+'<div id="routineList" style="margin-top:16px"></div>';
 showDay(days.includes(todayName())?todayName():'Monday');
},
attendance(){
 const rows=C.map(c=>{let a=S.att[c]||{p:0,a:0},n=a.p+a.a,p=percent(a.p,n);return '<div class="card"><strong>'+c+'</strong><div class="small muted">Present '+a.p+' · Absent '+a.a+'</div><div class="progress"><i style="width:'+p+'%"></i></div><div class="actions"><button class="btn small" onclick="mark(\''+c+'\',1)">✓ Present</button><button class="btn small danger" onclick="mark(\''+c+'\',0)">× Absent</button></div></div>'});
 document.getElementById('page-attendance').innerHTML='<div class="section-head"><h2>Per-course attendance</h2><span class="badge">'+C.length+' courses</span></div><div class="grid grid-3">'+rows.join('')+'</div>';
},
tasks(){
 const filter='<div class="field"><label>Search</label><input id="taskSearch" oninput="renderTaskList()" placeholder="Search assignments..."></div>';
 document.getElementById('page-tasks').innerHTML=card('Add assignment','<div class="form-grid"><div class="field full"><label>Task</label><input id="taskTitle" placeholder="e.g. CSC 465 TCP/IP assignment"></div><div class="field"><label>Course</label><select id="taskCourse">'+C.map(c=>'<option>'+c+'</option>').join('')+'</select></div><div class="field"><label>Due</label><input id="taskDue" type="date"></div><div class="field"><label>Priority</label><select id="taskPriority"><option>Normal</option><option>High</option><option>Low</option></select></div></div><button class="btn primary" style="margin-top:12px" onclick="addTask()">Add task</button>')+
 '<div class="card" style="margin-top:16px">'+filter+'<div id="taskList" style="margin-top:12px"></div></div>';
 renderTaskList();
},
study(){
 let m=String(Math.floor(timer.seconds/60)).padStart(2,'0'),s=String(timer.seconds%60).padStart(2,'0');
 document.getElementById('page-study').innerHTML='<div class="grid grid-2"><div class="card"><div class="timer-mode">Focus session</div><div class="timer">'+m+':'+s+'</div><div class="timer-controls"><button class="btn primary" onclick="timerStart()">'+(timer.running?'Pause':'Start')+'</button><button class="btn" onclick="timerSet(25)">Reset</button></div><div class="actions" style="justify-content:center;margin-top:12px"><button class="btn small" onclick="timerSet(25)">25 min</button><button class="btn small" onclick="timerSet(50)">50 min</button><button class="btn small" onclick="timerSet(5)">5 min break</button></div></div>'+
 '<div class="card"><h2>Study statistics</h2><div class="grid grid-2"><div><div class="muted small">Completed sessions</div><div class="stat-value">'+S.study.sessions+'</div></div><div><div class="muted small">Focused minutes</div><div class="stat-value">'+S.study.minutes+'</div></div></div><p class="small muted">Use 25-minute focus blocks for difficult topics, then recall what you learned without notes.</p></div></div>';
},
notes(){
 document.getElementById('page-notes').innerHTML=card('Quick note','<div class="form-grid"><div class="field"><label>Title</label><input id="noteTitle" placeholder="e.g. TCP 5-mark answer"></div><div class="field"><label>Course</label><select id="noteCourse">'+C.map(c=>'<option>'+c+'</option>').join('')+'</select></div><div class="field full"><label>Note</label><textarea id="noteBody" placeholder="Write exam-friendly notes..."></textarea></div></div><button class="btn primary" onclick="addNote()">Save note</button>')+
 '<div class="section-head"><h2>My notes</h2><input id="noteSearch" class="compact-search" oninput="renderNoteList()" placeholder="Search notes..."></div><div id="noteList" class="grid grid-3"></div>';
 renderNoteList();
},
expenses(){
 const total=S.expenses.reduce((n,x)=>n+Number(x.amount),0);
 document.getElementById('page-expenses').innerHTML=card('Add expense','<div class="form-grid"><div class="field"><label>Amount ৳</label><input id="expenseAmount" type="number" min="0"></div><div class="field"><label>Category</label><select id="expenseCat"><option>Food</option><option>Transport</option><option>Education</option><option>Internet</option><option>Other</option></select></div><div class="field"><label>Date</label><input id="expenseDate" type="date" value="'+new Date().toISOString().slice(0,10)+'"></div><div class="field full"><label>Description</label><input id="expenseDesc" placeholder="e.g. bus fare to IUBAT"></div></div><button class="btn primary" onclick="addExpense()">Add expense</button>')+
 '<div class="card" style="margin-top:16px"><div class="muted small">Total tracked</div><div class="stat-value">৳'+total.toFixed(0)+'</div><div id="expenseList">'+list(S.expenses.map(x=>'<div class="list-row"><span>৳'+Number(x.amount).toFixed(0)+' · '+safe(x.desc)+' · '+safe(x.cat)+'<div class="small muted">'+dateLabel(x.date)+'</div></span><button class="btn small danger" onclick="deleteExpense(\''+x.id+'\')">Delete</button></div>'))+'</div></div>';
},
skills(){
 document.getElementById('page-skills').innerHTML=card('Skill tracker',S.skills.map((x,i)=>'<div style="margin:16px 0"><div class="skill-head"><span>'+safe(x.name)+'</span><span>'+x.value+'%</span></div><div class="progress"><i style="width:'+x.value+'%"></i></div><div class="actions"><button class="btn small" onclick="skill('+i+',-5)">−5</button><button class="btn small" onclick="skill('+i+',5)">+5</button></div></div>').join(''))+
 '<div class="card" style="margin-top:16px"><h2>4-month stack</h2>'+list([['Month 1','Python + SQL + Git'],['Month 2','Pandas + ML'],['Month 3','FastAPI + Flutter'],['Month 4','Ship + portfolio']].map(x=>'<div class="list-row"><strong>'+x[0]+'</strong><span class="small muted">'+x[1]+'</span></div>'))+'</div>';
},
career(){
 document.getElementById('page-career').innerHTML=card('Career roadmap',S.goals.map((x,i)=>'<div style="margin:18px 0"><div class="section-head" style="margin:0"><strong>'+safe(x.name)+'</strong><span>'+x.value+'/'+x.target+'</span></div><div class="progress"><i style="width:'+Math.min(100,x.value/x.target*100)+'%"></i></div><button class="btn small" onclick="goal('+i+',5)">+5</button></div>').join(''))+
 '<div class="card" style="margin-top:16px"><h2>Portfolio checklist</h2>'+list(['Student Performance Prediction','Personal Expense Analytics','AI Study Assistant API','Tonu Student AI'].map(x=>'<div class="list-row">'+x+'<span class="badge">Build</span></div>'))+'</div>';
},
assistant(){
 document.getElementById('page-assistant').innerHTML='<div class="grid grid-2"><div class="card chat"><div class="section-head" style="margin:0"><h2>AI Study Assistant</h2><span class="badge">Offline</span></div><div class="chat-log" id="chatLog"><div class="bubble bot">Ask for explanations, MCQs, viva questions, revision plans, or today\'s priorities.</div></div><div class="chat-input"><input id="askInput" placeholder="Explain TCP/IP simply" onkeydown="if(event.key===\'Enter\')askAI()"><button class="btn primary" onclick="askAI()">Send</button></div></div><div class="card"><h2>Quick prompts</h2><div class="actions">'+['Explain TCP/IP','5 ML viva questions','7-day Python plan','Networking MCQs','What should I study today?','Explain compiler phases'].map(x=>'<button class="btn" onclick="quick(\''+x+'\')">'+x+'</button>').join('')+'</div><p class="small muted">Local-first and private. A future FastAPI backend can connect a real LLM without exposing API keys in this public frontend.</p></div></div>';
},
settings(){
 document.getElementById('page-settings').innerHTML=card('Profile','<div class="form-grid"><div class="field"><label>Name</label><input id="profileName" value="'+safe(S.profile.name)+'"></div><div class="field"><label>Student ID</label><input id="profileId" value="'+safe(S.profile.id)+'"></div></div><button class="btn primary" style="margin-top:12px" onclick="saveProfile()">Save profile</button>')+
 card('Data & privacy','<p class="small muted">Your academic records are stored locally in this browser. Export a backup before clearing browser data.</p><div class="actions"><button class="btn" onclick="backup()">Export JSON</button><label class="btn">Import JSON<input id="importFile" type="file" accept="application/json" hidden onchange="restore(event)"></label><button class="btn danger" onclick="resetApp()">Reset app</button></div>')+
 card('App','<p class="small muted">Academic Study Helper v3 · PWA · offline-first · no external analytics.</p><button class="btn" onclick="location.reload()">Reload app</button>');
}
};

function showDay(d){
 document.querySelectorAll('.day-chip').forEach(b=>b.classList.toggle('active',b.textContent.trim().startsWith(d.slice(0,3))));
 const a=R.filter(x=>x[2]===d),el=document.getElementById('routineList');if(!el)return;
 el.innerHTML=card(d,list(a.map(x=>'<div class="list-row routine-card"><div><strong>'+x[0]+'</strong><div class="small muted">Section '+x[1]+' · Room '+x[4]+'</div></div><strong>'+x[3]+'</strong></div>')));
}
function mark(c,p){if(!S.att[c])S.att[c]={p:0,a:0};p?S.att[c].p++:S.att[c].a++;save();render.attendance();toast('Attendance saved')}
function addTask(){
 const title=document.getElementById('taskTitle').value.trim();if(!title)return toast('Enter a task');
 S.tasks.unshift({id:uid(),title,course:document.getElementById('taskCourse').value,due:document.getElementById('taskDue').value,priority:document.getElementById('taskPriority').value,done:false});
 save();render.tasks();toast('Task added');
}
function renderTaskList(){
 const q=(document.getElementById('taskSearch')?.value||'').toLowerCase();
 const rows=S.tasks.filter(x=>(x.title+' '+x.course).toLowerCase().includes(q)).map(x=>'<div class="list-row"><label class="row-main"><input type="checkbox" '+(x.done?'checked':'')+' onchange="toggleTask(\''+x.id+'\')"><div><strong class="'+(x.done?'task-done':'')+'">'+safe(x.title)+'</strong><div class="small muted">'+safe(x.course)+' · '+dateLabel(x.due)+'</div></div></label><div class="actions"><span class="badge '+(x.priority==='High'?'danger':x.priority==='Low'?'success':'')+'">'+safe(x.priority||'Normal')+'</span><button class="btn small danger" onclick="deleteTask(\''+x.id+'\')">Delete</button></div></div>');
 document.getElementById('taskList').innerHTML=list(rows);
}
function toggleTask(id){const x=S.tasks.find(x=>x.id==id);if(x)x.done=!x.done;save();renderTaskList();toast(x?.done?'Task completed 🎉':'Task reopened')}
function deleteTask(id){S.tasks=S.tasks.filter(x=>x.id!=id);save();renderTaskList();toast('Task deleted')}
function timerSet(n){clearInterval(timer.id);timer.seconds=n*60;timer.running=false;render.study()}
function timerStart(){
 timer.running=!timer.running;
 if(timer.running)timer.id=setInterval(()=>{timer.seconds--;if(timer.seconds<=0){clearInterval(timer.id);timer.seconds=0;timer.running=false;S.study.sessions++;S.study.minutes+=25;save();toast('Focus session complete 🎉')}render.study()},1000);
 else clearInterval(timer.id);
 render.study();
}
function addNote(){
 const title=document.getElementById('noteTitle').value.trim(),body=document.getElementById('noteBody').value.trim();if(!title||!body)return toast('Add title and note');
 S.notes.unshift({id:uid(),title,body,course:document.getElementById('noteCourse').value,date:new Date().toISOString()});save();render.notes();toast('Note saved');
}
function renderNoteList(){
 const q=(document.getElementById('noteSearch')?.value||'').toLowerCase();
 const rows=S.notes.filter(n=>(n.title+' '+n.body+' '+n.course).toLowerCase().includes(q));
 document.getElementById('noteList').innerHTML=rows.length?rows.map(n=>'<div class="card"><strong>'+safe(n.title)+'</strong><div class="small muted">'+safe(n.course)+' · '+dateLabel((n.date||'').slice(0,10))+'</div><p class="note-body">'+safe(n.body)+'</p><button class="btn small danger" onclick="deleteNote(\''+n.id+'\')">Delete</button></div>').join(''):'<div class="card empty">No matching notes.</div>';
}
function deleteNote(id){S.notes=S.notes.filter(n=>n.id!=id);save();renderNoteList();toast('Note deleted')}
function addExpense(){
 const amount=Number(document.getElementById('expenseAmount').value);if(!(amount>0))return toast('Enter a valid amount');
 S.expenses.unshift({id:uid(),amount,desc:document.getElementById('expenseDesc').value.trim()||'Expense',cat:document.getElementById('expenseCat').value,date:document.getElementById('expenseDate').value});
 save();render.expenses();toast('Expense added');
}
function deleteExpense(id){S.expenses=S.expenses.filter(x=>x.id!=id);save();render.expenses();toast('Expense deleted')}
function skill(i,d){S.skills[i].value=Math.max(0,Math.min(100,S.skills[i].value+d));save();render.skills()}
function goal(i,d){S.goals[i].value=Math.min(S.goals[i].target,S.goals[i].value+d);save();render.career()}
function answer(q){
 const x=q.toLowerCase();
 if(x.includes('tcp'))return 'TCP/IP simply: Application → Transport (TCP/UDP) → Internet (IP) → Link (Ethernet/Wi-Fi). বাংলায়: IP addressing/routing করে, TCP reliable delivery করে.';
 if(x.includes('compiler'))return 'Compiler phases: lexical analysis → syntax analysis → semantic analysis → intermediate code → optimization → code generation. Symbol table and error handling support these phases.';
 if(x.includes('viva')||x.includes('ml'))return 'ML viva: supervised vs unsupervised learning, classification vs regression, train/test split, overfitting, precision/recall, F1, cross-validation and feature engineering.';
 if(x.includes('python'))return '7-day Python: data structures → functions/OOP → files/JSON → modules → NumPy/Pandas → mini project → GitHub.';
 if(x.includes('mcq'))return 'Networking MCQs: TCP is connection-oriented; IP handles addressing/routing; UDP is transport; DNS maps domains to IP addresses; HTTPS uses TLS.';
 if(x.includes('today'))return 'Today: 1) attend/review your next class, 2) do one assignment block, 3) 25 min Python/SQL, 4) finish with 5-minute active recall.';
 return 'Study method: define → learn 3 ideas → make an example → close notes → recall → answer 5 questions. বাংলায়: concept বুঝে নিজের ভাষায় লিখো, তারপর notes না দেখে recall করো.';
}
function askAI(){const q=document.getElementById('askInput').value.trim();if(!q)return;const l=document.getElementById('chatLog');l.innerHTML+='<div class="bubble user">'+safe(q)+'</div><div class="bubble bot">'+safe(answer(q))+'</div>';document.getElementById('askInput').value='';l.scrollTop=l.scrollHeight}
function quick(q){document.getElementById('askInput').value=q;askAI()}
function saveProfile(){S.profile.name=document.getElementById('profileName').value.trim()||'Masud Rana';S.profile.id=document.getElementById('profileId').value.trim()||'22303062';save();render.settings();toast('Profile saved')}
function backup(){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(S,null,2)],{type:'application/json'}));a.download='academic-study-helper-backup.json';a.click();URL.revokeObjectURL(a.href);toast('Backup exported')}
function restore(e){
 const file=e.target.files?.[0];if(!file)return;
 const r=new FileReader();r.onload=()=>{try{const data=JSON.parse(r.result);if(!data.profile||!Array.isArray(data.tasks))throw Error();S=Object.assign(structuredClone(base),data);save();render.dashboard();toast('Backup imported')}catch{toast('Invalid backup file')}};r.readAsText(file);
}
function resetApp(){if(confirm('Reset all local app data?')){localStorage.removeItem(KEY);S=structuredClone(base);save();render.dashboard();toast('App reset')}}
function theme(){S.theme=S.theme==='dark'?'light':'dark';document.body.classList.toggle('dark',S.theme==='dark');save()}
let deferredInstall=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;document.getElementById('installBtn').classList.add('primary')});
document.getElementById('installBtn').onclick=async()=>{if(!deferredInstall)return toast('Use browser menu → Install app');deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null};
document.getElementById('themeBtn').onclick=theme;
document.getElementById('menuBtn').onclick=()=>document.getElementById('sidebar').classList.toggle('open');
document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>page(b.dataset.page));
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
document.body.classList.toggle('dark',S.theme==='dark');
render.dashboard();
