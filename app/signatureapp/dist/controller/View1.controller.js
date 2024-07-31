sap.ui.define(["sap/ui/core/mvc/Controller","sap/ui/model/json/JSONModel","sap/ui/core/Item","sap/m/MessageToast","sap/ui/core/ws/WebSocket"],function(e,t,o,a,n){"use strict";return e.extend("com.kpo.signatureapp.controller.View1",{onInit:function(){var e=this.byId("downloadButton");if(e){e.attachPress(this.onDownloadSelectedFiles.bind(this))}this._setBaseUrl()},_setBaseUrl:function(){var e;if(window.location.hostname==="localhost"||window.location.hostname==="port4004-workspaces-ws-nvvxp.us10.trial.applicationstudio.cloud.sap"){e="https://port4004-workspaces-ws-nvvxp.us10.trial.applicationstudio.cloud.sap"}else{e="https://ea036260trial.launchpad.cfapps.us10.hana.ondemand.com/b866c22b-35af-478a-85ee-05f8a1d64c9f.esignature.comkposignatureapp-0.0.1"}this._baseUrl=e},onAfterItemAdded:function(e){var t=e.getParameter("item");this._createEntity(t).then(e=>{this._uploadContent(t,e)}).catch(e=>{console.log(e)})},onUploadCompleted:function(e){var t=this.byId("uploadSet");t.removeAllIncompleteItems();t.getBinding("items").refresh()},onRemovePressed:function(e){e.preventDefault();e.getParameter("item").getBindingContext().delete();a.show("Selected file has been deleted")},onOpenPressed:function(e){e.preventDefault();var t=e.getSource();this._fileName=t.getFileName();var o=this;this._download(t).then(e=>{var t=window.URL.createObjectURL(e);var a=document.createElement("a");a.href=t;a.setAttribute("download",o._fileName);document.body.appendChild(a);a.click();document.body.removeChild(a)}).catch(e=>{console.log(e)})},_download:function(e){var t={url:this._baseUrl+e.getUrl(),method:"GET",headers:{"Content-type":"application/octet-stream"},xhrFields:{responseType:"blob"}};return new Promise((e,o)=>{$.ajax(t).done(t=>{e(t)}).fail(e=>{o(e)})})},_createEntity:function(e){var t={mediaType:e.getMediaType(),fileName:e.getFileName(),size:e.getFileObject().size};var o={url:this._baseUrl+"/odata/v4/catalog/Files",method:"POST",headers:{"Content-type":"application/json"},data:JSON.stringify(t)};return new Promise((e,t)=>{$.ajax(o).done((t,o,a)=>{e(t.ID)}).fail(e=>{t(e)})})},_uploadContent:function(e,t){var o=`${this._baseUrl}/odata/v4/catalog/Files(${t})/content`;e.setUploadUrl(o);var a=this.byId("uploadSet");a.setHttpRequestMethod("PUT");a.uploadItem(e)},onDownloadSelectedFiles:function(){var e=this.byId("uploadSet");var t=e.getSelectedItems();if(t.length===0){a.show("No items selected for download");return}var o=this;t.forEach(function(e){o._fileName=e.getFileName();o._download(e).then(e=>{var t=new FileReader;t.onloadend=function(){var e=t.result;let n=e.split(",")[1];debugger;o.request(n,o);console.log(n);a.show("File downloaded and converted to Base64")};t.readAsDataURL(e)}).catch(e=>{console.log(e);a.show("Error downloading file: "+e.message)})})},formatThumbnailUrl:function(e){var t;switch(e){case"image/png":t="sap-icon://card";break;case"text/plain":t="sap-icon://document-text";break;case"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":t="sap-icon://excel-attachment";break;case"application/vnd.openxmlformats-officedocument.wordprocessingml.document":t="sap-icon://doc-attachment";break;case"application/pdf":t="sap-icon://pdf-attachment";break;default:t="sap-icon://attachment"}return t},_doSignature:function(e){},connect:function(){var e="wss://127.0.0.1:13579/";var t=null;return new Promise(function(t,o){let a=new n(e);a.onopen=function(){console.log("socket connection is opened [state = "+a.readyState+"]: "+a.url);t(a)};a.onerror=function(e){console.error("socket connection error : ",e);o(e)};a.onclose=function(e){debugger;if(e.wasClean){console.error("socket connection is closed ")}else{console.log("Connection error");openDialog()}console.log("Code: "+e.code+" Reason: "+e.reason)}})},request:async function(e,t){this.getView().setBusy(true);var o;var a=e;var n=true;var s;var r;var i="1.3.6.1.5.5.7.3.2";var l;var c;var d;var u;var p;var m;var f={module:"kz.gov.pki.knca.basics",method:"sign",args:{allowedStorages:["PKCS12","AKKaztokenStore","AKKZIDCardStore"],format:"cms",data:a,signingParams:{decode:n},signerParams:{extKeyUsageOids:[i],chain:[]},locale:"en"}};return t.connect().then(e=>{e.send(JSON.stringify(f));return new Promise((t,o)=>{e.onmessage=({data:e})=>{response=JSON.parse(e);debugger;if(response!=null){var o=response["status"];if(o===true){var a=response["body"];if(a!=null){if(a.hasOwnProperty("result")){var n=a.result;$("#signature").val(n)}}}else if(o===false){var s=response["code"];alert(s)}}t(response)}})}).catch(function(e){console.log(e)})}})});
//# sourceMappingURL=View1.controller.js.map