sap.ui.define(["sap/ui/core/mvc/Controller","sap/ui/model/json/JSONModel","sap/ui/core/Item","sap/m/MessageToast","sap/ui/core/ws/WebSocket"],function(e,t,o,n,a){"use strict";return e.extend("com.kpo.signatureapp.controller.View1",{onInit:function(){var e=this.byId("downloadButton");if(e){e.attachPress(this.onDownloadSelectedFiles.bind(this))}this._setBaseUrl()},_setBaseUrl:function(){var e;if(window.location.hostname==="localhost"||window.location.hostname==="port4004-workspaces-ws-nvvxp.us10.trial.applicationstudio.cloud.sap"){e="https://port4004-workspaces-ws-nvvxp.us10.trial.applicationstudio.cloud.sap"}else{e="https://ea036260trial.launchpad.cfapps.us10.hana.ondemand.com/b866c22b-35af-478a-85ee-05f8a1d64c9f.esignature.comkposignatureapp-0.0.1"}this._baseUrl=e},onAfterItemAdded:function(e){var t=e.getParameter("item");this._createEntity(t).then(e=>{this._uploadContent(t,e)}).catch(e=>{console.log(e)})},onUploadCompleted:function(e){var t=this.byId("uploadSet");t.removeAllIncompleteItems();t.getBinding("items").refresh()},onRemovePressed:function(e){e.preventDefault();e.getParameter("item").getBindingContext().delete();n.show("Selected file has been deleted")},onOpenPressed:function(e){e.preventDefault();var t=e.getSource();this._fileName=t.getFileName();var o=this;this._download(t).then(e=>{var t=window.URL.createObjectURL(e);var n=document.createElement("a");n.href=t;n.setAttribute("download",o._fileName);document.body.appendChild(n);n.click();document.body.removeChild(n)}).catch(e=>{console.log(e)})},_download:function(e){var t={url:e.getUrl(),method:"GET",headers:{"Content-type":"application/octet-stream"},xhrFields:{responseType:"blob"}};return new Promise((e,o)=>{$.ajax(t).done(t=>{e(t)}).fail(e=>{o(e)})})},_createEntity:function(e){var t={mediaType:e.getMediaType(),fileName:e.getFileName(),size:e.getFileObject().size,signFileMetadata:e};var o={url:this._baseUrl+"/odata/v4/catalog/Files",method:"POST",headers:{"Content-type":"application/json"},data:JSON.stringify(t)};return new Promise((e,t)=>{$.ajax(o).done((t,o,n)=>{e(t.ID)}).fail(e=>{t(e)})})},getSignData:function(){debugger;let e=this.cmsString;if(e==null){n.show("Please select the file and sign it first before Validation");return}e=e.replace(/-----BEGIN CMS-----|-----END CMS-----|\s/g,"");try{const t=atob(e);const o=new Uint8Array(t.length);for(let e=0;e<t.length;e++){o[e]=t.charCodeAt(e)}const n=this.arrayBufferToBase64(o);const a=this.getOwnerComponent().getModel();const r=a.bindContext("/getSignData(...)");r.setParameter("sign",n);r.execute().then(function(e){debugger;var t=r.getBoundContext();var o=t.getObject().value}).catch(function(e){console.error("Error executing OData action:",e)})}catch(e){console.error("Error processing CMS data:",e)}},arrayBufferToBase64:function(e){var t="";var o=new Uint8Array(e);var n=o.byteLength;for(var a=0;a<n;a++){t+=String.fromCharCode(o[a])}return window.btoa(t)},_uploadContent:function(e,t){var o=this._baseUrl+`/odata/v4/catalog/Files(${t})/content`;e.setUploadUrl(o);var n=this.byId("uploadSet");n.setHttpRequestMethod("PUT");n.uploadItem(e)},onDownloadSelectedFiles:function(){var e=this.byId("uploadSet");var t=e.getSelectedItems();if(t.length===0){n.show("No items selected for E-Signature");return}var o=this;t.forEach(function(e){o._fileName=e.getFileName();o._download(e).then(e=>{var t=new FileReader;t.onloadend=function(){var e=t.result;let a=e.split(",")[1];debugger;o.request(a,o);console.log(a);n.show("File downloaded and converted to Base64")};t.readAsDataURL(e)}).catch(e=>{console.log(e);n.show("Error downloading file: "+e.message)})})},formatThumbnailUrl:function(e){var t;switch(e){case"image/png":t="sap-icon://card";break;case"text/plain":t="sap-icon://document-text";break;case"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":t="sap-icon://excel-attachment";break;case"application/vnd.openxmlformats-officedocument.wordprocessingml.document":t="sap-icon://doc-attachment";break;case"application/pdf":t="sap-icon://pdf-attachment";break;default:t="sap-icon://attachment"}return t},_doSignature:function(e){},connect:function(){var e="wss://127.0.0.1:13579/";var t=null;return new Promise(function(t,o){let n=new a(e);n.attachOpen(function(e){debugger;console.log("socket connection is opened  ");t(n)});n.attachError(function(e){console.error("socket connection error : ",e);o(e)});n.attachClose(function(e){debugger;if(e.wasClean){console.error("socket connection is closed ")}else{console.log("Connection error");openDialog()}console.log("Code: "+e.code+" Reason: "+e.reason)})})},request:async function(e,t){var o;var a=e;var r=true;var s;var c;var i="1.3.6.1.5.5.7.3.2";var l;var d;var u;var f;var g;var h;var p={module:"kz.gov.pki.knca.basics",method:"sign",args:{allowedStorages:["PKCS12","AKKaztokenStore","AKKZIDCardStore"],format:"cms",data:a,signingParams:{decode:r},signerParams:{extKeyUsageOids:[i],chain:[]},locale:"en"}};return t.connect().then(e=>{e.send(JSON.stringify(p));return new Promise((o,a)=>{e.attachMessage(function(e){let a=JSON.parse(e.mParameters.data);debugger;if(a!=null){var r=a["status"];if(r===true){var s=a["body"];if(s!=null){if(s.hasOwnProperty("result")){var c=s.result;t.cmsString=c;n.show("The file is signed successfully");$("#signature").val(c)}}}else if(r===false){var i=a["code"];alert(i)}}o(a)})})}).catch(function(e){console.log(e)})},onSendCMS:function(){debugger;let e=this.cmsString;if(e==null){n.show("Please select the file and sign it first before Validation");return}e=e.replace(/-----BEGIN CMS-----|-----END CMS-----|\s/g,"");const t=atob(e);const o=new Uint8Array(t.length);for(let e=0;e<t.length;e++){o[e]=t.charCodeAt(e)}try{debugger;const e=this.arrayBufferToBase64(o);console.log(e);const t=atob(e);const n=new Uint8Array(t.length);for(let e=0;e<t.length;e++){n[e]=t.charCodeAt(e)}const a=new Blob([n],{type:"application/pdf"});console.log(a);const r=document.createElement("a");r.href=URL.createObjectURL(a);r.download="document.pdf";document.body.appendChild(r);r.click();document.body.removeChild(r)}catch(e){console.error("Error processing CMS data:",e);alert("Failed to process CMS data.")}},arrayBufferToBase64:function(e){let t="";const o=new Uint8Array(e);const n=o.byteLength;for(let e=0;e<n;e++){t+=String.fromCharCode(o[e])}return window.btoa(t)},onSendCMS2:async function(){let e=this.cmsString;if(e==null){n.show("Please select the file and sign it first before Validation");return}e=e.replace(/-----BEGIN CMS-----|-----END CMS-----|\s/g,"");try{const t=atob(e);const o=new Uint8Array(t.length);for(let e=0;e<t.length;e++){o[e]=t.charCodeAt(e)}const n=this.arrayBufferToBase64(o);const a=this.getOwnerComponent().getModel();const r=a.bindContext("/mergePDF(...)");r.setParameter("cmsData",n);r.execute().then(function(e){debugger;var t=r.getBoundContext();var o=t.getObject().value;const n=atob(o);const a=new Uint8Array(n.length);for(let e=0;e<n.length;e++){a[e]=n.charCodeAt(e)}const s=new Blob([a],{type:"application/pdf"});const c=document.createElement("a");c.href=URL.createObjectURL(s);c.download="Signed.pdf";document.body.appendChild(c);c.click();document.body.removeChild(c)}).catch(function(e){console.error("Error executing action:",e);alert("Failed to merge PDF.")})}catch(e){console.error("Error processing CMS data:",e);alert("Failed to process CMS data.")}},arrayBufferToBase64:function(e){let t="";const o=new Uint8Array(e);const n=o.byteLength;for(let e=0;e<n;e++){t+=String.fromCharCode(o[e])}return window.btoa(t)}})});
//# sourceMappingURL=View1.controller.js.map