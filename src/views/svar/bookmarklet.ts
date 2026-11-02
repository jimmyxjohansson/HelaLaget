/**
 * Bokmärket som läser kallelsesvaren på en aktivitet i Svenskalag. Det körs i
 * ledarens egen inloggade webbläsare, läser listorna Kommer, Kan ej och
 * Kallade och öppnar Hela Laget med svaren i adressen (efter #, som aldrig
 * skickas till någon server). Inga inloggningsuppgifter sparas någonstans.
 */
// Skrivet som vanlig text (inte en funktion i koden) så att bygget inte
// kan skriva om det. __ORIGIN__ byts mot appens adress.
const SOURCE = `(function(O){
var m=location.pathname.match(/\\/aktivitet\\/(\\d+)/);
if(!/(^|\\.)svenskalag\\.se$/.test(location.hostname)||!m){alert('Öppna en aktivitet på Svenskalag först, t.ex. en träning eller match.');return}
var ROW='tr,li,.list-group-item';
function pane(id){var d=document.getElementById(id);if(d)return d;
var a=document.querySelector('[href$="#'+id+'"],[data-target="#'+id+'"],[data-bs-target="#'+id+'"],[aria-controls="'+id+'"]');if(!a)return null;
var t=(a.getAttribute('aria-controls')||a.getAttribute('data-bs-target')||a.getAttribute('data-target')||a.getAttribute('href')||'').replace(/^.*#/,'');
return t?document.getElementById(t):null}
function segs(el){var out=[],w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),n;
while((n=w.nextNode())){var p=n.parentElement;if(p&&/^(SCRIPT|STYLE|BUTTON|OPTION)$/.test(p.tagName))continue;
var t=(n.nodeValue||'').replace(/\\s+/g,' ').trim();if(t)out.push(t)}return out}
function rows(p){var r=Array.prototype.filter.call(p.querySelectorAll(ROW),function(e){if(e.closest('thead'))return false;
var o=e.parentElement&&e.parentElement.closest(ROW);return !o||!p.contains(o)});
if(!r.length)r=Array.prototype.slice.call(p.children);
return r.map(segs).filter(function(s){return s.length>0})}
var lists={},total=0;
['attending','notattending','invited'].forEach(function(id){var p=pane(id);lists[id]=p?rows(p):null;total+=lists[id]?lists[id].length:0});
if(!total){alert('Hittade inga listor med svar på sidan. Är du inloggad på Svenskalag?');return}
var d={v:1,url:location.href.split('#')[0],activity:m[1],title:document.title,lists:lists};
window.open(O+'/-/svenskalag/svar#'+encodeURIComponent(JSON.stringify(d)),'_blank')
})(__ORIGIN__)`

/** javascript:-länken att dra till bokmärkesfältet. */
export function bookmarkletHref(origin: string) {
  return `javascript:${encodeURIComponent(SOURCE.replace(/\n/g, '').replace('__ORIGIN__', JSON.stringify(origin)))}`
}

export type SvarPayload = {
  v: 1
  url: string
  activity: string
  title?: string
  lists: Partial<Record<'attending' | 'notattending' | 'invited', string[][] | null>>
}
