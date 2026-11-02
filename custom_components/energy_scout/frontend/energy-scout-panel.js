var xe=Object.defineProperty;var Se=Object.getOwnPropertyDescriptor;var g=(a,e,t,s)=>{for(var i=s>1?void 0:s?Se(e,t):e,r=a.length-1,n;r>=0;r--)(n=a[r])&&(i=(s?n(e,t,i):n(i))||i);return s&&i&&xe(e,t,i),i};var z=globalThis,D=z.ShadowRoot&&(z.ShadyCSS===void 0||z.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,W=Symbol(),ie=new WeakMap,R=class{constructor(e,t,s){if(this._$cssResult$=!0,s!==W)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o,t=this.t;if(D&&e===void 0){let s=t!==void 0&&t.length===1;s&&(e=ie.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),s&&ie.set(t,e))}return e}toString(){return this.cssText}},re=a=>new R(typeof a=="string"?a:a+"",void 0,W),V=(a,...e)=>{let t=a.length===1?a[0]:e.reduce((s,i,r)=>s+(n=>{if(n._$cssResult$===!0)return n.cssText;if(typeof n=="number")return n;throw Error("Value passed to 'css' function must be a 'css' function result: "+n+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+a[r+1],a[0]);return new R(t,a,W)},ae=(a,e)=>{if(D)a.adoptedStyleSheets=e.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(let t of e){let s=document.createElement("style"),i=z.litNonce;i!==void 0&&s.setAttribute("nonce",i),s.textContent=t.cssText,a.appendChild(s)}},F=D?a=>a:a=>a instanceof CSSStyleSheet?(e=>{let t="";for(let s of e.cssRules)t+=s.cssText;return re(t)})(a):a;var{is:Ee,defineProperty:Ce,getOwnPropertyDescriptor:Re,getOwnPropertyNames:ke,getOwnPropertySymbols:Oe,getPrototypeOf:Ne}=Object,L=globalThis,ne=L.trustedTypes,Pe=ne?ne.emptyScript:"",Te=L.reactiveElementPolyfillSupport,k=(a,e)=>a,O={toAttribute(a,e){switch(e){case Boolean:a=a?Pe:null;break;case Object:case Array:a=a==null?a:JSON.stringify(a)}return a},fromAttribute(a,e){let t=a;switch(e){case Boolean:t=a!==null;break;case Number:t=a===null?null:Number(a);break;case Object:case Array:try{t=JSON.parse(a)}catch{t=null}}return t}},j=(a,e)=>!Ee(a,e),oe={attribute:!0,type:String,converter:O,reflect:!1,useDefault:!1,hasChanged:j};Symbol.metadata??=Symbol("metadata"),L.litPropertyMetadata??=new WeakMap;var v=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=oe){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){let s=Symbol(),i=this.getPropertyDescriptor(e,s,t);i!==void 0&&Ce(this.prototype,e,i)}}static getPropertyDescriptor(e,t,s){let{get:i,set:r}=Re(this.prototype,e)??{get(){return this[t]},set(n){this[t]=n}};return{get:i,set(n){let h=i?.call(this);r?.call(this,n),this.requestUpdate(e,h,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??oe}static _$Ei(){if(this.hasOwnProperty(k("elementProperties")))return;let e=Ne(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(k("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(k("properties"))){let t=this.properties,s=[...ke(t),...Oe(t)];for(let i of s)this.createProperty(i,t[i])}let e=this[Symbol.metadata];if(e!==null){let t=litPropertyMetadata.get(e);if(t!==void 0)for(let[s,i]of t)this.elementProperties.set(s,i)}this._$Eh=new Map;for(let[t,s]of this.elementProperties){let i=this._$Eu(t,s);i!==void 0&&this._$Eh.set(i,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){let t=[];if(Array.isArray(e)){let s=new Set(e.flat(1/0).reverse());for(let i of s)t.unshift(F(i))}else e!==void 0&&t.push(F(e));return t}static _$Eu(e,t){let s=t.attribute;return s===!1?void 0:typeof s=="string"?s:typeof e=="string"?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){let e=new Map,t=this.constructor.elementProperties;for(let s of t.keys())this.hasOwnProperty(s)&&(e.set(s,this[s]),delete this[s]);e.size>0&&(this._$Ep=e)}createRenderRoot(){let e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return ae(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,s){this._$AK(e,s)}_$ET(e,t){let s=this.constructor.elementProperties.get(e),i=this.constructor._$Eu(e,s);if(i!==void 0&&s.reflect===!0){let r=(s.converter?.toAttribute!==void 0?s.converter:O).toAttribute(t,s.type);this._$Em=e,r==null?this.removeAttribute(i):this.setAttribute(i,r),this._$Em=null}}_$AK(e,t){let s=this.constructor,i=s._$Eh.get(e);if(i!==void 0&&this._$Em!==i){let r=s.getPropertyOptions(i),n=typeof r.converter=="function"?{fromAttribute:r.converter}:r.converter?.fromAttribute!==void 0?r.converter:O;this._$Em=i;let h=n.fromAttribute(t,r.type);this[i]=h??this._$Ej?.get(i)??h,this._$Em=null}}requestUpdate(e,t,s,i=!1,r){if(e!==void 0){let n=this.constructor;if(i===!1&&(r=this[e]),s??=n.getPropertyOptions(e),!((s.hasChanged??j)(r,t)||s.useDefault&&s.reflect&&r===this._$Ej?.get(e)&&!this.hasAttribute(n._$Eu(e,s))))return;this.C(e,t,s)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(e,t,{useDefault:s,reflect:i,wrapped:r},n){s&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,n??t??this[e]),r!==!0||n!==void 0)||(this._$AL.has(e)||(this.hasUpdated||s||(t=void 0),this._$AL.set(e,t)),i===!0&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}let e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[i,r]of this._$Ep)this[i]=r;this._$Ep=void 0}let s=this.constructor.elementProperties;if(s.size>0)for(let[i,r]of s){let{wrapped:n}=r,h=this[i];n!==!0||this._$AL.has(i)||h===void 0||this.C(i,void 0,r,h)}}let e=!1,t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(s=>s.hostUpdate?.()),this.update(t)):this._$EM()}catch(s){throw e=!1,this._$EM(),s}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(e){}firstUpdated(e){}};v.elementStyles=[],v.shadowRootOptions={mode:"open"},v[k("elementProperties")]=new Map,v[k("finalized")]=new Map,Te?.({ReactiveElement:v}),(L.reactiveElementVersions??=[]).push("2.1.2");var X=globalThis,le=a=>a,I=X.trustedTypes,he=I?I.createPolicy("lit-html",{createHTML:a=>a}):void 0,ge="$lit$",b=`lit$${Math.random().toFixed(9).slice(2)}$`,fe="?"+b,Ue=`<${fe}>`,x=document,P=()=>x.createComment(""),T=a=>a===null||typeof a!="object"&&typeof a!="function",ee=Array.isArray,He=a=>ee(a)||typeof a?.[Symbol.iterator]=="function",K=`[ 	
\f\r]`,N=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,ce=/-->/g,de=/>/g,w=RegExp(`>|${K}(?:([^\\s"'>=/]+)(${K}*=${K}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),pe=/'/g,ue=/"/g,ye=/^(?:script|style|textarea|title)$/i,te=a=>(e,...t)=>({_$litType$:a,strings:e,values:t}),d=te(1),Ke=te(2),Je=te(3),S=Symbol.for("lit-noChange"),c=Symbol.for("lit-nothing"),me=new WeakMap,A=x.createTreeWalker(x,129);function ve(a,e){if(!ee(a)||!a.hasOwnProperty("raw"))throw Error("invalid template strings array");return he!==void 0?he.createHTML(e):e}var Me=(a,e)=>{let t=a.length-1,s=[],i,r=e===2?"<svg>":e===3?"<math>":"",n=N;for(let h=0;h<t;h++){let l=a[h],o,m,p=-1,y=0;for(;y<l.length&&(n.lastIndex=y,m=n.exec(l),m!==null);)y=n.lastIndex,n===N?m[1]==="!--"?n=ce:m[1]!==void 0?n=de:m[2]!==void 0?(ye.test(m[2])&&(i=RegExp("</"+m[2],"g")),n=w):m[3]!==void 0&&(n=w):n===w?m[0]===">"?(n=i??N,p=-1):m[1]===void 0?p=-2:(p=n.lastIndex-m[2].length,o=m[1],n=m[3]===void 0?w:m[3]==='"'?ue:pe):n===ue||n===pe?n=w:n===ce||n===de?n=N:(n=w,i=void 0);let $=n===w&&a[h+1].startsWith("/>")?" ":"";r+=n===N?l+Ue:p>=0?(s.push(o),l.slice(0,p)+ge+l.slice(p)+b+$):l+b+(p===-2?h:$)}return[ve(a,r+(a[t]||"<?>")+(e===2?"</svg>":e===3?"</math>":"")),s]},U=class a{constructor({strings:e,_$litType$:t},s){let i;this.parts=[];let r=0,n=0,h=e.length-1,l=this.parts,[o,m]=Me(e,t);if(this.el=a.createElement(o,s),A.currentNode=this.el.content,t===2||t===3){let p=this.el.content.firstChild;p.replaceWith(...p.childNodes)}for(;(i=A.nextNode())!==null&&l.length<h;){if(i.nodeType===1){if(i.hasAttributes())for(let p of i.getAttributeNames())if(p.endsWith(ge)){let y=m[n++],$=i.getAttribute(p).split(b),q=/([.?@])?(.*)/.exec(y);l.push({type:1,index:r,name:q[2],strings:$,ctor:q[1]==="."?Y:q[1]==="?"?Z:q[1]==="@"?G:C}),i.removeAttribute(p)}else p.startsWith(b)&&(l.push({type:6,index:r}),i.removeAttribute(p));if(ye.test(i.tagName)){let p=i.textContent.split(b),y=p.length-1;if(y>0){i.textContent=I?I.emptyScript:"";for(let $=0;$<y;$++)i.append(p[$],P()),A.nextNode(),l.push({type:2,index:++r});i.append(p[y],P())}}}else if(i.nodeType===8)if(i.data===fe)l.push({type:2,index:r});else{let p=-1;for(;(p=i.data.indexOf(b,p+1))!==-1;)l.push({type:7,index:r}),p+=b.length-1}r++}}static createElement(e,t){let s=x.createElement("template");return s.innerHTML=e,s}};function E(a,e,t=a,s){if(e===S)return e;let i=s!==void 0?t._$Co?.[s]:t._$Cl,r=T(e)?void 0:e._$litDirective$;return i?.constructor!==r&&(i?._$AO?.(!1),r===void 0?i=void 0:(i=new r(a),i._$AT(a,t,s)),s!==void 0?(t._$Co??=[])[s]=i:t._$Cl=i),i!==void 0&&(e=E(a,i._$AS(a,e.values),i,s)),e}var J=class{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){let{el:{content:t},parts:s}=this._$AD,i=(e?.creationScope??x).importNode(t,!0);A.currentNode=i;let r=A.nextNode(),n=0,h=0,l=s[0];for(;l!==void 0;){if(n===l.index){let o;l.type===2?o=new H(r,r.nextSibling,this,e):l.type===1?o=new l.ctor(r,l.name,l.strings,this,e):l.type===6&&(o=new Q(r,this,e)),this._$AV.push(o),l=s[++h]}n!==l?.index&&(r=A.nextNode(),n++)}return A.currentNode=x,i}p(e){let t=0;for(let s of this._$AV)s!==void 0&&(s.strings!==void 0?(s._$AI(e,s,t),t+=s.strings.length-2):s._$AI(e[t])),t++}},H=class a{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,s,i){this.type=2,this._$AH=c,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=s,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode,t=this._$AM;return t!==void 0&&e?.nodeType===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=E(this,e,t),T(e)?e===c||e==null||e===""?(this._$AH!==c&&this._$AR(),this._$AH=c):e!==this._$AH&&e!==S&&this._(e):e._$litType$!==void 0?this.$(e):e.nodeType!==void 0?this.T(e):He(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==c&&T(this._$AH)?this._$AA.nextSibling.data=e:this.T(x.createTextNode(e)),this._$AH=e}$(e){let{values:t,_$litType$:s}=e,i=typeof s=="number"?this._$AC(e):(s.el===void 0&&(s.el=U.createElement(ve(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===i)this._$AH.p(t);else{let r=new J(i,this),n=r.u(this.options);r.p(t),this.T(n),this._$AH=r}}_$AC(e){let t=me.get(e.strings);return t===void 0&&me.set(e.strings,t=new U(e)),t}k(e){ee(this._$AH)||(this._$AH=[],this._$AR());let t=this._$AH,s,i=0;for(let r of e)i===t.length?t.push(s=new a(this.O(P()),this.O(P()),this,this.options)):s=t[i],s._$AI(r),i++;i<t.length&&(this._$AR(s&&s._$AB.nextSibling,i),t.length=i)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){let s=le(e).nextSibling;le(e).remove(),e=s}}setConnected(e){this._$AM===void 0&&(this._$Cv=e,this._$AP?.(e))}},C=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,s,i,r){this.type=1,this._$AH=c,this._$AN=void 0,this.element=e,this.name=t,this._$AM=i,this.options=r,s.length>2||s[0]!==""||s[1]!==""?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=c}_$AI(e,t=this,s,i){let r=this.strings,n=!1;if(r===void 0)e=E(this,e,t,0),n=!T(e)||e!==this._$AH&&e!==S,n&&(this._$AH=e);else{let h=e,l,o;for(e=r[0],l=0;l<r.length-1;l++)o=E(this,h[s+l],t,l),o===S&&(o=this._$AH[l]),n||=!T(o)||o!==this._$AH[l],o===c?e=c:e!==c&&(e+=(o??"")+r[l+1]),this._$AH[l]=o}n&&!i&&this.j(e)}j(e){e===c?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}},Y=class extends C{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===c?void 0:e}},Z=class extends C{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==c)}},G=class extends C{constructor(e,t,s,i,r){super(e,t,s,i,r),this.type=5}_$AI(e,t=this){if((e=E(this,e,t,0)??c)===S)return;let s=this._$AH,i=e===c&&s!==c||e.capture!==s.capture||e.once!==s.once||e.passive!==s.passive,r=e!==c&&(s===c||i);i&&this.element.removeEventListener(this.name,this,s),r&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}},Q=class{constructor(e,t,s){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(e){E(this,e)}};var qe=X.litHtmlPolyfillSupport;qe?.(U,H),(X.litHtmlVersions??=[]).push("3.3.3");var $e=(a,e,t)=>{let s=t?.renderBefore??e,i=s._$litPart$;if(i===void 0){let r=t?.renderBefore??null;s._$litPart$=i=new H(e.insertBefore(P(),r),r,void 0,t??{})}return i._$AI(a),i};var se=globalThis,_=class extends v{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=$e(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return S}};_._$litElement$=!0,_.finalized=!0,se.litElementHydrateSupport?.({LitElement:_});var ze=se.litElementPolyfillSupport;ze?.({LitElement:_});(se.litElementVersions??=[]).push("4.2.2");var be=a=>(e,t)=>{t!==void 0?t.addInitializer(()=>{customElements.define(a,e)}):customElements.define(a,e)};var De={attribute:!0,type:String,converter:O,reflect:!1,hasChanged:j},Le=(a=De,e,t)=>{let{kind:s,metadata:i}=t,r=globalThis.litPropertyMetadata.get(i);if(r===void 0&&globalThis.litPropertyMetadata.set(i,r=new Map),s==="setter"&&((a=Object.create(a)).wrapped=!0),r.set(t.name,a),s==="accessor"){let{name:n}=t;return{set(h){let l=e.get.call(this);e.set.call(this,h),this.requestUpdate(n,l,a,!0,h)},init(h){return h!==void 0&&this.C(n,void 0,a,h),h}}}if(s==="setter"){let{name:n}=t;return function(h){let l=this[n];e.call(this,h),this.requestUpdate(n,l,a,!0,h)}}throw Error("Unsupported decorator location: "+s)};function M(a){return(e,t)=>typeof t=="object"?Le(a,e,t):((s,i,r)=>{let n=i.hasOwnProperty(r);return i.constructor.createProperty(r,s),n?Object.getOwnPropertyDescriptor(i,r):void 0})(a,e,t)}function f(a){return M({...a,state:!0,attribute:!1})}var _e=["ha-data-table","ha-form","ha-button","ha-checkbox","ha-input-search"];async function we(a){if(_e.every(h=>customElements.get(h)))return;let e=a,t;for(;e;){if(e instanceof HTMLElement&&e.localName==="partial-panel-resolver"){t=e;break}e=e.parentNode??(e.getRootNode().host||null)}let s=t?.routerOptions?.routes?.config?.load;if(!s)throw new Error("HA controls could not load. Retry, or use Energy Scout integration options.");await s();let i=document.createElement("ha-panel-config"),r=i.routerOptions?.routes.entities?.load,n=i.routerOptions?.routes.general?.load;if(!r||!n)throw new Error("HA controls are unavailable. Use Energy Scout integration options.");if(await Promise.all([r(),n()]),!_e.every(h=>customElements.get(h)))throw new Error("Some HA controls are unavailable. Use Energy Scout integration options.")}var Ae={ready:"Ready",tracked:"Already tracked",needs_attention:"Needs attention",power_only:"Power only",ignored:"Ignored"},je={stale_review:"Sensors or Energy settings changed. Rescan and review the selection again.",duplicate_counter:"Two selected counters appear to measure the same channel. Select one, preferably its lifetime total.",invalid_power:"A power mapping is unavailable or shared by several selected counters. Edit those mappings.",invalid_upstream:"An upstream device changed. Edit the mapping before adding.",modified_entry:"An entry was changed outside Energy Scout. Manage it in Energy settings.",has_children:"A selected entry is an upstream device for another entry. Adjust that relationship in Energy settings first.",not_loaded:"Energy Scout is not loaded. Reload the integration in Settings.",unauthorized:"An administrator account is required.",write_failed:"The operation could not finish. Rescan and check Energy settings before retrying."},u=class extends _{constructor(){super(...arguments);this.narrow=!1;this.ready=!1;this.compact=!1;this.filtersOpen=!1;this.busy=!1;this.selecting=!1;this.selectionId=0;this.error="";this.notice="";this.filters={status:"all",area:"all"};this.search="";this.selected=[];this.drafts={};this.reviewing=null;this.alive=!1;this.request=0;this.started=!1}get isNarrow(){return this.narrow||this.compact}connectedCallback(){super.connectedCallback(),this.alive=!0,this.resize=new ResizeObserver(t=>{this.compact=t[0].contentRect.width<700}),this.resize.observe(this)}disconnectedCallback(){super.disconnectedCallback(),this.alive=!1,this.request++,this.selectionId++,this.started=!1,this.resize?.disconnect()}updated(t){t.has("hass")&&this.hass&&this.alive&&!this.loading&&(!this.started||this.lastConnection!==this.hass.connection)&&(this.started=!0,this.lastConnection=this.hass.connection,this.loading=this.start().finally(()=>{this.loading=void 0}))}async start(){this.busy=!0;try{await we(this),this.ready=!0,await this.load()}catch(t){this.error=this.message(t)}finally{this.busy=!1}}message(t){let s=t;return je[s?.code||""]||s?.message||"The operation could not finish. Please retry."}async load(){if(!this.hass)return;let t=++this.request,s=await this.hass.callWS({type:"energy_scout/list"});!this.alive||t!==this.request||(this.payload=s)}async rescan(){this.busy=!0,this.error="";try{await this.load()}catch(t){this.error=this.message(t)}finally{this.busy=!1}}get table(){return this.renderRoot.querySelector("ha-data-table")}draft(t){return this.drafts[t.source.key]||{entity_id:t.source.entity_id,name:t.source.name,power:t.suggested_power||"",upstream:""}}get chosen(){return(this.payload?.candidates||[]).filter(t=>this.selected.includes(t.source.key))}get visible(){let t=this.search.trim().toLowerCase();return(this.payload?.candidates||[]).filter(s=>{let i=this.filters.status;return(this.filters.area==="all"||s.source.area===this.filters.area)&&(i==="all"||i===s.status||i==="recommended"&&s.recommended||i==="choice"&&s.status==="ready"&&!s.recommended)&&(!t||`${s.source.name} ${s.source.entity_id} ${s.source.area} ${s.suggested_power||""}`.toLowerCase().includes(t))})}rows(t){return t.map(s=>{let i=this.payload?.devices.find(r=>r.stat_consumption===s.source.entity_id);return{id:s.source.key,item:s,name:i?.name||this.draft(s).name||s.source.name,area:s.source.area,energy:s.source.entity_id,power:i?.stat_rate||this.draft(s).power,upstream:i?.included_in_stat||this.draft(s).upstream,status:s.recommended?"Recommended":s.status==="ready"?"Review choice":Ae[s.status],recommended:s.recommended,selectable:!this.busy&&(s.status!=="tracked"||!!this.payload?.added[s.source.key])}})}selectionChanged(t){if(t.detail.value.length===this.selected.length&&t.detail.value.every((i,r)=>i===this.selected[r]))return;this.selected=t.detail.value;let s={...this.drafts};for(let i of this.chosen)s[i.source.key]||(s[i.source.key]=this.draft(i));this.drafts=s}clear(){this.selectionId++,this.selecting=!1,this.table?.clearSelection(),this.selected=[]}async selectBatch(t){if(this.busy||this.selecting)return;let s=new Set(this.visible.filter(r=>t?r.recommended:r.status==="ready").map(r=>r.source.key));if(!s.size){this.clear();return}let i=++this.selectionId;this.selecting=!0,this.error="";try{await this.updateComplete;let r=performance.now()+2e3;for(;this.alive&&i===this.selectionId&&!this.busy;){if(this.table?.selectAll(n=>s.has(n.id)),this.selected.length===s.size&&this.selected.every(n=>s.has(n)))return;if(performance.now()>r)throw new Error("The device list changed. Review the current view and try selecting again.");await new Promise(n=>requestAnimationFrame(()=>n()))}}catch(r){this.error=this.message(r)}finally{i===this.selectionId&&(this.selecting=!1)}}updateFilters(t){this.clear(),this.filters={status:t.detail.value.status||"all",area:t.detail.value.area||"all"}}columns(t=!1){let s={name:{title:"Device / counter",sortable:!0,flex:1,main:!0,minWidth:this.isNarrow?"170px":"260px",template:i=>d`<div>${i.name}</div>
            <div
              style="font-size:11px;color:var(--secondary-text-color);overflow-wrap:anywhere;white-space:normal;line-height:15px"
            >
              ${i.energy}${this.isNarrow?d`<div>${t?`Power: ${i.power||"None"}`:`${i.item.source.value} ${i.item.source.unit||""} \xB7 ${i.area}`}</div>`:c}${this.isNarrow&&t?d`<div>Upstream: ${i.upstream||"None"}</div>`:c}
            </div>`},area:{title:"Room",sortable:!0,minWidth:"110px"},power:{title:"Power source",minWidth:"210px",template:i=>d`<span class="entity">${i.power||"Energy only"}</span>`},status:{title:t?"Upstream":"Status",sortable:!t,minWidth:"150px",template:i=>t?d`${i.upstream||"Independent device"}`:d`<span
                class="badge ${i.item.recommended?"recommended":i.item.status}"
                >${i.status}</span
              >`},edit:{title:t?"":"Mapping",showNarrow:!0,minWidth:"64px",template:i=>i.item.status==="ready"?d`<ha-button
                appearance="plain"
                size="small"
                .disabled=${this.busy||this.selecting}
                @click=${()=>this.openEditor(i.id)}
                >Edit</ha-button
              >`:c}};return this.isNarrow?{name:s.name,edit:s.edit}:s}openEditor(t){let s=this.payload?.candidates.find(i=>i.source.key===t);s&&(this.drafts[t]||(this.drafts={...this.drafts,[t]:this.draft(s)}),this.editing=t,this.updateComplete.then(()=>this.renderRoot.querySelector(".editor")?.scrollIntoView({block:"nearest"})))}editForm(){let t=this.payload?.candidates.find(r=>r.source.key===this.editing);if(!t)return c;let s=this.draft(t),i=[{name:"name",required:!0,selector:{text:{}}},{name:"power",selector:{select:{mode:"dropdown",options:[{value:"",label:"None \u2014 energy only"},...t.power_choices.map(r=>({value:r.entity_id,label:`${r.name} (${r.entity_id})`}))]}}},{name:"upstream",selector:{select:{mode:"dropdown",options:[{value:"",label:"None \u2014 independent device"},...(this.payload?.devices||[]).map(r=>({value:r.stat_consumption,label:r.name||r.stat_consumption}))]}}}];return d`<ha-card class="editor"
      ><div class="editor-heading">
        <h2>Edit ${t.source.name}</h2>
        <ha-button
          appearance="plain"
          @click=${()=>{this.editing=void 0}}
          >Done</ha-button
        >
      </div>
      <p class="entity">${t.source.entity_id}</p>
      <ha-form
        .hass=${this.hass}
        .data=${s}
        .schema=${i}
        .disabled=${this.busy||this.selecting}
        .computeLabel=${r=>({name:"Display name",power:"Power sensor",upstream:"Upstream device"})[r.name]}
        @value-changed=${r=>{this.drafts={...this.drafts,[t.source.key]:{...s,...r.detail.value}}}}
      ></ha-form>
      ${t.review_reason?d`<ha-alert alert-type="warning">${t.review_reason}</ha-alert>`:c}
      <p class="secondary">
        Edits stay in this review until you add the selected devices.
      </p></ha-card
    >`}async apply(){if(!(!this.hass||this.busy||!this.selected.length)){this.busy=!0,this.error="";try{let t;if(this.reviewing==="remove")t=await this.hass.callWS({type:"energy_scout/manage",action:"remove",keys:this.selected});else{let s=Object.fromEntries(this.chosen.map(i=>[i.source.key,this.draft(i)]));t=await this.hass.callWS({type:"energy_scout/apply",proposals:s})}this.notice=`${this.reviewing==="remove"?"Removed":"Added"} ${t.count} device${t.count===1?"":"s"}.`,this.clear(),this.reviewing=null,this.editing=void 0,this.drafts={},await this.load()}catch(t){this.error=this.message(t)}finally{this.busy=!1}}}async manage(t){if(!(!this.hass||this.busy||!this.selected.length)){this.busy=!0,this.error="";try{await this.hass.callWS({type:"energy_scout/manage",action:t,keys:this.selected}),this.notice=t==="ignore"?"Suggestions ignored.":"Suggestions restored.",this.clear(),await this.load()}catch(s){this.error=this.message(s)}finally{this.busy=!1}}}render(){let t=this.payload?.candidates||[],s=this.chosen,i=s.length>0&&s.every(o=>o.status==="ready"),r=s.length>0&&s.every(o=>!["tracked","ignored"].includes(o.status)),n=s.length>0&&s.every(o=>o.status==="ignored"),h=s.length>0&&s.every(o=>o.status==="tracked"&&this.payload?.added[o.source.key]),l=t.filter(o=>o.recommended).length;return d`<ha-top-app-bar-fixed
      ><ha-menu-button
        slot="navigationIcon"
        .hass=${this.hass}
        .narrow=${this.narrow}
      ></ha-menu-button>
      <div slot="title">Energy Scout</div>
      <ha-button slot="actionItems" appearance="plain" href="/energy"
        >Energy dashboard</ha-button
      >
      <main>
        <header>
          <div>
            <h1>
              ${this.reviewing==="add"?`Review ${s.length} additions`:this.reviewing==="remove"?`Remove ${s.length} entries`:"Your energy devices"}
            </h1>
            <p class="secondary">
              ${t.length} counters · ${l} recommended ·
              ${t.filter(o=>o.status==="tracked").length} already
              tracked
            </p>
          </div>
          <ha-button
            appearance="outlined"
            .disabled=${this.busy||this.selecting}
            @click=${()=>this.ready?this.rescan():this.start()}
            >${this.busy?"Scanning\u2026":"Rescan"}</ha-button
          >
        </header>
        ${this.error?d`<ha-alert alert-type="error">${this.error}</ha-alert>`:c}
        ${this.notice?d`<ha-alert alert-type="success">${this.notice} <a href="/energy">Open Energy dashboard</a></ha-alert>`:c}
        ${this.ready?d` ${this.reviewing?d`<ha-alert
                        alert-type=${this.reviewing==="remove"?"warning":"info"}
                        >${this.reviewing==="remove"?"Only unchanged entries added by Energy Scout will be removed. Sensors and history are kept.":"Check the selected counters measure appliance consumption. Review overlapping meters and upstream relationships before adding. No changes have been made yet."}</ha-alert
                      >`:d` <div class="filters">
                        <ha-input-search
                          aria-label="Search devices"
                          placeholder="Search devices, rooms, or entity IDs"
                          .value=${this.search}
                          @input=${o=>{this.clear(),this.search=o.target.value}}
                        ></ha-input-search>
                        <ha-button
                          class="filter-toggle"
                          appearance="plain"
                          @click=${()=>{this.filtersOpen=!this.filtersOpen}}
                          >${this.filtersOpen?"Hide filters":"Show filters"}</ha-button
                        >
                        <ha-form
                          ?hidden=${this.isNarrow&&!this.filtersOpen}
                          .hass=${this.hass}
                          .data=${this.filters}
                          .disabled=${this.busy||this.selecting}
                          .schema=${[{type:"grid",schema:[{name:"status",selector:{select:{mode:"dropdown",options:[{value:"all",label:"All statuses"},{value:"recommended",label:"Recommended"},{value:"choice",label:"Review choice"},...Object.entries(Ae).map(([o,m])=>({value:o,label:m}))]}}},{name:"area",selector:{select:{mode:"dropdown",options:[{value:"all",label:"All rooms"},...Array.from(new Set(t.map(o=>o.source.area))).sort().map(o=>({value:o,label:o}))]}}}]}]}
                          .computeLabel=${o=>o.name==="area"?"Room":"Status"}
                          @value-changed=${this.updateFilters}
                        ></ha-form>
                      </div>`}
                <div class="toolbar">
                  ${this.reviewing?d`<ha-button
                          appearance="outlined"
                          .disabled=${this.busy||this.selecting}
                          @click=${()=>{this.reviewing=null}}
                          >Back to devices</ha-button
                        ><span>${s.length} selected</span>
                        <ha-button
                          appearance="accent"
                          .disabled=${this.busy||!s.length}
                          @click=${this.apply}
                          >${this.busy?"Applying\u2026":this.reviewing==="remove"?"Remove entries":`Add ${s.length} devices`}</ha-button
                        >`:d` <ha-button
                          appearance="outlined"
                          .disabled=${this.busy||this.selecting}
                          @click=${()=>this.selectBatch(!0)}
                          >Select recommended</ha-button
                        >
                        <ha-button
                          class="select-ready"
                          appearance="plain"
                          .disabled=${this.busy||this.selecting}
                          @click=${()=>this.selectBatch(!1)}
                          >Select all ready</ha-button
                        >
                        <ha-button
                          appearance="plain"
                          .disabled=${this.busy||!this.selected.length}
                          @click=${this.clear}
                          >Clear</ha-button
                        >
                        <span aria-live="polite"
                          >${this.selecting?"Selecting\u2026":`${this.selected.length} selected`}</span
                        >
                        ${n?d`<ha-button .disabled=${this.busy||this.selecting} @click=${()=>this.manage("restore")}>Restore selected</ha-button>`:c}
                        ${r?d`<ha-button appearance="plain" .disabled=${this.busy||this.selecting} @click=${()=>this.manage("ignore")}>Ignore selected</ha-button>`:c}
                        ${h?d`<ha-button
                      .disabled=${this.busy||this.selecting}
                      @click=${()=>{this.reviewing="remove"}}
                      >Review removal</ha-button
                    >`:d`<ha-button
                      appearance="accent"
                      .disabled=${this.busy||this.selecting||!i}
                      @click=${()=>{this.reviewing="add",this.notice=""}}
                      >Review additions</ha-button
                    >`}`}
                </div>
                ${this.editForm()}
                <ha-data-table
                  class=${this.reviewing?"review":""}
                  .hass=${this.hass}
                  .narrow=${this.isNarrow}
                  .id=${"id"}
                  .columns=${this.columns(!!this.reviewing)}
                  .data=${this.rows(this.reviewing?s:this.visible)}
                  .selectable=${!this.reviewing}
                  .loading=${this.busy&&!this.payload}
                  .noDataText=${this.search?"No matching devices":"No counters in this view"}
                  @selection-changed=${this.selectionChanged}
                ></ha-data-table>
                ${this.reviewing?c:d`<details>
                      <summary>
                        About recommendations and sensors needing attention
                      </summary>
                      <p>
                        Recommendations choose one counter per channel and
                        prefer a lifetime total. They do not determine physical
                        meter relationships. An existing tracked sibling,
                        ambiguous total, or whole-house/production name requires
                        manual review.
                      </p>
                      ${this.visible.filter(o=>o.review_reason||o.status==="needs_attention"||o.status==="power_only").map(o=>d`<p><strong>${o.source.name}</strong>: ${o.review_reason||o.reasons.join("; ")}</p>`)}
                    </details>`}`:d`<p role="status">
                  ${this.busy?"Loading Home Assistant controls\u2026":"The page is unavailable."}
                </p>
                <a href="/config/integrations/integration/energy_scout"
                  >Open integration options</a
                >`}
      </main></ha-top-app-bar-fixed
    >`}};u.styles=V`
    :host {
      display: block;
      height: 100%;
      color: var(--primary-text-color);
      background: var(--primary-background-color);
      font-family: var(--ha-font-family-body, Roboto, sans-serif);
    }
    header > div {
      flex: 1;
      min-width: 180px;
    }
    .filter-toggle {
      display: none;
    }
    [hidden] {
      display: none !important;
    }
    main {
      padding: 20px 24px 40px;
      max-width: 1600px;
      margin: auto;
    }
    header,
    .toolbar,
    .editor-heading {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    header {
      justify-content: space-between;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 24px;
      font-weight: 500;
      margin: 0 0 8px;
    }
    h2 {
      font-size: 18px;
      margin: 0;
    }
    .secondary {
      color: var(--secondary-text-color);
      font-size: 13px;
      margin: 4px 0;
    }
    .name {
      font-weight: 500;
    }
    .entity {
      font-size: 12px;
      overflow-wrap: anywhere;
    }
    .filters {
      display: grid;
      grid-template-columns: minmax(200px, 1fr) minmax(300px, 1fr);
      gap: 16px;
      align-items: center;
      margin: 16px 0;
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 2;
      background: var(--primary-background-color);
      padding: 12px 0;
      min-height: 44px;
    }
    .toolbar > span {
      margin-inline-start: auto;
    }
    ha-data-table {
      display: block;
      height: calc(100vh - 350px);
      min-height: 320px;
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
      overflow: hidden;
      --data-table-row-height: 66px;
    }
    ha-alert {
      display: block;
      margin: 12px 0;
    }
    .badge {
      padding: 4px 8px;
      border-radius: 6px;
      background: var(--secondary-background-color);
      font-size: 12px;
    }
    .recommended {
      color: var(--primary-color);
    }
    .needs_attention {
      color: var(--warning-color, #ef9f00);
    }
    .editor {
      padding: 20px;
      margin-top: 16px;
    }
    .editor-heading {
      justify-content: space-between;
    }
    .editor ha-form {
      margin-top: 12px;
    }
    details {
      padding: 16px 0;
      font-size: 14px;
      line-height: 1.6;
    }
    summary {
      cursor: pointer;
      color: var(--secondary-text-color);
    }
    a {
      color: var(--primary-color);
    }
    @media (max-width: 700px) {
      main {
        padding: 16px 12px;
      }
      .filters {
        grid-template-columns: 1fr;
        gap: 8px;
      }
      .filter-toggle {
        display: inline-flex;
        justify-self: start;
      }
      .select-ready {
        display: none;
      }
      .toolbar {
        gap: 8px;
      }
      .toolbar > span {
        margin-inline-start: 0;
      }
      ha-data-table {
        height: calc(100vh - 430px);
        --data-table-row-height: 84px;
      }
      ha-data-table.review {
        --data-table-row-height: 128px;
      }
      h1 {
        font-size: 21px;
      }
    }
  `,g([M({attribute:!1})],u.prototype,"hass",2),g([M({type:Boolean})],u.prototype,"narrow",2),g([f()],u.prototype,"payload",2),g([f()],u.prototype,"ready",2),g([f()],u.prototype,"compact",2),g([f()],u.prototype,"filtersOpen",2),g([f()],u.prototype,"busy",2),g([f()],u.prototype,"selecting",2),g([f()],u.prototype,"error",2),g([f()],u.prototype,"notice",2),g([f()],u.prototype,"filters",2),g([f()],u.prototype,"search",2),g([f()],u.prototype,"selected",2),g([f()],u.prototype,"drafts",2),g([f()],u.prototype,"editing",2),g([f()],u.prototype,"reviewing",2),u=g([be("energy-scout-panel")],u);export{u as EnergyScoutPanel};
/*! Bundled license information:

@lit/reactive-element/css-tag.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/reactive-element.js:
lit-html/lit-html.js:
lit-element/lit-element.js:
@lit/reactive-element/decorators/custom-element.js:
@lit/reactive-element/decorators/property.js:
@lit/reactive-element/decorators/state.js:
@lit/reactive-element/decorators/event-options.js:
@lit/reactive-element/decorators/base.js:
@lit/reactive-element/decorators/query.js:
@lit/reactive-element/decorators/query-all.js:
@lit/reactive-element/decorators/query-async.js:
@lit/reactive-element/decorators/query-assigned-nodes.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/is-server.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/decorators/query-assigned-elements.js:
  (**
   * @license
   * Copyright 2021 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
