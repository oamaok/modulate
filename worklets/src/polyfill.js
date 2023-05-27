var e=String.fromCharCode,r={}.toString,a=void 0,t=r(),c=Uint8Array,n=c||Array,i=c?ArrayBuffer:n,f=i.isView||function(e){return e&&"length"in e},o=r.call(i.prototype),s=encodeURIComponent,u=parseInt,l=TextEncoder.prototype,d=/[\xc0-\xff][\x80-\xbf]+|[\x80-\xff]/g,h=/[\x80-\uD7ff\uDC00-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]?/g,g=new(c?Uint16Array:n)(32);function TextDecoder(){}function p(r){var a=0|r.charCodeAt(0);if(55296<=a)if(a<=56319){var t=0|r.charCodeAt(1);if(56320<=t&&t<=57343){if((a=(a<<10)+t-56613888|0)>65535)return e(240|a>>18,128|a>>12&63,128|a>>6&63,128|63&a)}else a=65533}else a<=57343&&(a=65533);return a<=2047?e(192|a>>6,128|63&a):e(224|a>>12,128|a>>6&63,128|63&a)}function TextEncoder(){}function v(e,r){var a=void 0===e?"":(""+e).replace(h,p),t=0|a.length,c=0,n=0,i=0,f=0|r.length,o=0|e.length;f<t&&(t=f);e:for(;c<t;c=c+1|0){switch((n=0|a.charCodeAt(c))>>4){case 0:case 1:case 2:case 3:case 4:case 5:case 6:case 7:i=i+1|0;case 8:case 9:case 10:case 11:break;case 12:case 13:if((c+1|0)<f){i=i+1|0;break}case 14:if((c+2|0)<f){i=i+1|0;break}case 15:if((c+3|0)<f){i=i+1|0;break}default:break e}r[c]=n}return{written:c,read:o<i?o:i}}TextDecoder.prototype.decode=function(i){var s,u=i;if(!f(u)){if((s=r.call(u))!==o&&s!==a&&s!==t)throw TypeError("Failed to execute 'decode' on 'TextDecoder': The provided value is not of type '(ArrayBuffer or ArrayBufferView)'");u=c?new n(u):u||[]}for(var l="",d="",h=0,p=0|u.length,v=p-32|0,y=0,A=0,w=0,C=0,F=0,b=0,x=-1;h<p;){for(y=h<=v?32:p-h|0;b<y;h=h+1|0,b=b+1|0){switch((A=255&u[h])>>4){case 15:if((F=255&u[h=h+1|0])>>6!=2||247<A){h=h-1|0;break}w=(7&A)<<6|63&F,C=5,A=256;case 14:w<<=6,w|=(15&A)<<6|63&(F=255&u[h=h+1|0]),C=F>>6==2?C+4|0:24,A=A+256&768;case 13:case 12:w<<=6,w|=(31&A)<<6|63&(F=255&u[h=h+1|0]),C=C+7|0,h<p&&F>>6==2&&w>>C&&w<1114112?(A=w,0<=(w=w-65536|0)?(x=55296+(w>>10)|0,A=56320+(1023&w)|0,b<31?(g[b]=x,b=b+1|0,x=-1):(F=x,x=A,A=F)):y=y+1|0):(h=h-(A>>=8)-1|0,A=65533),C=0,w=0,y=h<=v?32:p-h|0;default:g[b]=A;continue;case 11:case 10:case 9:case 8:}g[b]=65533}if(d+=e(g[0],g[1],g[2],g[3],g[4],g[5],g[6],g[7],g[8],g[9],g[10],g[11],g[12],g[13],g[14],g[15],g[16],g[17],g[18],g[19],g[20],g[21],g[22],g[23],g[24],g[25],g[26],g[27],g[28],g[29],g[30],g[31]),b<32&&(d=d.slice(0,b-32|0)),h<p){if(g[0]=x,b=~x>>>31,x=-1,d.length<l.length)continue}else-1!==x&&(d+=e(x));l+=d,d=""}return l},l.encode=function(e){var r,a=void 0===e?"":""+e,t=0|a.length,i=new n(8+(t<<1)|0),f=0,o=0,s=0,u=0,l=!c;for(f=0;f<t;f=f+1|0,o=o+1|0)if((s=0|a.charCodeAt(f))<=127)i[o]=s;else if(s<=2047)i[o]=192|s>>6,i[o=o+1|0]=128|63&s;else{e:{if(55296<=s)if(s<=56319){if(56320<=(u=0|a.charCodeAt(f=f+1|0))&&u<=57343){if((s=(s<<10)+u-56613888|0)>65535){i[o]=240|s>>18,i[o=o+1|0]=128|s>>12&63,i[o=o+1|0]=128|s>>6&63,i[o=o+1|0]=128|63&s;continue}break e}s=65533}else s<=57343&&(s=65533);!l&&f<<1<o&&f<<1<(o-7|0)&&(l=!0,(r=new n(3*t)).set(i),i=r)}i[o]=224|s>>12,i[o=o+1|0]=128|s>>6&63,i[o=o+1|0]=128|63&s}return c?i.subarray(0,o):i.slice(0,o)};