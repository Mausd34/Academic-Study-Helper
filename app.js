const KEY='academic-study-helper-v2';
const R=[
['CSE 4357','F','Saturday','09:35–10:35','1009'],['CSC 471','B','Saturday','11:45–12:45','1123'],
['ENG 250','A','Sunday','08:30–09:30','906'],['CSE 4357','F','Sunday','09:35–10:35','1005'],
['ENG 250','A','Monday','08:30–09:30','906'],['CSE 4357','F','Monday','09:35–10:35','1004'],['CSC 465','B','Monday','10:40–11:40','1004'],
['CSE 3308','C','Monday','13:10–14:10','EEELab6'],['CSE 3308','C','Monday','14:15–15:15','EEELab6'],
['EEN 184','B','Tuesday','08:30–09:30','EEELab1'],['EEN 184','B','Tuesday','09:35–10:35','EEELab1'],['CSC 465','B','Tuesday','10:40–11:40','912'],['CSC 471','B','Tuesday','11:45–12:45','1123'],
['ENG 250','A','Wednesday','08:30–09:30','906'],['CSC 465','B','Wednesday','10:40–11:40','909'],['CSC 471','B','Wednesday','11:45–12:45','501']];
const C=[...new Set(R.map(x=>x[0]))];
const base={att:Object.fromEntries(C.map(c=>[c,{p:0,a:0}])),tasks:[],notes:[],expenses:[],skills:[['Python',55],['SQL',35],['Machine Learning',30],['Data Analysis',25],['Git/GitHub',65],['FastAPI',15],['Flutter',10],['DSA',25]].map(x=>({name:x[0],value:x[1]})),goals:[['Portfolio projects',1,4],['Python + SQL',45,100],['ML fundamentals',30,100],['Tonu Student AI',10,100]].map(x=>({name:x[0],value:x[1],target:x[2]})),profile:{name:'Masud Rana',id:'22303062'},theme:'light'};
let S=read();
let timer={seconds:1500,running:false,id:null};

function read(){try{return Object.assign(structuredClone(base),JSON.parse(localStorage.getItem(KEY)||'{}'))}catch{return structuredClone(base)}}
function save(){localStorage.setItem(KEY,JSON.stringify(S))}
function safe(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]})}
function toast(v){const x=document.getElementById('toast');x.textContent=v;x.classList.add('show');setTimeout(function(){x.classList.remove('show')},1800)}
function page(p){document.querySelectorAll('.nav-item').forEach(function(b){b.classList.toggle('active',b.dataset.page===p)});document.querySelectorAll('.page').forEach(function(x){x.classList.remove('active')});document.getElementById('page-'+p).classList.add('active');document.getElementById('pageTitle').textContent=p==='assistant'?'AI Study Assistant':p[0].toUpperCase()+p.slice(1);document.getElementById('sidebar').classList.remove('open');render[p]()}
function card(title,body){return '<div class="card"><h2>'+title+'</h2>'+body+'</div>'}
function list(rows){return '<div class="list">'+rows.join('')+'</div>'}

