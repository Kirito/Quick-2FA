document.addEventListener("DOMContentLoaded", () => {
  const secretInput=document.getElementById("secret");
  const codeEl=document.getElementById("code");
  const timerEl=document.getElementById("timer");
  const progressEl=document.getElementById("progress");
  const toggleSecretBtn=document.getElementById("toggleSecret");
  const toggleCodeBtn=document.getElementById("toggleCode");
  const profileSelect=document.getElementById("profileSelect");
  const profileNameInput=document.getElementById("profileName");
  const saveProfileBtn=document.getElementById("saveProfile");
  const importBtn=document.getElementById("importProfiles");
  const exportBtn=document.getElementById("exportProfiles");
  const renameBtn=document.getElementById("renameProfile");
  const deleteBtn=document.getElementById("deleteProfile");

  let showSecret=false, showCode=false;
  const eyeHidden=`<svg width="16" height="16" fill="#92D3CF" xmlns="http://www.w3.org/2000/svg"><path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/><path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/><path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/></svg>`;
  const eyeVisible=`<svg width="16" height="16" fill="#92D3CF" xmlns="http://www.w3.org/2000/svg"><path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/></svg>`;

  toggleSecretBtn.innerHTML=eyeHidden;
  toggleCodeBtn.innerHTML=eyeHidden;
  secretInput.addEventListener("input",()=>secretInput.value=secretInput.value.toUpperCase().replace(/[^A-Z2-7]/g,""));
  toggleSecretBtn.onclick=()=>{ showSecret=!showSecret; secretInput.type=showSecret?"text":"password"; toggleSecretBtn.innerHTML=showSecret?eyeVisible:eyeHidden; };
  toggleCodeBtn.onclick=()=>{ showCode=!showCode; codeEl.classList.toggle("hidden",!showCode); toggleCodeBtn.innerHTML=showCode?eyeVisible:eyeHidden; };
  codeEl.onclick=()=>{ if(!secretInput.value)return; navigator.clipboard.writeText(codeEl.textContent); saveProfileBtn.textContent="Code copied!"; setTimeout(()=>saveProfileBtn.textContent="Save 2FA Profile",1000); };

  function base32ToBytes(b32){ const chars="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; let bits="",bytes=[]; for(let c of b32) bits+=chars.indexOf(c).toString(2).padStart(5,"0"); for(let i=0;i+8<=bits.length;i+=8) bytes.push(parseInt(bits.slice(i,i+8),2)); return new Uint8Array(bytes);}
  async function generateTOTP(secret){ const key=base32ToBytes(secret); const counter=Math.floor(Date.now()/1000/30); const buf=new ArrayBuffer(8); new DataView(buf).setBigUint64(0,BigInt(counter)); const cryptoKey=await crypto.subtle.importKey("raw",key,{name:"HMAC",hash:"SHA-1"},false,["sign"]); const sig=new Uint8Array(await crypto.subtle.sign("HMAC",cryptoKey,buf)); const off=sig[sig.length-1]&0xf; const code=((sig[off]&0x7f)<<24)|((sig[off+1]&0xff)<<16)|((sig[off+2]&0xff)<<8)|(sig[off+3]&0xff); return (code % 1_000_000).toString().padStart(6,"0");}
  async function update(){ if(!secretInput.value)return; const rem=30-(Math.floor(Date.now()/1000)%30); timerEl.textContent=`${rem}s`; progressEl.style.width=`${(rem/30)*100}%`; try{ codeEl.textContent=await generateTOTP(secretInput.value);} catch{ codeEl.textContent="ERROR"; } }
  setInterval(update,500);

  function loadProfiles(){ chrome.storage.local.get("profiles",res=>{ const profiles=res.profiles||{}; profileSelect.innerHTML=`<option value="">(empty)</option>`; for(let n in profiles){ const o=document.createElement("option"); o.value=n; o.textContent=n; profileSelect.appendChild(o); } }); }
  profileSelect.onchange=()=>{ const val=profileSelect.value; if(!val) secretInput.value=""; else chrome.storage.local.get("profiles",res=>secretInput.value=(res.profiles||{})[val]||""); }

  saveProfileBtn.onclick=()=>{ const name=profileNameInput.value.trim(),secret=secretInput.value.trim(); if(!name||!secret){ saveProfileBtn.textContent="Enter name & secret!"; setTimeout(()=>saveProfileBtn.textContent="Save 2FA Profile",1500); return;} chrome.storage.local.get("profiles",res=>{ const profiles=res.profiles||{}; profiles[name]=secret; chrome.storage.local.set({profiles},()=>{ profileSelect.innerHTML=`<option value="">(empty)</option>`; for(let n in profiles){ const o=document.createElement("option"); o.value=n; o.textContent=n; profileSelect.appendChild(o);} profileSelect.value=name; secretInput.value=secret; profileNameInput.value=""; saveProfileBtn.textContent=`Profile saved as "${name}"`; setTimeout(()=>saveProfileBtn.textContent="Save 2FA Profile",1500); }); }); }

  exportBtn.onclick=()=>{ chrome.storage.local.get("profiles",res=>{ const p=res.profiles||{}; navigator.clipboard.writeText(JSON.stringify(p,null,2)).then(()=>{ exportBtn.textContent="Copied!"; setTimeout(()=>exportBtn.textContent="Export",1500); }).catch(()=>{ exportBtn.textContent="Error!"; setTimeout(()=>exportBtn.textContent="Export",1500); }); }); }
  importBtn.onclick=()=>{ const t=prompt("Paste JSON:"); if(!t)return; let d; try{ d=JSON.parse(t); if(typeof d!=="object"||Array.isArray(d))throw 0;} catch{ alert("Invalid JSON!"); return;} chrome.storage.local.get("profiles",res=>{ const p=res.profiles||{}; const m={...p,...d}; chrome.storage.local.set({profiles:m},()=>{ profileSelect.innerHTML=`<option value="">(empty)</option>`; for(let x in m){ const o=document.createElement("option"); o.value=x; o.textContent=x; profileSelect.appendChild(o);} alert("Profiles imported!"); }); }); }

  renameBtn.onclick=()=>{ const oldName=profileSelect.value; if(!oldName)return; const newName=prompt("Rename profile:",oldName); if(!newName||newName===oldName)return; chrome.storage.local.get("profiles",res=>{ const p=res.profiles||{}; p[newName]=p[oldName]; delete p[oldName]; chrome.storage.local.set({profiles:p},()=>{ profileSelect.innerHTML=`<option value="">(empty)</option>`; for(let n in p){ const o=document.createElement("option"); o.value=n; o.textContent=n; profileSelect.appendChild(o);} profileSelect.value=newName; }); }); }

  deleteBtn.onclick=()=>{ const name=profileSelect.value; if(!name)return; if(!confirm(`Delete profile "${name}"?`))return; chrome.storage.local.get("profiles",res=>{ const p=res.profiles||{}; delete p[name]; chrome.storage.local.set({profiles:p},()=>{ profileSelect.innerHTML=`<option value="">(empty)</option>`; for(let n in p){ const o=document.createElement("option"); o.value=n; o.textContent=n; profileSelect.appendChild(o);} secretInput.value=""; }); }); }

  loadProfiles();
});
