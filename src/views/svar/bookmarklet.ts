/**
 * Bokmärket som läser kallelsesvaren på en aktivitet i Svenskalag. Det körs i
 * ledarens egen inloggade webbläsare, läser listorna Kommer, Kan ej och
 * Kallade och öppnar Hela Laget med svaren i adressen (efter #, som aldrig
 * skickas till någon server). Inga inloggningsuppgifter sparas någonstans.
 */
// Skrivet som vanlig text (inte en funktion i koden) så att bygget inte
// kan skriva om det. __ORIGIN__ byts mot appens adress.
const SOURCE = `(function(O){
var m=location.pathname.match(/\\/(?:aktivitet|match)\\/(\\d+)/);
if(!/(^|\\.)svenskalag\\.se$/.test(location.hostname)||!m){alert('Öppna en aktivitet på Svenskalag först, t.ex. en träning eller match.');return}
var PANES={attending:['tabYes','attending'],notattending:['tabNo','notattending'],invited:['tabNoAnswer','invited']};
var SKIP='.visible-print,.reply-button,thead,script,style,button,option,.dropdown-menu';
function pane(ids){for(var i=0;i<ids.length;i++){var d=document.getElementById(ids[i]);if(d)return d}return null}
function segs(el){var out=[],w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),n;
while((n=w.nextNode())){var p=n.parentElement;if(p&&p.closest(SKIP))continue;
var t=(n.nodeValue||'').replace(/\\s+/g,' ').trim();if(t)out.push(t)}return out}
function rows(p){var r=p.querySelectorAll('tr.reply-status');
if(!r.length)r=Array.prototype.filter.call(p.querySelectorAll('tr,li,.list-group-item'),function(e){return !e.closest('thead')});
return Array.prototype.map.call(r,segs).filter(function(s){return s.length>0})}
var lists={},total=0;
Object.keys(PANES).forEach(function(k){var p=pane(PANES[k]);lists[k]=p?rows(p):null;total+=lists[k]?lists[k].length:0});
var found=Object.keys(lists).some(function(k){return lists[k]!==null});
if(!found){alert('Hittade inga listor med svar på sidan. Är du inloggad på Svenskalag som ledare?');return}
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
