(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const defaults = {theme:'dark',decimal:',',angle:'DEG',vibration:true,sound:false};
  let settings={...defaults}, expr='', evaluated=false, lastExpression='', lastAnswer=0;
  let memory=0, memorySet=false, inverse=false, mode='standard', history=[], audioContext, installEvent, toastTimer;
  const modeOrder=['standard','scientific','programmer'];
  const program={base:10,entry:'0',acc:null,pending:null,awaiting:false,label:''};
  try {settings={...defaults,...JSON.parse(localStorage.getItem('calc_settings_v4')||'{}')};history=JSON.parse(localStorage.getItem('calc_history_v4')||'[]');if(!Array.isArray(history))history=[]}catch{history=[]}
  const store=()=>{try{localStorage.setItem('calc_settings_v4',JSON.stringify(settings));localStorage.setItem('calc_theme',settings.theme)}catch{}};
  const storeHistory=()=>{try{localStorage.setItem('calc_history_v4',JSON.stringify(history.slice(0,50)))}catch{}};
  const fmt=(value)=>{
    if(!Number.isFinite(value))throw Error('Udefinert resultat');
    if(Math.abs(value)<1e-12)value=0;
    const n=Number(value.toPrecision(12));
    return n.toLocaleString(settings.decimal==='.'?'en-US':'nb-NO',{useGrouping:false,maximumSignificantDigits:12});
  };
  const raw=(number)=>Number(number.toPrecision(12)).toString();
  const pretty=(s)=>String(s).replace(/asin/g,'sin⁻¹').replace(/acos/g,'cos⁻¹').replace(/atan/g,'tan⁻¹').replace(/pow10/g,'10^').replace(/sqrt/g,'√').replace(/cbrt/g,'∛').replace(/\*/g,'×').replace(/\//g,'÷').replace(/-/g,'−').replace(/\./g,settings.decimal);
  const showToast=(message)=>{const t=$('#toast');t.textContent=message;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2200)};
  const guides={
    sin:['sin – sinus','Finner sinusverdien til en vinkel. Vinkelen tolkes som grader eller radianer, avhengig av DEG/RAD.', ['Velg DEG for grader.','Trykk sin, skriv vinkelen, og trykk =. Parentesen lukkes automatisk.'],'sin(30) = 0,5','sin(90°) = 1.'],
    cos:['cos – cosinus','Finner cosinusverdien til en vinkel.', ['Velg DEG for grader.','Trykk cos, skriv 60 og trykk =.'],'cos(60) = 0,5','Bruk RAD når vinkelen er oppgitt i radianer.'],
    tan:['tan – tangens','Finner tangensverdien til en vinkel. Tangens er ikke definert når cosinus er null.', ['Velg DEG.','Trykk tan, skriv 45 og trykk =.'],'tan(45) = 1','tan(90°) er udefinert og gir en feilmelding.'],
    asin:['sin⁻¹ – invers sinus','Finner vinkelen som har en gitt sinusverdi. Svaret vises i DEG eller RAD.', ['Trykk INV.','Trykk sin⁻¹, skriv 0,5 og trykk =.'],'sin⁻¹(0,5) = 30° i DEG','Verdien må være mellom −1 og 1.'],
    acos:['cos⁻¹ – invers cosinus','Finner vinkelen som har en gitt cosinusverdi.', ['Trykk INV og deretter cos⁻¹.','Skriv 0,5 og trykk =.'],'cos⁻¹(0,5) = 60° i DEG','Verdien må være mellom −1 og 1.'],
    atan:['tan⁻¹ – invers tangens','Finner vinkelen som har en gitt tangensverdi.', ['Trykk INV og deretter tan⁻¹.','Skriv 1 og trykk =.'],'tan⁻¹(1) = 45° i DEG','Svaret følger valgt vinkelenhet.'],
    ln:['ln – naturlig logaritme','Logaritmen med grunntall e. Spør hvilken eksponent e må ha for å gi tallet.', ['Trykk ln, skriv e og trykk =.'],'ln(e) = 1','Argumentet må være større enn null.'],
    log:['log – titallslogaritme','Logaritmen med grunntall 10.', ['Trykk log, skriv 1000 og trykk =.'],'log(1000) = 3','Argumentet må være større enn null.'],
    exp:['eˣ – eksponentialfunksjon','Opphøyer Eulers tall e i en valgt eksponent.', ['Trykk INV og deretter eˣ.','Skriv 1 og trykk =.'],'eˣ(1) ≈ 2,71828182846','Den inverse funksjonen til ln.'],
    pow10:['10ˣ – tierpotens','Opphøyer 10 i en valgt eksponent.', ['Trykk INV og deretter 10ˣ.','Skriv 3 og trykk =.'],'10ˣ(3) = 1000','Den inverse funksjonen til log.'],
    sqrt:['√ – kvadratrot','Finner tallet som multiplisert med seg selv gir tallet du skriver.', ['Trykk √, skriv 144 og trykk =.'],'√(144) = 12','Kvadratroten av et negativt tall er ikke et reelt tall.'],
    cbrt:['∛ – kubikkrot','Finner tallet som multiplisert med seg selv tre ganger gir tallet du skriver.', ['Trykk INV og deretter ∛.','Skriv 27 og trykk =.'],'∛(27) = 3','Kubikkrot fungerer også for negative tall.'],
    square:['x² – kvadrat','Opphøyer den foregående verdien i andre potens.', ['Skriv 7.','Trykk x² og deretter =.'],'7² = 49','Gå til INV for x³.'],
    cube:['x³ – kubikk','Opphøyer den foregående verdien i tredje potens.', ['Trykk INV og skriv 4.','Trykk x³ og deretter =.'],'4³ = 64','Gå ut av INV for x².'],
    power:['xʸ – potens','Opphøyer et grunntall i eksponenten du skriver etter knappen.', ['Skriv 2 og trykk xʸ.','Skriv 10 og trykk =.'],'2¹⁰ = 1024','Potenser beregnes før gange og pluss.'],
    nthroot:['ʸ√x – n-te rot','Finn en rot ved å skrive grunntallet, så rotens orden. Uttrykket bruker x^(1/n).', ['Trykk INV. Skriv 27 og trykk ʸ√x.','Skriv 3 og trykk =.'],'27^(1/3) = 3','For negative tall kan kubikkrotknappen ∛ brukes.'],
    reciprocal:['1/x – resiprok','Deler 1 på den foregående verdien.', ['Skriv 8.','Trykk 1/x og deretter =.'],'1/8 = 0,125','Null kan ikke brukes som divisor.'],
    factorial:['n! – fakultet','Multipliserer alle heltall fra 1 til n.', ['Skriv 5.','Trykk n! og deretter =.'],'5! = 5 × 4 × 3 × 2 × 1 = 120','Krever et heltall fra 0 til 170. 0! = 1.'],
    percent:['% – prosent','Deler tallet rett foran %-knappen på 100.', ['Skriv 200 × 15.','Trykk % og deretter =.'],'200 × 15 % = 30','Ved pluss regnes 200 + 15 % som 200,15.'],
    inverse:['INV – inverse funksjoner','Bytter blant annet sin til sin⁻¹, ln til eˣ, √ til ∛ og x² til x³.', ['Trykk INV én gang for inverse funksjoner.','Trykk INV igjen for de vanlige funksjonene.'],'INV → sin⁻¹(0,5) = 30° i DEG','Aktiv INV-knapp er markert.'],
    angle:['DEG / RAD – vinkelenhet','Bestemmer hvordan sin, cos, tan og de inverse funksjonene tolker og viser vinkler.', ['Bruk DEG når vinkelen er i grader.','Bruk RAD når vinkelen er i radianer.','Trykk knappen for å veksle.'],'sin(30°) = 0,5 i DEG','Valget finnes også under Innstillinger.'],
    ans:['ANS – forrige svar','Setter det sist beregnede resultatet inn i et nytt uttrykk.', ['Regn ut 5 × 4 = 20.','Trykk ANS, deretter × 3 og =.'],'ANS × 3 = 60','ANS er 0 før første beregning.'],
    open:['( – åpne parentes','Starter en gruppe som skal beregnes først.', ['Trykk (, skriv 2 + 3 og trykk ).','Trykk × 4 og =.'],'(2 + 3) × 4 = 20','= lukker manglende høyreparenteser automatisk.'],
    close:[') – lukke parentes','Avslutter den sist åpnede gruppen.', ['Trykk (, skriv 2 + 3 og trykk ).','Fortsett med × 4 og =.'],'(2 + 3) × 4 = 20','Knappen gjør ingenting uten en åpen parentes.'],
    pi:['π – pi','Matematisk konstant som beskriver forholdet mellom en sirkels omkrets og diameter.', ['Skriv 2 × π × 2 og trykk =.'],'2 × π × 2 ≈ 12,56637','π har omtrent verdien 3,14159.'],
    e:['e – Eulers tall','Konstanten e brukes i blant annet vekstberegning og naturlige logaritmer.', ['Trykk e, deretter xʸ.','Skriv 2 og trykk =.'],'e² ≈ 7,38906','e har omtrent verdien 2,71828.'],
    mc:['MC – tøm minnet','Sletter verdien du har lagret i minnet.', ['Trykk MC.','Minneindikatoren forsvinner fra displayet.'],'Lagret 42 → MC → tomt minne','Historikken påvirkes ikke.'],
    mr:['MR – hent fra minnet','Setter den lagrede minneverdien inn i uttrykket.', ['Skriv 12 og trykk MS.','Tøm uttrykket, trykk MR, ×, 5 og =.'],'12 × 5 = 60','MR gjør ingenting når minnet er tomt.'],
    ms:['MS – lagre i minnet','Lagrer gjeldende resultat og overskriver tidligere minneverdi.', ['Regn ut 25 × 4 =.','Trykk MS for å lagre 100.','Trykk MR for å hente verdien.'],'25 × 4 = 100 → MS → MR = 100','Minnet gjelder den åpne appøkten.'],
    mplus:['M+ – legg til i minnet','Legger den nåværende beregningen til lagret verdi.', ['Skriv 12 og trykk MS.','Tøm uttrykket, skriv 8 og trykk M+.','Trykk MR.'],'12 + 8 i minnet = 20','M+ bruker 0 som utgangspunkt når minnet er tomt.'],
    mminus:['M− – trekk fra minnet','Trekker den nåværende beregningen fra lagret verdi.', ['Skriv 100 og trykk MS.','Tøm uttrykket, skriv 25 og trykk M−.','Trykk MR.'],'100 − 25 i minnet = 75','M− bruker 0 som utgangspunkt når minnet er tomt.'],
    sign:['± – fortegn','Bytter fortegn for hele det gjeldende uttrykket.', ['Skriv 5.','Trykk ± for −5; trykk igjen for 5.'],'5 → ± → −5','For sammensatte uttrykk byttes fortegnet for hele uttrykket.'],
    and:['AND – bitvis OG','Et bit blir 1 bare hvis bitet er 1 i begge tallene.', ['Velg Programmer og HEX.','Skriv F, trykk AND, skriv 3 og trykk =.'],'F AND 3 = 3','Hver bit beregnes separat innenfor 32 bit.'],
    or:['OR – bitvis ELLER','Et bit blir 1 hvis det er 1 i minst ett av tallene.', ['Velg BIN.','Skriv 1, trykk OR, skriv 0 og trykk =.'],'1 OR 0 = 1','Resultatet vises samtidig i alle fire tallgrunnlag.'],
    xor:['XOR – eksklusiv ELLER','Et bit blir 1 når bitene er forskjellige.', ['Velg HEX.','Skriv F, trykk XOR, skriv 3 og trykk =.'],'F XOR 3 = C','Like bit gir 0.'],
    not:['NOT – bitvis IKKE','Vender alle 32 bit i tallet.', ['Velg Programmer.','Skriv 0 og trykk NOT.'],'NOT 0 = FFFFFFFF i HEX = −1 i DEC','HEX, OCT og BIN viser negative tall som 32-bit toerkomplement.'],
    shl:['≪ – venstreskift','Flytter bit mot venstre og fyller med nuller til høyre.', ['Skriv 1, trykk ≪, skriv 3 og trykk =.'],'1 ≪ 3 = 8','Bare de fem laveste bitene i skiftantallet brukes (0–31).'],
    shr:['≫ – høyreskift','Flytter bit mot høyre. Fortegnsbitet beholdes for negative tall.', ['Skriv 8, trykk ≫, skriv 2 og trykk =.'],'8 ≫ 2 = 2','Bare de fem laveste bitene i skiftantallet brukes (0–31).']
  };
  const feedback=(success=false)=>{
    if(settings.vibration&&navigator.vibrate)navigator.vibrate(success?14:6);
    if(!settings.sound)return;
    try {audioContext ||= new (window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume();const osc=audioContext.createOscillator(),gain=audioContext.createGain(),now=audioContext.currentTime;osc.type='sine';osc.frequency.value=success?960:650;gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.035,now+.007);gain.gain.exponentialRampToValueAtTime(.0001,now+.055);osc.connect(gain).connect(audioContext.destination);osc.start(now);osc.stop(now+.06)}catch{}
  };

  function factorial(x){if(!Number.isInteger(x)||x<0||x>170)throw Error('Fakultet krever heltall fra 0 til 170');let n=1;for(let i=2;i<=x;i++)n*=i;return n}
  function fn(name,x){const rad=settings.angle==='DEG'?Math.PI/180:1,deg=settings.angle==='DEG'?180/Math.PI:1;
    switch(name){case 'sin':return Math.sin(x*rad);case 'cos':return Math.cos(x*rad);case 'tan':if(Math.abs(Math.cos(x*rad))<1e-12)throw Error('Tangens er udefinert');return Math.tan(x*rad);case 'asin':return Math.asin(x)*deg;case 'acos':return Math.acos(x)*deg;case 'atan':return Math.atan(x)*deg;case 'ln':return Math.log(x);case 'log':return Math.log10(x);case 'sqrt':return Math.sqrt(x);case 'cbrt':return Math.cbrt(x);case 'exp':return Math.exp(x);case 'pow10':return 10**x;default:throw Error('Ukjent funksjon')}
  }
  function evaluate(source){
    const s=source.replace(/\s/g,'');let i=0;
    const peek=()=>s[i],digit=(c)=>c!==undefined&&c>='0'&&c<='9',alpha=(c)=>c!==undefined&&/[a-z]/i.test(c);
    function expression(){let v=term();while(peek()==='+'||peek()==='-'){const op=s[i++],right=term();v=op==='+'?v+right:v-right}return v}
    function term(){let v=unary();while(peek()==='*'||peek()==='/'){const op=s[i++],right=unary();if(op==='/'&&right===0)throw Error('Kan ikke dele på null');v=op==='*'?v*right:v/right}return v}
    function unary(){if(peek()==='-'){i++;return -unary()}if(peek()==='+'){i++;return unary()}return power()}
    function power(){let v=postfix();if(peek()==='^'){i++;v=Math.pow(v,unary())}return v}
    function postfix(){let v=primary();while(peek()==='!'||peek()==='%'){v=s[i++]==='!'?factorial(v):v/100}return v}
    function primary(){const c=peek();if(c==='('){i++;const v=expression();if(peek()!==')')throw Error('Mangler )');i++;return v}if(c==='π'){i++;return Math.PI}
      if(digit(c)||c==='.'){const start=i;while(digit(peek()))i++;if(peek()==='.'){i++;while(digit(peek()))i++}if(i===start+1&&s[start]==='.')throw Error('Ugyldig tall');if(peek()==='e'&&/[+\-0-9]/.test(s[i+1]||'')){const mark=i++;if(peek()==='+'||peek()==='-')i++;if(!digit(peek()))i=mark;else while(digit(peek()))i++}const v=Number(s.slice(start,i));if(!Number.isFinite(v))throw Error('Ugyldig tall');return v}
      if(alpha(c)){const start=i;while(alpha(peek())||digit(peek()))i++;const name=s.slice(start,i);if(name==='e')return Math.E;if(name==='pi')return Math.PI;if(peek()!=='(')throw Error('Mangler (');i++;const argument=expression();if(peek()!==')')throw Error('Mangler )');i++;return fn(name,argument)}
      throw Error('Ufullstendig uttrykk')}
    if(!s)throw Error('Tomt uttrykk');const result=expression();if(i!==s.length||!Number.isFinite(result))throw Error('Ugyldig uttrykk');return result;
  }
  const balanced=(s)=>{const count=[...s].reduce((n,c)=>n+(c==='('?1:c===')'?-1:0),0);return s+')'.repeat(Math.max(0,count))};
  const preview=()=>{try{if(!expr||/[+\-*/^(]$/.test(expr))return null;return evaluate(balanced(expr))}catch{return null}};
  function render(){
    const result=$('#result'),expression=$('#expression');
    result.classList.remove('error');expression.textContent=evaluated?pretty(lastExpression)+' =':pretty(expr);
    const value=evaluated?lastAnswer:preview();
    // Keep the literal number visible while typing: 0, and 0. must not collapse to 0.
    const standalone=/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(expr);
    result.textContent=evaluated?fmt(lastAnswer):standalone?pretty(expr):/\.$/.test(expr)?pretty(expr):value!==null?fmt(value):expr?pretty(expr):'0';
    $('#memoryFlag').hidden=!memorySet;$('#readoutMeta').hidden=!memorySet;
    result.scrollLeft=result.scrollWidth;expression.scrollLeft=expression.scrollWidth;
  }
  function edit(continuation=false){if(evaluated){expr=continuation?raw(lastAnswer):'';evaluated=false;lastExpression=''}}
  const last=()=>expr.at(-1)||'';
  const multiply=()=>/[0-9)πe!%]/.test(last());
  function inputDigit(d){edit();if(/[)πe!%]$/.test(expr))expr+='*';const m=expr.match(/(?:\d+\.?\d*|\.\d*)$/);if(m&&m[0].replace('.','').length>=15)return;if(m?.[0]==='0'&&d!=='0')expr=expr.slice(0,-1)+d;else if(m?.[0]==='0'&&d==='0')return;else expr+=d;render()}
  function dot(){edit();if(/[)πe!%]$/.test(expr))expr+='*';const m=expr.match(/(?:\d+\.?\d*|\.\d*)$/);if(m?.[0].includes('.'))return;expr+=m?'.':'0.';render()}
  function operator(op){edit(true);if(!expr){if(op==='-')expr='-';render();return}if(/[+\-*/^]$/.test(expr)){if(op==='-'&&/[*/^]$/.test(expr))expr+='-';else expr=expr.replace(/[+\-*/^]$/,op)}else if(last()==='('){if(op==='-')expr+='-'}else expr+=op;render()}
  function appendFunction(name){edit();if(multiply())expr+='*';expr+=name+'(';render()}
  function appendConstant(c){edit();if(multiply())expr+='*';expr+=c;render()}
  function perform(action){
    switch(action){
      case 'clear':expr='';evaluated=false;lastExpression='';break;
      case 'backspace':if(evaluated){expr=raw(lastAnswer);evaluated=false}if(/(?:asin|acos|atan|pow10|sqrt|cbrt|sin|cos|tan|log|exp|ln)\($/.test(expr))expr=expr.replace(/(?:asin|acos|atan|pow10|sqrt|cbrt|sin|cos|tan|log|exp|ln)\($/,'');else expr=expr.slice(0,-1);break;
      case 'dot':dot();return;
      case 'open':edit();if(multiply())expr+='*';expr+='(';break;
      case 'close':if([...expr].filter(c=>c==='(').length>[...expr].filter(c=>c===')').length&&!/[+\-*/^(]$/.test(expr))expr+=')';break;
      case 'percent':edit(true);if(/[0-9)πe]$/.test(expr))expr+='%';break;
      case 'square':case 'cube':edit(true);if(/[0-9)πe!%]$/.test(expr))expr+=action==='square'?'^2':'^3';break;
      case 'reciprocal':edit(true);if(/[0-9)πe!%]$/.test(expr))expr+='^(-1)';break;
      case 'nthroot':edit(true);if(/[0-9)πe!%]$/.test(expr))expr+='^(1/';break;
      case 'factorial':edit(true);if(/[0-9)πe]$/.test(expr))expr+='!';break;
      case 'sign':edit(true);expr=expr.startsWith('-')?expr.slice(1):'-'+(expr||'0');break;
      case 'ans':appendConstant(raw(lastAnswer));return;
      case 'inverse-mode':inverse=!inverse;$('#inverseButton').setAttribute('aria-pressed',String(inverse));document.querySelectorAll('[data-fn][data-inverse]').forEach(b=>b.textContent=inverse?({asin:'sin⁻¹',acos:'cos⁻¹',atan:'tan⁻¹',exp:'eˣ',pow10:'10ˣ',cbrt:'∛'}[b.dataset.inverse]):({sqrt:'√'}[b.dataset.fn]||b.dataset.fn));$('[data-action="square"]').textContent=inverse?'x³':'x²';$('[data-op="^"]').textContent=inverse?'ʸ√x':'xʸ';return;
      case 'angle':settings.angle=settings.angle==='DEG'?'RAD':'DEG';syncSettings();store();break;
      case 'equals':equals();return;
      case 'copy':copy();return;
      case 'paste':paste();return;
    }render();
  }
  function equals(){if(!expr||evaluated)return;try{const source=expr.replace(/[+\-*/^]+$/,'');const value=evaluate(balanced(source));const item={expression:source,result:value};history.unshift(item);history=history.slice(0,50);storeHistory();lastExpression=source;lastAnswer=value;expr=raw(value);evaluated=true;render();feedback(true)}catch(error){$('#result').textContent=error.message||'Ugyldig uttrykk';$('#result').classList.add('error');showToast('Sjekk uttrykket')}}
  function memoryAction(action){try{const v=evaluated?lastAnswer:expr?evaluate(balanced(expr)):0;switch(action){case 'mc':memory=0;memorySet=false;break;case 'mr':if(!memorySet)return;appendConstant(raw(memory));return;case 'ms':memory=v;memorySet=true;break;case 'mplus':memory=(memorySet?memory:0)+v;memorySet=true;break;case 'mminus':memory=(memorySet?memory:0)-v;memorySet=true;break}showToast(memorySet?'Minne: '+fmt(memory):'Minne tømt');render()}catch{showToast('Fullfør uttrykket først')}}
  const signed32=(value)=>BigInt.asIntN(32,value);
  function programValue(){const input=program.entry.replace(/\s/g,'');const prefix=program.base===16?'0x':program.base===8?'0o':program.base===2?'0b':'';return signed32(BigInt(prefix+input))}
  function programText(value,base,group=false){const v=signed32(value);if(base===10)return v.toString();let s=BigInt.asUintN(32,v).toString(base).toUpperCase();if(group&&base===2)s=s.replace(/\B(?=(?:[01]{4})+(?![01]))/g,'\u2009');return s}
  const programSymbol={add:'+',sub:'−',mul:'×',div:'÷',and:'AND',or:'OR',xor:'XOR',shl:'≪',shr:'≫'};
  function programCalculate(a,op,b){switch(op){case 'add':return signed32(a+b);case 'sub':return signed32(a-b);case 'mul':return signed32(a*b);case 'div':if(b===0n)throw Error('Kan ikke dele på null');return signed32(a/b);case 'and':return signed32(a&b);case 'or':return signed32(a|b);case 'xor':return signed32(a^b);case 'shl':return signed32(a<<(BigInt.asUintN(32,b)&31n));case 'shr':return signed32(a>>(BigInt.asUintN(32,b)&31n));default:throw Error('Ukjent operasjon')}}
  function renderProgram(){const value=programValue();for(const [base,id] of [[16,'hexValue'],[10,'decValue'],[8,'octValue'],[2,'binValue']]){$('#'+id).textContent=programText(value,base,true)}document.querySelectorAll('[data-base]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.base)===program.base)));$('#programExpression').textContent=program.pending?programText(program.acc,program.base)+' '+programSymbol[program.pending]:program.label}
  function renderProgramDigits(){const common=['clear','backspace','not','div'];const layouts={16:[...common,'7','8','9','mul','4','5','6','sub','1','2','3','add','0','equals'],10:[...common,'7','8','9','mul','4','5','6','sub','1','2','3','add','0','equals'],8:[...common,'7','6','5','mul','4','3','2','sub','1','0','add','equals'],2:[...common,'1','add','sub','mul','0','equals']};const labels={clear:'AC',backspace:'⌫',not:'NOT',div:'÷',mul:'×',sub:'−',add:'+',equals:'='};const letters=$('#programLetters'),root=$('#programDigits');letters.hidden=program.base!==16;letters.replaceChildren();root.replaceChildren();root.dataset.base=String(program.base);if(program.base===16)for(const letter of 'ABCDEF'){const b=document.createElement('button');b.dataset.programDigit=letter;b.textContent=letter;letters.append(b)}for(const key of layouts[program.base]){const b=document.createElement('button');if(labels[key]){b.dataset.programAction=key;b.textContent=labels[key];if(key==='clear')b.className='program-clear';if(key==='equals'){b.className='program-equals';b.setAttribute('aria-label','Beregn')}if(key==='backspace')b.setAttribute('aria-label','Slett siste siffer');if(key==='not')b.className='program-function';if(guideId(b))b.setAttribute('aria-description','Hold inne for forklaring og eksempel')}else{b.dataset.programDigit=key;b.textContent=key;if(key==='0'&&(program.base===10||program.base===16||program.base===2))b.className='program-zero-wide'}root.append(b)}}
  function selectBase(base){if(![2,8,10,16].includes(base)||base===program.base)return;const value=programValue();program.base=base;program.entry=programText(value,base);program.label='';renderProgramDigits();renderProgram()}
  function programDigit(digit){if(parseInt(digit,16)>=program.base)return;const current=program.awaiting?'0':program.entry;const next=current==='0'?digit:current+digit;const max={2:32,8:11,10:10,16:8}[program.base];if(next.replace('-','').length>max){showToast('Maks 32 bit');return}const prefix=program.base===16?'0x':program.base===8?'0o':program.base===2?'0b':'';const magnitude=BigInt(prefix+next);if(program.base===10&&(magnitude>2147483647n||magnitude< -2147483648n)||program.base!==10&&magnitude>4294967295n){showToast('Utenfor 32 bit');return}program.entry=next;program.awaiting=false;program.label='';renderProgram()}
  function programAction(action){if(action==='clear'){program.entry='0';program.acc=null;program.pending=null;program.awaiting=false;program.label='';renderProgram();return}if(action==='backspace'){if(program.awaiting){program.entry='0';program.awaiting=false}else program.entry=program.entry.slice(0,-1)||'0';if(program.entry==='-')program.entry='0';program.label='';renderProgram();return}
    const value=programValue();if(action==='not'){const result=signed32(~value);const expression='NOT '+programText(value,program.base);program.entry=programText(result,program.base);program.awaiting=false;program.label=expression+' =';history.unshift({kind:'program',expression,result:Number(result),base:program.base});history=history.slice(0,50);storeHistory();renderProgram();feedback(true);return}
    if(action==='equals'){if(!program.pending||program.awaiting)return;try{const result=programCalculate(program.acc,program.pending,value);const expression=programText(program.acc,program.base)+' '+programSymbol[program.pending]+' '+programText(value,program.base);history.unshift({kind:'program',expression,result:Number(result),base:program.base});history=history.slice(0,50);storeHistory();program.entry=programText(result,program.base);program.acc=null;program.pending=null;program.awaiting=true;program.label=expression+' =';renderProgram();feedback(true)}catch(error){showToast(error.message)}return}
    if(program.pending&&!program.awaiting){try{const result=programCalculate(program.acc,program.pending,value);program.entry=programText(result,program.base);program.acc=result}catch(error){showToast(error.message);return}}else program.acc=value;program.pending=action;program.awaiting=true;program.label='';renderProgram()}
  function setMode(next){if(next===mode)return;mode=next;const programMode=next==='programmer';$('#science').hidden=next!=='scientific';$('#standardPad').hidden=programMode;$('#programPad').hidden=!programMode;$('#readout').hidden=programMode;$('#programReadout').hidden=!programMode;const button=$('#modeToggle');const labels={standard:'Standard',scientific:'Vitenskapelig',programmer:'Programmer'};button.firstChild.textContent=labels[next]+' ';button.querySelector('span').textContent='›';const nextMode=modeOrder[(modeOrder.indexOf(next)+1)%modeOrder.length];button.setAttribute('aria-label',labels[next]+' modus. Bytt til '+labels[nextMode]);if(programMode)renderProgram()}
  function syncSettings(){document.documentElement.dataset.theme=settings.theme;document.querySelector('meta[name="theme-color"]').content=settings.theme==='light'?'#eeeeec':'#090a0b';for(const [id,value] of [['themeChoices',settings.theme],['decimalChoices',settings.decimal],['angleChoices',settings.angle]])document.querySelectorAll('#'+id+' button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.value===value)));$('#angleButton').textContent=settings.angle;$('#decimalButton').textContent=settings.decimal;$('#vibrationToggle').setAttribute('aria-checked',String(settings.vibration));$('#soundToggle').setAttribute('aria-checked',String(settings.sound));render()}
  function renderHistory(){const root=$('#historyList');root.replaceChildren();if(!history.length){const p=document.createElement('p');p.className='empty';p.textContent='Ingen beregninger ennå';root.append(p);return}history.forEach((item,i)=>{if(typeof item.expression!=='string'||!Number.isFinite(item.result))return;const b=document.createElement('button'),small=document.createElement('small'),strong=document.createElement('strong'),base=[2,8,10,16].includes(item.base)?item.base:10;b.className='hist-item';b.dataset.index=i;small.textContent=item.kind==='program'?item.expression+' · '+({16:'HEX',10:'DEC',8:'OCT',2:'BIN'}[base]):pretty(item.expression);strong.textContent=item.kind==='program'?programText(BigInt(Math.trunc(item.result)),base,true):fmt(item.result);b.append(small,strong);root.append(b)})}
  let previousFocus=null;
  function openSheet(id){previousFocus=document.activeElement;$('#historySheet').hidden=true;$('#settingsSheet').hidden=true;$('#guideSheet').hidden=true;$('#overlay').hidden=false;$(id).hidden=false;$(id).querySelector('[data-close]').focus()}
  function closeSheet(){$('#overlay').hidden=true;$('#historySheet').hidden=true;$('#settingsSheet').hidden=true;$('#guideSheet').hidden=true;if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});previousFocus=null}
  function guideId(button){if(button.dataset.programAction)return guides[button.dataset.programAction]?button.dataset.programAction:null;if(button.dataset.fn)return inverse?button.dataset.inverse:button.dataset.fn;if(button.dataset.memory)return button.dataset.memory;if(button.dataset.constant)return button.dataset.constant==='π'?'pi':'e';if(button.dataset.inverseAction&&inverse)return button.dataset.inverseAction;if(button.dataset.op==='^')return 'power';const action=button.dataset.action;return action==='inverse-mode'?'inverse':action==='reciprocal'?'reciprocal':guides[action]?action:null}
  function openGuide(id){const g=guides[id];if(!g)return;$('#guideTitle').textContent=g[0];const root=$('#guideContent');root.replaceChildren();const intro=document.createElement('p');intro.className='guide-intro';intro.textContent=g[1];root.append(intro);const steps=document.createElement('section');steps.className='guide-section';const title=document.createElement('h3');title.textContent='SLIK BRUKER DU KNAPPEN';const list=document.createElement('ol');list.className='guide-steps';g[2].forEach(step=>{const li=document.createElement('li');li.textContent=step;list.append(li)});steps.append(title,list);root.append(steps);const example=document.createElement('section');example.className='guide-section';const exampleBox=document.createElement('div');exampleBox.className='guide-example';const exampleLabel=document.createElement('strong');exampleLabel.textContent='EKSEMPEL';exampleBox.append(exampleLabel,document.createTextNode(g[3]));example.append(exampleBox);root.append(example);const note=document.createElement('section');note.className='guide-section';const noteTitle=document.createElement('h3');noteTitle.textContent='GREIT Å VITE';const noteText=document.createElement('p');noteText.className='guide-note';noteText.textContent=g[4];note.append(noteTitle,noteText);root.append(note);root.scrollTop=0;openSheet('#guideSheet')}
  async function copy(){const value=evaluated?lastAnswer:preview();if(value===null)return;try{await navigator.clipboard.writeText(raw(value));showToast('Resultatet er kopiert')}catch{showToast('Kopiering krever HTTPS eller localhost')}}
  async function paste(){try{let text=(await navigator.clipboard.readText()).trim().replace(/,/g,'.');if(!/^[+\-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+\-]?\d+)?$/i.test(text))throw Error();const n=Number(text);if(!Number.isFinite(n))throw Error();edit();if(multiply())expr+='*';expr+=raw(n);render();showToast('Tallet ble limt inn')}catch{showToast('Kunne ikke lime inn et tall')}}
  let suppressClickUntil=0;
  $('#keyArea').addEventListener('click',e=>{if(Date.now()<suppressClickUntil||!$('#overlay').hidden)return;const b=e.target.closest('button');if(!b)return;feedback();if(b.dataset.programDigit!==undefined){programDigit(b.dataset.programDigit);return}if(b.dataset.programAction){programAction(b.dataset.programAction);return}if(b.dataset.digit!==undefined)inputDigit(b.dataset.digit);else if(b.dataset.constant)appendConstant(b.dataset.constant);else if(b.dataset.memory)memoryAction(b.dataset.memory);else if(b.dataset.fn)appendFunction(inverse?b.dataset.inverse:b.dataset.fn);else if(b.dataset.inverseAction&&inverse)perform(b.dataset.inverseAction);else if(b.dataset.op)operator(b.dataset.op);else if(b.dataset.action)perform(b.dataset.action)});
  // Samsung Chrome: detect a hold only after 600 ms and cancel it as soon as a swipe starts.
  let holdTimer=null,holdStart=null,holdFired=false;
  const cancelHold=()=>{clearTimeout(holdTimer);holdTimer=null;holdStart=null};
  $('#keyArea').addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;const b=e.target.closest('button');if(!b)return;const id=guideId(b),back=b.dataset.action==='backspace'||b.dataset.programAction==='backspace';if(!id&&!back)return;cancelHold();holdFired=false;holdStart={x:e.clientX,y:e.clientY};holdTimer=setTimeout(()=>{holdTimer=null;holdStart=null;holdFired=true;suppressClickUntil=Date.now()+750;feedback(true);if(back){if(mode==='programmer')programAction('clear');else perform('clear');showToast('Uttrykket er tømt')}else openGuide(id)},600)});
  $('#keyArea').addEventListener('pointermove',e=>{if(holdStart&&Math.hypot(e.clientX-holdStart.x,e.clientY-holdStart.y)>12)cancelHold()});
  for(const name of ['pointerup','pointercancel','pointerleave'])$('#keyArea').addEventListener(name,()=>{if(holdFired){suppressClickUntil=Date.now()+750;holdFired=false}cancelHold()});
  $('#keyArea').addEventListener('contextmenu',e=>{if(e.target.closest('button'))e.preventDefault()});
  let swipeStart=null;
  const swipeArea=$('#keyArea');
  swipeArea.addEventListener('touchstart',e=>{if(e.touches.length!==1)return;const t=e.touches[0];swipeStart={x:t.clientX,y:t.clientY,time:Date.now()}},{passive:true});
  swipeArea.addEventListener('touchmove',e=>{if(!swipeStart||e.touches.length!==1)return;const t=e.touches[0];if(Math.hypot(t.clientX-swipeStart.x,t.clientY-swipeStart.y)>12)cancelHold()},{passive:true});
  swipeArea.addEventListener('touchend',e=>{if(holdFired){suppressClickUntil=Date.now()+750;holdFired=false}if(!swipeStart)return;const t=e.changedTouches[0],dx=t.clientX-swipeStart.x,dy=t.clientY-swipeStart.y,elapsed=Date.now()-swipeStart.time;swipeStart=null;cancelHold();if(elapsed<700&&Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.6){suppressClickUntil=Date.now()+650;const index=modeOrder.indexOf(mode),next=Math.max(0,Math.min(modeOrder.length-1,index+(dx<0?1:-1)));setMode(modeOrder[next]);feedback(true)}},{passive:true});
  swipeArea.addEventListener('touchcancel',()=>{swipeStart=null;cancelHold()},{passive:true});
  document.querySelectorAll('#science button,.keypad button[data-action="percent"],.keypad button[data-action="sign"],.program-actions button').forEach(b=>{if(guideId(b))b.setAttribute('aria-description','Hold inne for forklaring og eksempel')});
  $('#modeToggle').addEventListener('click',()=>{setMode(modeOrder[(modeOrder.indexOf(mode)+1)%modeOrder.length]);feedback(true)});
  let suppressBaseClickUntil=0;
  $('#programReadout .base-list').addEventListener('click',e=>{if(Date.now()<suppressBaseClickUntil)return;const button=e.target.closest('[data-base]');if(button){selectBase(Number(button.dataset.base));feedback(true)}});
  const programReadout=$('#programReadout'),baseOrder=[16,10,8,2];let baseSwipe=null;
  programReadout.addEventListener('touchstart',e=>{if(e.touches.length!==1||!$('#overlay').hidden)return;const t=e.touches[0];baseSwipe={x:t.clientX,y:t.clientY,time:Date.now()}},{passive:true});
  programReadout.addEventListener('touchend',e=>{if(!baseSwipe)return;const t=e.changedTouches[0],dx=t.clientX-baseSwipe.x,dy=t.clientY-baseSwipe.y,elapsed=Date.now()-baseSwipe.time;baseSwipe=null;if(elapsed<750&&Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5){suppressBaseClickUntil=Date.now()+700;const index=baseOrder.indexOf(program.base);selectBase(baseOrder[(index+(dx<0?1:baseOrder.length-1))%baseOrder.length]);feedback(true)}},{passive:true});
  programReadout.addEventListener('touchcancel',()=>baseSwipe=null,{passive:true});
  programReadout.addEventListener('keydown',e=>{if(e.target!==programReadout||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const index=baseOrder.indexOf(program.base);selectBase(baseOrder[(index+(e.key==='ArrowLeft'?1:baseOrder.length-1))%baseOrder.length])});
  function openHistory(){renderHistory();openSheet('#historySheet')}
  let historyTouch=null;
  for(const readout of [$('#readout'),$('#programReadout')]){
    readout.addEventListener('touchstart',e=>{if(e.touches.length!==1||!$('#overlay').hidden)return;const t=e.touches[0];historyTouch={x:t.clientX,y:t.clientY,time:Date.now()}},{passive:true});
    readout.addEventListener('touchmove',e=>{if(!historyTouch||e.touches.length!==1)return;const t=e.touches[0],dx=t.clientX-historyTouch.x,dy=t.clientY-historyTouch.y;if(dy>12&&dy>Math.abs(dx)*1.4)e.preventDefault()},{passive:false});
    readout.addEventListener('touchend',e=>{if(!historyTouch)return;const t=e.changedTouches[0],dx=t.clientX-historyTouch.x,dy=t.clientY-historyTouch.y,elapsed=Date.now()-historyTouch.time;historyTouch=null;if(elapsed<800&&dy>65&&dy>Math.abs(dx)*1.4){openHistory();feedback(true)}},{passive:true});
    readout.addEventListener('touchcancel',()=>historyTouch=null,{passive:true});
    readout.addEventListener('keydown',e=>{if(e.target===readout&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();openHistory()}});
  }
  let sheetTouch=null;const historySheet=$('#historySheet');
  historySheet.querySelector('.sheet-head').addEventListener('touchstart',e=>{const t=e.touches[0];sheetTouch={x:t.clientX,y:t.clientY}},{passive:true});
  historySheet.querySelector('.sheet-head').addEventListener('touchend',e=>{if(!sheetTouch)return;const t=e.changedTouches[0],dx=t.clientX-sheetTouch.x,dy=t.clientY-sheetTouch.y;sheetTouch=null;if(dy>65&&dy>Math.abs(dx)*1.5)closeSheet()},{passive:true});
  $('#settingsButton').addEventListener('click',()=>openSheet('#settingsSheet'));
  $('#overlay').addEventListener('click',closeSheet);document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',closeSheet));
  $('#historyList').addEventListener('click',e=>{const b=e.target.closest('[data-index]');if(!b)return;const h=history[Number(b.dataset.index)];if(h.kind==='program'){program.base=[2,8,10,16].includes(h.base)?h.base:10;program.entry=programText(BigInt(h.result),program.base);program.acc=null;program.pending=null;program.awaiting=false;program.label='';renderProgramDigits();setMode('programmer');renderProgram()}else{expr=raw(h.result);evaluated=false;setMode('standard');render()}closeSheet()});
  $('#clearHistory').addEventListener('click',()=>{history=[];storeHistory();renderHistory();showToast('Historikk tømt')});
  for(const [id,key] of [['themeChoices','theme'],['decimalChoices','decimal'],['angleChoices','angle']])$('#'+id).addEventListener('click',e=>{const button=e.target.closest('button[data-value]');if(!button)return;settings[key]=button.dataset.value;store();syncSettings();if(key==='decimal')renderHistory()});
  for(const [id,key] of [['vibrationToggle','vibration'],['soundToggle','sound']])$('#'+id).addEventListener('click',()=>{settings[key]=!settings[key];store();syncSettings()});
  document.addEventListener('keydown',e=>{if(!$('#overlay').hidden){if(e.key==='Escape')closeSheet();return}if(e.target.closest?.('button,select,input'))return;if(mode==='programmer'){const key=e.key.toUpperCase();if(/^[0-9A-F]$/.test(key)&&parseInt(key,16)<program.base)programDigit(key);else if(e.key==='Backspace')programAction('backspace');else if(e.key==='Escape')programAction('clear');else if(e.key==='Enter'||e.key==='='){e.preventDefault();programAction('equals')}else if({'+':'add','-':'sub','*':'mul','/':'div'}[e.key])programAction({'+':'add','-':'sub','*':'mul','/':'div'}[e.key]);return}if(/^[0-9]$/.test(e.key))inputDigit(e.key);else if(e.key==='.'||e.key===',')dot();else if(['+','-','*','/','^'].includes(e.key))operator(e.key);else if(e.key==='Enter'||e.key==='='){e.preventDefault();equals()}else if(e.key==='Backspace')perform('backspace');else if(e.key==='Escape')perform('clear');else if(e.key==='%')perform('percent')});
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;$('#installButton').hidden=false});
  $('#installButton').addEventListener('click',async()=>{if(!installEvent)return;installEvent.prompt();await installEvent.userChoice;installEvent=null;$('#installButton').hidden=true});
  window.addEventListener('appinstalled',()=>{$('#installButton').hidden=true;showToast('Kalkulator er installert')});
  if('serviceWorker'in navigator&&location.protocol!=='file:')window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  renderProgramDigits();syncSettings();setMode('standard');render();
})();