const render={
dashboard:function(){
 let a=Object.values(S.att).reduce((n,x)=>n+x.p,0),t=Object.values(S.att).reduce((n,x)=>n+x.p+x.a,0),done=S.tasks.filter(x=>x.done).length,sp=S.expenses.reduce((n,x)=>n+Number(x.amount),0),avg=Math.round(S.skills.reduce((n,x)=>n+x.value,0)/S.skills.length);
 document.getElementById('page-dashboard').innerHTML=
 '<div class="grid grid-2"><div class="card hero"><h2>Welcome, '+safe(S.profile.name)+' 👋</h2><p class="muted">Fall 2026 · your personal academic command center.</p><span class="badge">ID '+safe(S.profile.id)+'</span></div>'+
 '<div class="card"><div class="muted small">Weekly class slots</div><div class="stat-value">16</div><div class="small muted">Saturday → Wednesday</div></div></div>'+
 '<div class="grid grid-4" style="margin-top:16px"><div class="card"><div class="muted small">Attendance</div><div class="stat-value">'+(t?Math.round(a/t*100):0)+'%</div></div>'+
 '<div class="card"><div class="muted small">Tasks</div><div class="stat-value">'+done+'/'+S.tasks.length+'</div></div>'+
 '<div class="card"><div class="muted small">Expenses</div><div class="stat-value">৳'+sp.toFixed(0)+'</div></div>'+
 '<div class="card"><div class="muted small">Skill average</div><div class="stat-value">'+avg+'%</div></div></div>'+
 '<div class="section-head"><h2>Courses this semester</h2><button class="btn" onclick="page(\'routine\')">Routine →</button></div>'+
 card('',list(C.map(function(c){return '<div class="list-row"><div><strong>'+c+'</strong><div class="small muted">'+R.filter(function(x){return x[0]===c}).length+' weekly slots</div></div><span class="badge">Course</span></div>'})))+
 '<div class="section-head"><h2>4-month career plan</h2></div><div class="grid grid-4">'+
 [['1','Python + SQL'],['2','Data Science + ML'],['3','FastAPI + Flutter'],['4','Ship + Portfolio']].map(function(x){return '<div class="card"><span class="badge">MONTH '+x[0]+'</span><h3>'+x[1]+'</h3><p class="small muted">Learn → build → publish.</p></div>'}).join('')+'</div>';
},
routine:function(){
 const days=['Saturday','Sunday','Monday','Tuesday','Wednesday'];
 document.getElementById('page-routine').innerHTML=card('Fall 2026 routine','<p class="small muted">Student ID '+safe(S.profile.id)+' · 16 weekly class slots</p><div class="calendar-strip">'+days.map(function(d){return '<button class="day-chip" onclick="showDay(\''+d+'\')"><strong>'+d.slice(0,3)+'</strong><small>'+R.filter(function(x){return x[2]===d}).length+' classes</small></button>'}).join('')+'</div>')+'<div id="routineList" style="margin-top:16px"></div>';
 showDay('Monday');
},
attendance:function(){
 document.getElementById('page-attendance').innerHTML='<div class="grid grid-3">'+C.map(function(c){let a=S.att[c],n=a.p+a.a,p=n?Math.round(a.p/n*100):0;return '<div class="card"><strong>'+c+'</strong><div class="small muted">Present '+a.p+' · Absent '+a.a+'</div><div class="progress"><i style="width:'+p+'%"></i></div><div class="actions"><button class="btn small" onclick="mark(\''+c+'\',1)">✓ Present</button><button class="btn small danger" onclick="mark(\''+c+'\',0)">× Absent</button></div></div>'}).join('')+'</div>';
},
tasks:function(){
 document.getElementById('page-tasks').innerHTML=
 card('Add assignment','<div class="form-grid"><div class="field full"><label>Task</label><input id="taskTitle" placeholder="e.g. CSC 465 TCP/IP assignment"></div><div class="field"><label>Course</label><select id="taskCourse">'+C.map(function(c){return '<option>'+c+'</option>'}).join('')+'</select></div><div class="field"><label>Due</label><input id="taskDue" type="date"></div></div><button class="btn primary" style="margin-top:12px" onclick="addTask()">Add task</button>')+
 '<div class="card" style="margin-top:16px">'+list(S.tasks.map(function(x){return '<div class="list-row"><label><input type="checkbox" '+(x.done?'checked':'')+' onchange="toggleTask(\''+x.id+'\')"> <span class="'+(x.done?'task-done':'')+'">'+safe(x.title)+'</span></label><button class="btn small danger" onclick="deleteTask(\''+x.id+'\')">Delete</button></div>'})||'<div class="empty">No assignments yet.</div>')+'</div>';
},
study:function(){
 let m=String(Math.floor(timer.seconds/60)).padStart(2,'0'),s=String(timer.seconds%60).padStart(2,'0');
 document.getElementById('page-study').innerHTML='<div class="card"><div class="timer-mode">Focus session</div><div class="timer">'+m+':'+s+'</div><div class="timer-controls"><button class="btn primary" onclick="timerStart()">'+(timer.running?'Pause':'Start')+'</button><button class="btn" onclick="timerSet(25)">Reset</button></div><div class="actions" style="justify-content:center"><button class="btn small" onclick="timerSet(25)">25 min</button><button class="btn small" onclick="timerSet(50)">50 min</button><button class="btn small" onclick="timerSet(5)">5 min break</button></div></div>';
},
notes:function(){
 document.getElementById('page-notes').innerHTML=card('Quick note','<div class="form-grid"><div class="field"><label>Title</label><input id="noteTitle"></div><div class="field"><label>Course</label><select id="noteCourse">'+C.map(function(c){return '<option>'+c+'</option>'}).join('')+'</select></div><div class="field full"><label>Note</label><textarea id="noteBody" placeholder="Write exam-friendly notes..."></textarea></div></div><button class="btn primary" onclick="addNote()">Save note</button>')+
 '<div class="grid grid-3" style="margin-top:16px">'+(S.notes.map(function(n){return '<div class="card"><strong>'+safe(n.title)+'</strong><div class="small muted">'+n.course+'</div><p class="note-body">'+safe(n.body)+'</p><button class="btn small danger" onclick="deleteNote(\''+n.id+'\')">Delete</button></div>'}).join('')||'<div class="card empty">No notes yet.</div>')+'</div>';
},
expenses:function(){
 let total=S.expenses.reduce(function(n,x){return n+Number(x.amount)},0);
 document.getElementById('page-expenses').innerHTML=card('Add expense','<div class="form-grid"><div class="field"><label>Amount ৳</label><input id="expenseAmount" type="number"></div><div class="field"><label>Category</label><select id="expenseCat"><option>Food</option><option>Transport</option><option>Education</option><option>Internet</option><option>Other</option></select></div><div class="field full"><label>Description</label><input id="expenseDesc"></div></div><button class="btn primary" onclick="addExpense()">Add expense</button>')+
 '<div class="card" style="margin-top:16px"><div class="muted small">Total tracked</div><div class="stat-value">৳'+total.toFixed(0)+'</div>'+list(S.expenses.map(function(x){return '<div class="list-row"><span>৳'+x.amount+' · '+safe(x.desc)+' · '+x.cat+'</span><button class="btn small danger" onclick="deleteExpense(\''+x.id+'\')">Delete</button></div>'})||'<div class="empty">No expenses.</div>')+'</div>';
},
skills:function(){
 document.getElementById('page-skills').innerHTML=card('Skill tracker',S.skills.map(function(x,i){return '<div style="margin:16px 0"><div class="skill-head"><span>'+x.name+'</span><span>'+x.value+'%</span></div><div class="progress"><i style="width:'+x.value+'%"></i></div><div class="actions"><button class="btn small" onclick="skill('+i+',-5)">−5</button><button class="btn small" onclick="skill('+i+',5)">+5</button></div></div>'}).join(''))+
 '<div class="card" style="margin-top:16px"><h2>4-month stack</h2>'+list([['Month 1','Python + SQL + Git'],['Month 2','Pandas + ML'],['Month 3','FastAPI + Flutter'],['Month 4','Ship + portfolio']].map(function(x){return '<div class="list-row"><strong>'+x[0]+'</strong><span class="small muted">'+x[1]+'</span></div>'}))+'</div>';
},
career:function(){
 document.getElementById('page-career').innerHTML=card('Career roadmap',S.goals.map(function(x,i){return '<div style="margin:18px 0"><div class="section-head" style="margin:0"><strong>'+x.name+'</strong><span>'+x.value+'/'+x.target+'</span></div><div class="progress"><i style="width:'+Math.min(100,x.value/x.target*100)+'%"></i></div><button class="btn small" onclick="goal('+i+',5)">+5</button></div>'}).join(''))+
 '<div class="card" style="margin-top:16px"><h2>Portfolio checklist</h2>'+list(['Student Performance Prediction','Personal Expense Analytics','AI Study Assistant API','Tonu Student AI'].map(function(x){return '<div class="list-row">'+x+'<span class="badge">Build</span></div>'}))+'</div>';
},
assistant:function(){
 document.getElementById('page-assistant').innerHTML='<div class="grid grid-2"><div class="card chat"><div class="section-head" style="margin:0"><h2>AI Study Assistant</h2><span class="badge">Offline</span></div><div class="chat-log" id="chatLog"><div class="bubble bot">Ask for explanations, MCQs, viva questions or a study plan.</div></div><div class="chat-input"><input id="askInput" placeholder="Explain TCP/IP simply"><button class="btn primary" onclick="askAI()">Send</button></div></div><div class="card"><h2>Quick prompts</h2><div class="actions">'+['Explain TCP/IP','5 ML viva questions','7-day Python plan','Networking MCQs','What should I study today?'].map(function(x){return '<button class="btn" onclick="quick(\''+x+'\')">'+x+'</button>'}).join('')+'</div><p class="small muted">Local-first. Add a secure FastAPI backend later for a real LLM.</p></div></div>';
},
settings:function(){
 document.getElementById('page-settings').innerHTML=card('Profile','<div class="field"><label>Name</label><input id="profileName" value="'+safe(S.profile.name)+'"></div><div class="field"><label>Student ID</label><input id="profileId" value="'+safe(S.profile.id)+'"></div><button class="btn primary" onclick="saveProfile()">Save</button>')+
 card('Data & privacy','<p class="small muted">Attendance, tasks, notes and expenses stay in this browser.</p><button class="btn" onclick="backup()">Export JSON</button><button class="btn danger" onclick="resetApp()">Reset app</button>');
}
};

