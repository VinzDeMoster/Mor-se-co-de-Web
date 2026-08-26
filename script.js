import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, getDocs, query, orderBy, limit, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app=initializeApp(firebaseConfig), auth=getAuth(app), db=getFirestore(app), provider=new GoogleAuthProvider();
let currentUser=null, isAdmin=false, allHistoryCache=[], announcementsCache=[];

const morse={A:".-",B:"-...",C:"-.-.",D:"-..",E:".",F:"..-.",G:"--.",H:"....",I:"..",J:".---",K:"-.-",L:".-..",M:"--",N:"-.",O:"---",P:".--.",Q:"--.-",R:".-.",S:"...",T:"-",U:"..-",V:"...-",W:".--",X:"-..-",Y:"-.--",Z:"--..",0:"-----",1:".----",2:"..---",3:"...--",4:"....-",5:".....",6:"-....",7:"--...",8:"---..",9:"----."};
const reverse=Object.fromEntries(Object.entries(morse).map(([a,b])=>[b,a]));

function $(id){return document.getElementById(id)}
function toast(msg){console.log(msg); alert(msg)}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

function clock(){const n=new Date(),h=n.getHours();$("clock").textContent=n.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"});$("dateText").textContent=n.toLocaleDateString("id-ID",{weekday:"long",year:"numeric",month:"long",day:"numeric"});$("greeting").textContent=h<5?"Selamat malam":h<11?"Selamat pagi":h<15?"Selamat siang":h<18?"Selamat sore":"Selamat malam"}
setInterval(clock,1000);clock();

function renderMorse(){ $("morseTable").innerHTML=Object.entries(morse).map(([a,b])=>`<div class="morse-item"><b>${a}</b><code>${b}</code></div>`).join("") } renderMorse();
function textToMorse(s){return [...s.toUpperCase()].map(c=>c===" " ? "/" : morse[c]||c).join(" ")}
function morseToText(s){return s.trim().split(/\s+/).map(x=>x==="/"?" ":reverse[x]||"�").join("")}

$("textInput").oninput=async e=>{const input=e.target.value;const output=input?textToMorse(input):"—";$("textMorseResult").textContent=output;if(input&&currentUser)await saveHistory("textToMorse",input,output)}
$("morseInput").oninput=async e=>{const input=e.target.value;const output=input?morseToText(input):"—";$("morseTextResult").textContent=output;if(input&&currentUser)await saveHistory("morseToText",input,output)}

async function saveHistory(type,input,output){try{await addDoc(collection(db,"history"),{uid:currentUser.uid,userName:currentUser.displayName||"",userEmail:currentUser.email||"",type,input:input.slice(0,2000),output:output.slice(0,2000),createdAt:serverTimestamp()});loadMyHistory()}catch(e){console.error(e)}}

async function loadMyHistory(){
 if(!currentUser){$("myHistory").innerHTML='<div class="empty">Login terlebih dahulu untuk melihat histori.</div>';return}
 const q=query(collection(db,"history"),where("uid","==",currentUser.uid),orderBy("createdAt","desc"),limit(100));
 const snap=await getDocs(q); const rows=[]; snap.forEach(d=>rows.push({id:d.id,...d.data()}));
 $("myHistory").innerHTML=rows.length?rows.map(historyHTML).join(""):'<div class="empty">Belum ada histori.</div>';
}
function historyHTML(x,admin=false){const date=x.createdAt?.toDate?x.createdAt.toDate().toLocaleString("id-ID"):"baru saja";return `<div class="history-item"><div class="meta"><span>${escapeHtml(x.userName||x.userEmail||x.uid||"User")}${admin?" • "+escapeHtml(x.userEmail||""):""}</span><span>${date}</span></div><b>${x.type==="textToMorse"?"Teks → Morse":"Morse → Teks"}</b><div>${escapeHtml(x.input)}</div><div class="arrow">↓</div><div>${escapeHtml(x.output)}</div>${admin?`<button class="danger delete-history" data-id="${x.id}">Hapus</button>`:""}</div>`}

$("clearMyHistory").onclick=async()=>{if(!currentUser)return; if(!confirm("Hapus seluruh histori akun ini?"))return;const snap=await getDocs(query(collection(db,"history"),where("uid","==",currentUser.uid)));await Promise.all(snap.docs.map(d=>deleteDoc(doc(db,"history",d.id))));loadMyHistory()}

async function loadAnnouncements(){
 const q=query(collection(db,"announcements"),orderBy("createdAt","desc"),limit(10));const snap=await getDocs(q);announcementsCache=[];snap.forEach(d=>announcementsCache.push({id:d.id,...d.data()}));
 $("announcements").innerHTML=announcementsCache.length?announcementsCache.map(a=>`<article class="announcement"><h3>📢 ${escapeHtml(a.title)}</h3><p>${escapeHtml(a.body)}</p><small>${a.createdAt?.toDate?a.createdAt.toDate().toLocaleString("id-ID"):"baru saja"} • ${escapeHtml(a.authorName||"Admin")}</small></article>`).join(""):'<div class="empty">Belum ada announcement.</div>';
 if(isAdmin)renderAdminAnnouncements();
}
async function loadAdminData(){
 if(!isAdmin)return;
 const [hs,us,as]=await Promise.all([getDocs(query(collection(db,"history"),orderBy("createdAt","desc"),limit(300))),getDocs(collection(db,"users")),getDocs(query(collection(db,"announcements"),orderBy("createdAt","desc"),limit(100)))]);
 allHistoryCache=[];hs.forEach(d=>allHistoryCache.push({id:d.id,...d.data()}));$("statUsers").textContent=us.size;$("statConversions").textContent=allHistoryCache.length;$("statAnnouncements").textContent=as.size;renderAllHistory();renderAdminAnnouncements();
}
function renderAllHistory(){const term=$("historySearch").value.toLowerCase(),type=$("historyType").value;const rows=allHistoryCache.filter(x=>(!type||x.type===type)&&(!term||[x.uid,x.userEmail,x.userName,x.input,x.output].join(" ").toLowerCase().includes(term)));$("allHistory").innerHTML=rows.length?rows.map(x=>historyHTML(x,true)).join(""):'<div class="empty">Tidak ada histori.</div>';document.querySelectorAll(".delete-history").forEach(b=>b.onclick=async()=>{await deleteDoc(doc(db,"history",b.dataset.id));loadAdminData();})}
function renderAdminAnnouncements(){$("adminAnnouncements").innerHTML=announcementsCache.map(a=>`<div class="history-item"><b>${escapeHtml(a.title)}</b><p>${escapeHtml(a.body)}</p><button class="danger delete-ann" data-id="${a.id}">Hapus</button></div>`).join("")||"Tidak ada";document.querySelectorAll(".delete-ann").forEach(b=>b.onclick=async()=>{await deleteDoc(doc(db,"announcements",b.dataset.id));loadAnnouncements();loadAdminData()})}

$("publishAnn").onclick=async()=>{if(!isAdmin)return toast("Akses ditolak.");const title=$("annTitle").value.trim(),body=$("annBody").value.trim();if(!title||!body)return toast("Judul dan isi wajib diisi.");await addDoc(collection(db,"announcements"),{title,body,authorUid:currentUser.uid,authorName:currentUser.displayName||"Admin",createdAt:serverTimestamp()});$("annTitle").value="";$("annBody").value="";loadAnnouncements();loadAdminData()}

$("historySearch").oninput=renderAllHistory;$("historyType").onchange=renderAllHistory;

function show(id){$("homeView").classList.toggle("hidden",id!=="home");document.querySelectorAll(".page").forEach(x=>x.classList.add("hidden"));if(id!=="home")$(id).classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"});if(id==="history")loadMyHistory();if(id==="admin"&&isAdmin)loadAdminData()}
document.querySelectorAll("[data-target]").forEach(b=>b.onclick=()=>show(b.dataset.target));document.querySelectorAll("[data-home]").forEach(b=>b.onclick=e=>{e.preventDefault();show("home")});$("adminBtn").onclick=()=>show("admin");

$("loginBtn").onclick=()=>$("loginModal").classList.remove("hidden");$("closeLogin").onclick=()=>$("loginModal").classList.add("hidden");$("googleLogin").onclick=async()=>{try{await signInWithPopup(auth,provider);$("loginModal").classList.add("hidden")}catch(e){toast(e.message)}}
$("logoutBtn").onclick=()=>signOut(auth);

onAuthStateChanged(auth,async user=>{
 currentUser=user;
 $("loginBtn").classList.toggle("hidden",!!user);$("logoutBtn").classList.toggle("hidden",!user);
 if(!user){isAdmin=false;$("adminBtn").classList.add("hidden");$("myHistory").innerHTML='<div class="empty">Login terlebih dahulu.</div>';return}
 try{const snap=await getDocs(query(collection(db,"admins"),where("__name__","==",user.uid)));isAdmin=!snap.empty}catch(e){isAdmin=false}
 $("adminBtn").classList.toggle("hidden",!isAdmin);await loadMyHistory();await loadAnnouncements();if(isAdmin)await loadAdminData();
});
loadAnnouncements();
