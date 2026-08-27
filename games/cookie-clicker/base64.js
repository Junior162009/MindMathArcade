/** Base64 encode / decode */
var Base64={
_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
encode:function(input){var output="",chr1,chr2,chr3,enc1,enc2,enc3,enc4,i=0;input=Base64._utf8_encode(input);while(i<input.length){chr1=input.charCodeAt(i++);chr2=input.charCodeAt(i++);chr3=input.charCodeAt(i++);enc1=chr1>>2;enc2=((chr1&3)<<4)|(chr2>>4);enc3=((chr2&15)<<2)|(chr3>>6);enc4=chr3&63;if(isNaN(chr2))enc3=enc4=64;else if(isNaN(chr3))enc4=64;output+=this._keyStr.charAt(enc1)+this._keyStr.charAt(enc2)+this._keyStr.charAt(enc3)+this._keyStr.charAt(enc4);}return output;},
decode:function(input){var output="",chr1,chr2,chr3,enc1,enc2,enc3,enc4,i=0;input=input.replace(/[^A-Za-z0-9\+\/\=]/g,"");while(i<input.length){enc1=this._keyStr.indexOf(input.charAt(i++));enc2=this._keyStr.indexOf(input.charAt(i++));enc3=this._keyStr.indexOf(input.charAt(i++));enc4=this._keyStr.indexOf(input.charAt(i++));chr1=(enc1<<2)|(enc2>>4);chr2=((enc2&15)<<4)|(enc3>>2);chr3=((enc3&3)<<6)|enc4;output+=String.fromCharCode(chr1);if(enc3!=64)output+=String.fromCharCode(chr2);if(enc4!=64)output+=String.fromCharCode(chr3);}return Base64._utf8_decode(output);},
_utf8_encode:function(string){string=string.replace(/\r\n/g,"\n");var utftext="";for(var n=0;n<string.length;n++){var c=string.charCodeAt(n);if(c<128)utftext+=String.fromCharCode(c);else if(c>127&&c<2048){utftext+=String.fromCharCode((c>>6)|192);utftext+=String.fromCharCode((c&63)|128);}else{utftext+=String.fromCharCode((c>>12)|224);utftext+=String.fromCharCode(((c>>6)&63)|128);utftext+=String.fromCharCode((c&63)|128);}}return utftext;},
_utf8_decode:function(utftext){var string="",i=0,c=0,c2=0;while(i<utftext.length){c=utftext.charCodeAt(i);if(c<128){string+=String.fromCharCode(c);i++;}else if(c>191&&c<224){c2=utftext.charCodeAt(i+1);string+=String.fromCharCode(((c&31)<<6)|(c2&63));i+=2;}else{c2=utftext.charCodeAt(i+1);var c3=utftext.charCodeAt(i+2);string+=String.fromCharCode(((c&15)<<12)|((c2&63)<<6)|(c3&63));i+=3;}}return string;}
};

/* TecnoMath Firebase integration.
   IMPORTANT: Cookie Clicker must never wait for Firebase. Some browsers,
   privacy extensions, or blocked third-party requests can delay external
   scripts. The game therefore starts normally and Firebase sync initializes
   independently in the background. */
(function(){
 if(window.__TecnomathCookieFirebaseBridge)return;
 window.__TecnomathCookieFirebaseBridge=true;

 function load(src,onload){
  var s=document.createElement('script');
  s.src=src;
  s.async=true;
  if(onload)s.onload=onload;
  s.onerror=function(){console.warn('[TecnoMath] Optional Firebase script failed:',src);};
  document.head.appendChild(s);
 }
 function start(){
  if(window.TecnomathFirebase)return;
  if(window.firebase){
   load('../../js/firebase-config.js');
   return;
  }
  load('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',function(){
   load('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js',function(){
    load('https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js',function(){
     load('../../js/firebase-config.js');
    });
   });
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();