function showDay(d){let a=R.filter(function(x){return x[2]===d}),el=document.getElementById('routineList');if(!el)return;el.innerHTML=card(d,list(a.map(function(x){return '<div class="list-row routine-card"><div><strong>'+x[0]+'</strong><div class="small muted">Section '+x[1]+' · Room '+x[4]+'</div></div><strong>'+x[3]+'</strong></div>'})))}
function mark(c,p){p?S.att[c].p++:S.att[c].a++;save();render.attendance();toast('Attendance saved')}
function addTask(){let title=document.getElementById('taskTitle').value.trim();if(!title)return toast('Enter a task');S.tasks.unshift({id:Date.now(),title:title,course:document.getElementById('taskCourse').value,due:document.getElementById('taskDue').value,done:false});save();render.tasks();toast('Task added')}
function toggleTask(id){let x=S.tasks.find(function(x){return x.id==id});if(x)x.done=!x.done;save();render.tasks()}
function deleteTask(id){S.tasks=S.tasks.filter(function(x){return x.id!=id});save();render.tasks()}
function timerSet(n){clearInterval(timer.id);timer.seconds=n*60;timer.running=false;render.study()}
function timerStart(){timer.running=!timer.running;if(timer.running){timer.id=setInterval(function(){timer.seconds--;if(timer.seconds<=0){clearInterval(timer.id);timer.seconds=0;timer.running=false;toast('Focus session complete 🎉')}render.study()},1000)}else clearInterval(timer.id);render.study()}
function addNote(){let title=document.getElementById('noteTitle').value.trim(),body=document.getElementById('noteBody').value.trim();if(!title||!body)return toast('Add title and note');S.notes.unshift({id:Date.now(),title:title,body:body,course:document.getElementById('noteCourse').value});save();render.notes();toast('Note saved')}
function deleteNote(id){S.notes=S.notes.filter(function(x){return x.id!=id});save();render.notes()}
function addExpense(){let amount=Number(document.getElementById('expenseAmount').value);if(!amount)return toast('Enter amount');S.expenses.unshift({id:Date.now(),amount:amount,desc:document.getElementById('expenseDesc').value,cat:document.getElementById('expenseCat').value});save();render.expenses();toast('Expense added')}
function deleteExpense(id){S.expenses=S.expenses.filter(function(x){return x.id!=id});save();render.expenses()}
function skill(i,d){S.skills[i].value=Math.max(0,Math.min(100,S.skills[i].value+d));save();render.skills()}
function goal(i,d){S.goals[i].value=Math.min(S.goals[i].target,S.goals[i].value+d);save();render.career()}
function answer(q){let x=q.toLowerCase();if(x.includes('tcp'))return 'TCP/IP simply: Application → Transport (TCP/UDP) → Internet (IP) → Link (Ethernet/Wi-Fi). বাংলায়: IP address/routing করে, TCP reliable delivery করে.';if(x.includes('viva')||x.includes('ml'))return 'ML viva: supervised learning, classification vs regression, train/test split, overfitting, precision/recall, F1 and cross-validation.';if(x.includes('python'))return '7-day Python: data structures → functions/OOP → files/JSON → modules → NumPy/Pandas → mini project → GitHub.';if(x.includes('mcq'))return 'Networking MCQs: TCP is connection-oriented; IP handles addressing/routing; UDP is transport; DNS maps domain to IP; HTTPS uses TLS.';if(x.includes('today'))return 'Study one 25-minute session for your next class topic and one for an assignment.';return 'Study method: define → learn 3 ideas → make an example → close notes → recall → answer 5 questions. বাংলায়: concept বুঝে নিজের ভাষায় লিখো, তারপর recall করো.'}
function askAI(){let q=document.getElementById('askInput').value.trim();if(!q)return;let l=document.getElementById('chatLog');l.innerHTML+='<div class="bubble user">'+safe(q)+'</div><div class="bubble bot">'+safe(answer(q))+'</div>';document.getElementById('askInput').value='';l.scrollTop=l.scrollHeight}
function quick(q){document.getElementById('askInput').value=q;askAI()}
function saveProfile(){S.profile.name=document.getElementById('profileName').value.trim()||'Masud Rana';S.profile.id=document.getElementById('profileId').value.trim()||'22303062';save();render.settings();toast('Profile saved')}
function backup(){let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(S,null,2)],{type:'application/json'}));a.download='academic-study-helper-backup.json';a.click()}
function resetApp(){if(confirm('Reset all local app data?')){localStorage.removeItem(KEY);S=read();render.dashboard();toast('App reset')}}
function theme(){S.theme=S.theme==='dark'?'light':'dark';document.body.classList.toggle('dark',S.theme==='dark');save()}

document.getElementById('themeBtn').onclick=theme;
document.getElementById('menuBtn').onclick=function(){document.getElementById('sidebar').classList.toggle('open')};
document.querySelectorAll('.nav-item').forEach(function(b){b.onclick=function(){page(b.dataset.page)}});
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(function(){});
document.body.classList.toggle('dark',S.theme==='dark');
render.dashboard();