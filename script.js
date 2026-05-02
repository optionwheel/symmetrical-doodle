(() => {
const STORAGE_KEYS = {options: "neonWheel.options", history: "neonWheel.history"};
const DEFAULT_OPTIONS = ["Charlie Kirk","Epstein","Mark Zuckerberg","Donald Trump","Diddy","Netanyahu","Lebron James","Elon Musk"];
const LEGACY_OPTIONS = ["1","2","3","4","5","6","7","8"];
const INITIAL_HISTORY_VISIBLE = 5;
const TAU = Math.PI * 2;
const POINTER_ANGLE = -Math.PI / 2;

const palette = ["#e40303","#004dff","#008026","#ffed00","#ff8c00","#750787","#ff5bbd","#5bcffa"];

const spinLabels = ["spin it","risk it","turn it","run it"];
const spinMessages = [
"john pork is calling ...","running goon.exe ...","hiding all nude photos ...",
"waiting on response from block #67 ...","calculating your forehead ...",
"taking a big shit ...","leaking your ip ...","connecting to po*nhub.com ...",
"reporting you to police ...","confirming your bank details ...","flirting with your ex ..."
];

const clipPool = Array.from({ length: 52 }, (_, i) => "./media/" + (i+1) + ".webm");

const historyNotes = [
"what the flip","emotional damage","we're so cooked","how did this happen",
"i guess bro","who approved this","witnessing greatness","absolute peak",
"villain won","easy sidequest","generational fumble","w speed"
];

const elements = {
canvas: document.getElementById("wheelCanvas"),
spinButton: document.getElementById("spinButton"),
spinButtonLabel: document.querySelector("#spinButton span"),
optionsInput: document.getElementById("optionsInput"),
resetOptions: document.getElementById("resetOptions"),
statusMessage: document.getElementById("statusMessage"),
historyList: document.getElementById("historyList"),

```
settingsPanel: document.getElementById("settingsPanel"),
preferredOption: document.getElementById("preferredOption"),
hideSettings: document.getElementById("hideSettings")
```

};

const ctx = elements.canvas.getContext("2d");

const state = {
options: [],
history: [],
rotation: 0,
isSpinning: false
};

function parseOptions() {
return elements.optionsInput.value
.split(/\r?\n/)
.map(o => o.trim())
.filter(Boolean);
}

function updateOptions() {
const opts = parseOptions();
state.options = opts;

```
elements.preferredOption.innerHTML = '<option value="">Random</option>';

opts.forEach(opt => {
  const el = document.createElement("option");
  el.value = opt;
  el.textContent = opt;
  elements.preferredOption.appendChild(el);
});
```

}

function randomItem(arr){
return arr[Math.floor(Math.random()*arr.length)];
}

function updateSpinLabel(){
elements.spinButtonLabel.textContent = randomItem(spinLabels);
}

function pickWinnerIndex() {
const preferredValue = elements.preferredOption.value;
const preferredIndex = state.options.indexOf(preferredValue);

```
return preferredIndex >= 0
  ? preferredIndex
  : Math.floor(Math.random() * state.options.length);
```

}

function normalizeAngle(a){
return ((a % TAU) + TAU) % TAU;
}

function drawWheel() {
const size = elements.canvas.width = elements.canvas.offsetWidth;
const center = size/2;
const radius = center - 20;

```
ctx.clearRect(0,0,size,size);

if(state.options.length < 2){
  ctx.fillStyle = "#fff";
  ctx.fillText("add options", center-40, center);
  return;
}

const angle = TAU / state.options.length;

state.options.forEach((opt,i)=>{
  const start = i*angle + state.rotation;
  const end = start + angle;

  ctx.beginPath();
  ctx.moveTo(center,center);
  ctx.arc(center,center,radius,start,end);
  ctx.fillStyle = palette[i % palette.length];
  ctx.fill();

  ctx.save();
  ctx.translate(center,center);
  ctx.rotate(start + angle/2);
  ctx.fillStyle="#fff";
  ctx.fillText(opt, radius*0.6,0);
  ctx.restore();
});
```

}

function spinWheel(){
if(state.isSpinning || state.options.length < 2) return;

```
state.isSpinning = true;
elements.statusMessage.textContent = randomItem(spinMessages);
updateSpinLabel();

const targetIndex = pickWinnerIndex();
const angle = TAU / state.options.length;

const targetRotation =
  state.rotation +
  TAU*10 +
  (TAU - targetIndex*angle - angle/2);

const start = state.rotation;
const duration = 3200;
const startTime = performance.now();

function animate(now){
  const t = Math.min((now-startTime)/duration,1);
  const eased = 1 - Math.pow(1-t,3);

  state.rotation = start + (targetRotation-start)*eased;
  drawWheel();

  if(t<1) requestAnimationFrame(animate);
  else finishSpin();
}

requestAnimationFrame(animate);
```

}

function finishSpin(){
const angle = TAU / state.options.length;
const index = Math.floor(
normalizeAngle(TAU - state.rotation) / angle
) % state.options.length;

```
const winner = state.options[index];

elements.statusMessage.textContent = "Winner: " + winner;
state.isSpinning = false;

addHistory(winner);
```

}

function addHistory(winner){
const time = new Date().toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});
state.history.unshift({winner,time,note:randomItem(historyNotes)});
renderHistory();
}

function renderHistory(){
elements.historyList.innerHTML = "";

```
state.history.slice(0,5).forEach(entry=>{
  const li = document.createElement("li");
  li.textContent = `${entry.winner} (${entry.time})`;
  elements.historyList.appendChild(li);
});
```

}

function toggleSettings(){
document.body.classList.toggle("settings-open");
}

function bindEvents(){
elements.spinButton.addEventListener("click", spinWheel);

```
elements.optionsInput.addEventListener("input", ()=>{
  updateOptions();
  drawWheel();
});

elements.resetOptions.addEventListener("click", ()=>{
  elements.optionsInput.value="";
  updateOptions();
  drawWheel();
});

elements.hideSettings.addEventListener("click", ()=>{
  document.body.classList.remove("settings-open");
});

document.addEventListener("keydown",(e)=>{
  if(e.key==="s") toggleSettings();
});
```

}

function init(){
updateOptions();
drawWheel();
bindEvents();
updateSpinLabel();

```
setInterval(()=>{
  if(!state.isSpinning) updateSpinLabel();
},2000);
```

}

init();
})();
