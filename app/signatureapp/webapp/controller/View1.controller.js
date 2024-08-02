sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Item",
    "sap/m/MessageToast",
    "sap/ui/core/ws/WebSocket"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, Item, MessageToast, WebSocket) {
        "use strict";

        return Controller.extend("com.kpo.signatureapp.controller.View1", {
            onInit: function () {
                var oDownloadButton = this.byId("downloadButton");
                if (oDownloadButton) {
                    oDownloadButton.attachPress(this.onDownloadSelectedFiles.bind(this));
                }


                // Set base URL
               this._setBaseUrl();
            },

            _setBaseUrl: function () {
                // Determine if the app is running locally or deployed
                var sBaseUrl;
                if (window.location.hostname === "localhost" || window.location.hostname === "port4004-workspaces-ws-nvvxp.us10.trial.applicationstudio.cloud.sap") {
                    sBaseUrl = "https://port4004-workspaces-ws-nvvxp.us10.trial.applicationstudio.cloud.sap"; // Change this to your local base URL
                } 
                this._baseUrl = sBaseUrl;
            },

            onAfterItemAdded: function (oEvent) {
                var item = oEvent.getParameter("item");
                this._createEntity(item)
                    .then((id) => {
                        this._uploadContent(item, id);
                    })
                    .catch((err) => {
                        console.log(err);
                    });
            },

            onUploadCompleted: function (oEvent) {
                var oUploadSet = this.byId("uploadSet");
                oUploadSet.removeAllIncompleteItems();
                oUploadSet.getBinding("items").refresh();
            },

            onRemovePressed: function (oEvent) {
                oEvent.preventDefault();
                oEvent.getParameter("item").getBindingContext().delete();
                MessageToast.show("Selected file has been deleted");
            },

            onOpenPressed: function (oEvent) {
                oEvent.preventDefault();
                var item = oEvent.getSource();
                this._fileName = item.getFileName();
                var that = this;
                this._download(item)
                    .then((blob) => {
                        var url = window.URL.createObjectURL(blob);
                        var link = document.createElement('a');
                        link.href = url;
                        link.setAttribute('download', that._fileName);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    })
                    .catch((err) => {
                        console.log(err);
                    });
            },

            _download: function (item) {
                var settings = {
                    url: item.getUrl(),
                    method: "GET",
                    headers: {
                        "Content-type": "application/octet-stream"
                    },
                    xhrFields: {
                        responseType: 'blob'
                    }
                };

                return new Promise((resolve, reject) => {
                    $.ajax(settings)
                        .done((result) => {
                            resolve(result);
                        })
                        .fail((err) => {
                            reject(err);
                        });
                });
            },

            _createEntity: function (item) {
                var data = {
                    mediaType: item.getMediaType(),
                    fileName: item.getFileName(),
                    size: item.getFileObject().size
                };

                var settings = {
                    url: this._baseUrl +"/odata/v4/catalog/Files",
                    method: "POST",
                    headers: {
                        "Content-type": "application/json"
                    },
                    data: JSON.stringify(data)
                };

                return new Promise((resolve, reject) => {
                    $.ajax(settings)
                        .done((results, textStatus, request) => {
                            resolve(results.ID);
                        })
                        .fail((err) => {
                            reject(err);
                        });
                });
            },

            _uploadContent: function (item, id) {
                var url = this._baseUrl +`/odata/v4/catalog/Files(${id})/content`;
                item.setUploadUrl(url);
                var oUploadSet = this.byId("uploadSet");
                oUploadSet.setHttpRequestMethod("PUT");
                oUploadSet.uploadItem(item);
            },

            onDownloadSelectedFiles: function () {
                var oUploadSet = this.byId("uploadSet");
                var aSelectedItems = oUploadSet.getSelectedItems();

                if (aSelectedItems.length === 0) {
                    MessageToast.show("No items selected for download");
                    return;
                }

                var that = this;
                aSelectedItems.forEach(function (oSelectedItem) {

                    that._fileName = oSelectedItem.getFileName();
                    that._download(oSelectedItem)
                        .then((blob) => {

                            var reader = new FileReader();
                            reader.onloadend = function () {
                                var base64data = reader.result;
                                let file = base64data.split(',')[1]; // Remove the "data:application/octet-stream;base64," part
                                debugger
                                that.request(file, that)
                                console.log(file); // Now `File` contains the Base64 string
                                MessageToast.show("File downloaded and converted to Base64");
                            };
                            reader.readAsDataURL(blob);
                        })
                        .catch((err) => {
                            console.log(err);
                            MessageToast.show("Error downloading file: " + err.message);
                        });
                });
            },


            // formatters
            formatThumbnailUrl: function (mediaType) {
                var iconUrl;
                switch (mediaType) {
                    case "image/png":
                        iconUrl = "sap-icon://card";
                        break;
                    case "text/plain":
                        iconUrl = "sap-icon://document-text";
                        break;
                    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                        iconUrl = "sap-icon://excel-attachment";
                        break;
                    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                        iconUrl = "sap-icon://doc-attachment";
                        break;
                    case "application/pdf":
                        iconUrl = "sap-icon://pdf-attachment";
                        break;
                    default:
                        iconUrl = "sap-icon://attachment";
                }
                return iconUrl;
            },
            _doSignature: function (file) {


            },

            connect: function () {
                var SOCKET_URL = 'wss://127.0.0.1:13579/';
                var callback = null;

                return new Promise(function (resolve, reject) {
                    let webSocket = new WebSocket(SOCKET_URL);

                    webSocket.attachOpen(function (oEvent) {
                        debugger;
                        console.log("socket connection is opened  ");
                        resolve(webSocket);
                    });

                    webSocket.attachError(function (err) {
                        // unblockScreen();
                        console.error("socket connection error : ", err);
                        reject(err);
                    });

                    webSocket.attachClose(function (event) {
                        debugger
                        if (event.wasClean) {
                            console.error("socket connection is closed ");
                        } else {
                            console.log('Connection error');
                            openDialog();
                        }
                        console.log('Code: ' + event.code + ' Reason: ' + event.reason);
                    })
                });
            },

            request: async function (file, controller) {
                // blockScreen();





                var signatureType;

                var dataToSign = file;

                var decode = true;

                var encapsulate;

                var digested;

                var extKeyUsageOidString = "1.3.6.1.5.5.7.3.2";
                var extKeyUsageOids;

                var caCertsString;
                var caCerts;
                // if (document.getElementById("buildChain").checked) {
                //     caCerts = caCertsString ? caCertsString.split(",") : null;
                // } else {
                //     caCerts = null;
                //     // caCerts = []; // CertPathBuilder will not be invoked. Any certificate will be accepted.
                // }



                var iin;
                var bin;
                var serialNumber;

                var signInfo = {
                    "module": "kz.gov.pki.knca.basics",
                    "method": "sign",
                    "args": {
                        "allowedStorages": [
                            "PKCS12"
                            ,
                            "AKKaztokenStore"
                            ,
                            "AKKZIDCardStore"],//selectedStorages,
                        "format": "cms",
                        "data": dataToSign,
                        "signingParams": { decode },
                        "signerParams": {
                            "extKeyUsageOids": [extKeyUsageOidString],//extKeyUsageOids,
                            /*"iin": iin,
                            "bin": bin,
                            "serialNumber": serialNumber,*/
                            "chain": []//caCerts
                        },
                        "locale": "en"
                    }
                }





                return controller.connect().then((webSocket) => {


                    webSocket.send(JSON.stringify(signInfo))

                    return new Promise((resolve, reject) => {
                        webSocket.attachMessage(function (oEvent) {
                            let response = JSON.parse(oEvent.mParameters.data);
                            debugger
                            if (response != null) {
                                var responseStatus = response['status'];
                                if (responseStatus === true) {
                                    var responseBody = response['body'];
                                    if (responseBody != null) {
                                        // unblockScreen();
                                        if (responseBody.hasOwnProperty('result')) {
                                            var result = responseBody.result;
                                            controller.cmsString = result;
                                            $("#signature").val(result);
                                        }
                                    }
                                } else if (responseStatus === false) {
                                    // unblockScreen();
                                    var responseCode = response['code'];
                                    alert(responseCode);
                                }
                            }
                            resolve(response);
                        })
                    })
                })
                    .catch(function (err) {
                        // unblockScreen();
                        console.log(err)
                    });
            },
            // onSendCMS: function() {
            //     let oModel = this.getOwnerComponent().getModel();
            //     var oActionDataContext = oModel.bindContext("/doConvertCMSTOPDF(...)");
            //     oActionDataContext.setParameter(`cms`, this.cmsString);
            //     oActionDataContext.execute().then(function(oResponse) {
            //         const blob = new Blob([oResponse], { type: 'application/pdf' });
            //         const link = document.createElement('a');
            //         link.href = URL.createObjectURL(blob);
            //         link.download = 'signed_output.pdf';
            //         link.click();
            //         URL.revokeObjectURL(link.href);
            //         alert('Signed PDF downloaded successfully');
            //     }.bind(this)).catch(function(err) {
            //         console.log(err);
            //         alert('Error in merging CMS to PDF: ' + err.message);
            //     });
            // },
    
           
            onSendCMS:function(){
         
                const cmsData = "\r\nMIInNQYJKoZIhvcNAQcCoIInJjCCJyICAQExDjAMBggqgw4DCgEDAwUAMIIg5QYJ\r\nKoZIhvcNAQcBoIIg1gSCINIlUERGLTEuMwolxOXy5eun86DQxMYKMyAwIG9iago8\r\nPCAvRmlsdGVyIC9GbGF0ZURlY29kZSAvTGVuZ3RoIDIxOCA+PgpzdHJlYW0KeAFd\r\nj7Fqw0AMhnc/xT8mQ88n+84nQcgQJ0MKgRYOOpQOwbXbgO3Udpa+feU0pbRokH74\r\npPtuwCMGWC0v3mQMdmRYMNZ4Qo+0nAjVBLrWVCl3AzpdKH5CO4fkzhqyIuwdWgX/\r\nxHc0SB+wWiE9lPutnluvsdmW1+d9bhwLCXxhCskkg2M2uaWAkJMJNkjyT2g2tlCh\r\nQU/NI/0uh+ANO1bxDpsIugHfLXZJGuP8n9jgGYu4VICwqKcLPl4bNOcRFw2n/g37\r\nvjqiPX7W4xIviPfYRfXdHdT6C3OhRzUKZW5kc3RyZWFtCmVuZG9iagoxIDAgb2Jq\r\nCjw8IC9UeXBlIC9QYWdlIC9QYXJlbnQgMiAwIFIgL1Jlc291cmNlcyA0IDAgUiAv\r\nQ29udGVudHMgMyAwIFIgL01lZGlhQm94IFswIDAgNTk1LjI4IDg0MS44OV0KPj4K\r\nZW5kb2JqCjQgMCBvYmoKPDwgL1Byb2NTZXQgWyAvUERGIC9UZXh0IF0gL0NvbG9y\r\nU3BhY2UgPDwgL0NzMSA1IDAgUiA+PiAvRm9udCA8PCAvVFQxIDYgMCBSCj4+ID4+\r\nCmVuZG9iago4IDAgb2JqCjw8IC9OIDMgL0FsdGVybmF0ZSAvRGV2aWNlUkdCIC9M\r\nZW5ndGggMjYxMiAvRmlsdGVyIC9GbGF0ZURlY29kZSA+PgpzdHJlYW0KeAGdlndU\r\nU9kWh8+9N73QEiIgJfQaegkg0jtIFQRRiUmAUAKGhCZ2RAVGFBEpVmRUwAFHhyJj\r\nRRQLg4Ji1wnyEFDGwVFEReXdjGsJ7601896a/cdZ39nnt9fZZ+9917oAUPyCBMJ0\r\nWAGANKFYFO7rwVwSE8vE9wIYEAEOWAHA4WZmBEf4RALU/L09mZmoSMaz9u4ugGS7\r\n2yy/UCZz1v9/kSI3QyQGAApF1TY8fiYX5QKUU7PFGTL/BMr0lSkyhjEyFqEJoqwi\r\n48SvbPan5iu7yZiXJuShGlnOGbw0noy7UN6aJeGjjAShXJgl4GejfAdlvVRJmgDl\r\n9yjT0/icTAAwFJlfzOcmoWyJMkUUGe6J8gIACJTEObxyDov5OWieAHimZ+SKBIlJ\r\nYqYR15hp5ejIZvrxs1P5YjErlMNN4Yh4TM/0tAyOMBeAr2+WRQElWW2ZaJHtrRzt\r\n7VnW5mj5v9nfHn5T/T3IevtV8Sbsz55BjJ5Z32zsrC+9FgD2JFqbHbO+lVUAtG0G\r\nQOXhrE/vIADyBQC03pzzHoZsXpLE4gwnC4vs7GxzAZ9rLivoN/ufgm/Kv4Y595nL\r\n7vtWO6YXP4EjSRUzZUXlpqemS0TMzAwOl89k/fcQ/+PAOWnNycMsnJ/AF/GF6FVR\r\n6JQJhIlou4U8gViQLmQKhH/V4X8YNicHGX6daxRodV8AfYU5ULhJB8hvPQBDIwMk\r\nbj96An3rWxAxCsi+vGitka9zjzJ6/uf6Hwtcim7hTEEiU+b2DI9kciWiLBmj34Rs\r\nwQISkAd0oAo0gS4wAixgDRyAM3AD3iAAhIBIEAOWAy5IAmlABLJBPtgACkEx2AF2\r\ng2pwANSBetAEToI2cAZcBFfADXALDIBHQAqGwUswAd6BaQiC8BAVokGqkBakD5lC\r\n1hAbWgh5Q0FQOBQDxUOJkBCSQPnQJqgYKoOqoUNQPfQjdBq6CF2D+qAH0CA0Bv0B\r\nfYQRmALTYQ3YALaA2bA7HAhHwsvgRHgVnAcXwNvhSrgWPg63whfhG/AALIVfwpMI\r\nQMgIA9FGWAgb8URCkFgkAREha5EipAKpRZqQDqQbuY1IkXHkAwaHoWGYGBbGGeOH\r\nWYzhYlZh1mJKMNWYY5hWTBfmNmYQM4H5gqVi1bGmWCesP3YJNhGbjS3EVmCPYFuw\r\nl7ED2GHsOxwOx8AZ4hxwfrgYXDJuNa4Etw/XjLuA68MN4SbxeLwq3hTvgg/Bc/Bi\r\nfCG+Cn8cfx7fjx/GvyeQCVoEa4IPIZYgJGwkVBAaCOcI/YQRwjRRgahPdCKGEHnE\r\nXGIpsY7YQbxJHCZOkxRJhiQXUiQpmbSBVElqIl0mPSa9IZPJOmRHchhZQF5PriSf\r\nIF8lD5I/UJQoJhRPShxFQtlOOUq5QHlAeUOlUg2obtRYqpi6nVpPvUR9Sn0vR5Mz\r\nl/OX48mtk6uRa5Xrl3slT5TXl3eXXy6fJ18hf0r+pvy4AlHBQMFTgaOwVqFG4bTC\r\nPYVJRZqilWKIYppiiWKD4jXFUSW8koGStxJPqUDpsNIlpSEaQtOledK4tE20Otpl\r\n2jAdRzek+9OT6cX0H+i99AllJWVb5SjlHOUa5bPKUgbCMGD4M1IZpYyTjLuMj/M0\r\n5rnP48/bNq9pXv+8KZX5Km4qfJUilWaVAZWPqkxVb9UU1Z2qbapP1DBqJmphatlq\r\n+9Uuq43Pp893ns+dXzT/5PyH6rC6iXq4+mr1w+o96pMamhq+GhkaVRqXNMY1GZpu\r\nmsma5ZrnNMe0aFoLtQRa5VrntV4wlZnuzFRmJbOLOaGtru2nLdE+pN2rPa1jqLNY\r\nZ6NOs84TXZIuWzdBt1y3U3dCT0svWC9fr1HvoT5Rn62fpL9Hv1t/ysDQINpgi0Gb\r\nwaihiqG/YZ5ho+FjI6qRq9Eqo1qjO8Y4Y7ZxivE+41smsImdSZJJjclNU9jU3lRg\r\nus+0zwxr5mgmNKs1u8eisNxZWaxG1qA5wzzIfKN5m/krCz2LWIudFt0WXyztLFMt\r\n6ywfWSlZBVhttOqw+sPaxJprXWN9x4Zq42Ozzqbd5rWtqS3fdr/tfTuaXbDdFrtO\r\nu8/2DvYi+yb7MQc9h3iHvQ732HR2KLuEfdUR6+jhuM7xjOMHJ3snsdNJp9+dWc4p\r\nzg3OowsMF/AX1C0YctFx4bgccpEuZC6MX3hwodRV25XjWuv6zE3Xjed2xG3E3dg9\r\n2f24+ysPSw+RR4vHlKeT5xrPC16Il69XkVevt5L3Yu9q76c+Oj6JPo0+E752vqt9\r\nL/hh/QL9dvrd89fw5/rX+08EOASsCegKpARGBFYHPgsyCRIFdQTDwQHBu4IfL9Jf\r\nJFzUFgJC/EN2hTwJNQxdFfpzGC4sNKwm7Hm4VXh+eHcELWJFREPEu0iPyNLIR4uN\r\nFksWd0bJR8VF1UdNRXtFl0VLl1gsWbPkRoxajCCmPRYfGxV7JHZyqffS3UuH4+zi\r\nCuPuLjNclrPs2nK15anLz66QX8FZcSoeGx8d3xD/iRPCqeVMrvRfuXflBNeTu4f7\r\nkufGK+eN8V34ZfyRBJeEsoTRRJfEXYljSa5JFUnjAk9BteB1sl/ygeSplJCUoykz\r\nqdGpzWmEtPi000IlYYqwK10zPSe9L8M0ozBDuspp1e5VE6JA0ZFMKHNZZruYjv5M\r\n9UiMJJslg1kLs2qy3mdHZZ/KUcwR5vTkmuRuyx3J88n7fjVmNXd1Z752/ob8wTXu\r\naw6thdauXNu5Tnddwbrh9b7rj20gbUjZ8MtGy41lG99uit7UUaBRsL5gaLPv5sZC\r\nuUJR4b0tzlsObMVsFWzt3WazrWrblyJe0fViy+KK4k8l3JLr31l9V/ndzPaE7b2l\r\n9qX7d+B2CHfc3em681iZYlle2dCu4F2t5czyovK3u1fsvlZhW3FgD2mPZI+0Mqiy\r\nvUqvakfVp+qk6oEaj5rmvep7t+2d2sfb17/fbX/TAY0DxQc+HhQcvH/I91BrrUFt\r\nxWHc4azDz+ui6rq/Z39ff0TtSPGRz0eFR6XHwo911TvU1zeoN5Q2wo2SxrHjccdv\r\n/eD1Q3sTq+lQM6O5+AQ4ITnx4sf4H++eDDzZeYp9qukn/Z/2ttBailqh1tzWibak\r\nNml7THvf6YDTnR3OHS0/m/989Iz2mZqzymdLz5HOFZybOZ93fvJCxoXxi4kXhzpX\r\ndD66tOTSna6wrt7LgZevXvG5cqnbvfv8VZerZ645XTt9nX297Yb9jdYeu56WX+x+\r\naem172296XCz/ZbjrY6+BX3n+l37L972un3ljv+dGwOLBvruLr57/17cPel93v3R\r\nB6kPXj/Mejj9aP1j7OOiJwpPKp6qP6391fjXZqm99Oyg12DPs4hnj4a4Qy//lfmv\r\nT8MFz6nPK0a0RupHrUfPjPmM3Xqx9MXwy4yX0+OFvyn+tveV0auffnf7vWdiycTw\r\na9HrmT9K3qi+OfrW9m3nZOjk03dp76anit6rvj/2gf2h+2P0x5Hp7E/4T5WfjT93\r\nfAn88ngmbWbm3/eE8/sKZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqClsgL0lDQ0Jh\r\nc2VkIDggMCBSIF0KZW5kb2JqCjEwIDAgb2JqCjw8IC9UeXBlIC9TdHJ1Y3RUcmVl\r\nUm9vdCAvSyA5IDAgUiA+PgplbmRvYmoKOSAwIG9iago8PCAvVHlwZSAvU3RydWN0\r\nRWxlbSAvUyAvRG9jdW1lbnQgL1AgMTAgMCBSIC9LIFsgMTEgMCBSIF0gID4+CmVu\r\nZG9iagoxMSAwIG9iago8PCAvVHlwZSAvU3RydWN0RWxlbSAvUyAvUCAvUCA5IDAg\r\nUiAvUGcgMSAwIFIgL0sgMSAgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1Bh\r\nZ2VzIC9NZWRpYUJveCBbMCAwIDU5NS4yOCA4NDEuODldIC9Db3VudCAxIC9LaWRz\r\nIFsgMSAwIFIgXSA+PgplbmRvYmoKMTIgMCBvYmoKPDwgL1R5cGUgL0NhdGFsb2cg\r\nL1BhZ2VzIDIgMCBSIC9NYXJrSW5mbyA8PCAvTWFya2VkIHRydWUgPj4gL1N0cnVj\r\ndFRyZWVSb290CjEwIDAgUiA+PgplbmRvYmoKNyAwIG9iagpbIDEgMCBSICAvWFla\r\nIDAgODQxLjg5IDAgXQplbmRvYmoKNiAwIG9iago8PCAvVHlwZSAvRm9udCAvU3Vi\r\ndHlwZSAvVHJ1ZVR5cGUgL0Jhc2VGb250IC9BQUFBQUIrSGVsdmV0aWNhTmV1ZSAv\r\nRm9udERlc2NyaXB0b3IKMTMgMCBSIC9FbmNvZGluZyAvTWFjUm9tYW5FbmNvZGlu\r\nZyAvRmlyc3RDaGFyIDMyIC9MYXN0Q2hhciAxMjEgL1dpZHRocyBbIDI3OAowIDAg\r\nMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAg\r\nMCAwIDAgMCAwIDAgMCAwIDAgMCAwCjAgMCAwIDI1OSAwIDAgMCAwIDAgMCAwIDAg\r\nMCAwIDU3NCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCA1MzcgMCA1MzcgNTkzIDUz\r\nNwoyOTYgNTc0IDAgMjIyIDAgMCAyMjIgMCA1NTYgNTc0IDU5MyAwIDMzMyA1MDAg\r\nMzE1IDAgMCAwIDAgNTAwIF0gPj4KZW5kb2JqCjEzIDAgb2JqCjw8IC9UeXBlIC9G\r\nb250RGVzY3JpcHRvciAvRm9udE5hbWUgL0FBQUFBQitIZWx2ZXRpY2FOZXVlIC9G\r\nbGFncyAzMiAvRm9udEJCb3gKWy05NTEgLTQ4MSAxOTg3IDEwNzddIC9JdGFsaWNB\r\nbmdsZSAwIC9Bc2NlbnQgOTUyIC9EZXNjZW50IC0yMTMgL0NhcEhlaWdodAo3MTQg\r\nL1N0ZW1WIDk1IC9MZWFkaW5nIDI4IC9YSGVpZ2h0IDUxNyAvU3RlbUggODAgL0F2\r\nZ1dpZHRoIDQ0NyAvTWF4V2lkdGggMjIyNQovRm9udEZpbGUyIDE0IDAgUiA+Pgpl\r\nbmRvYmoKMTQgMCBvYmoKPDwgL0xlbmd0aDEgNTcwOCAvTGVuZ3RoIDMyODUgL0Zp\r\nbHRlciAvRmxhdGVEZWNvZGUgPj4Kc3RyZWFtCngBrVh9bFtXFb/3+jOOY/vFfv6I\r\n7djPzx/xR+3Yjh3ny0maOE2adf1Ma7dN2zTNmqKVVVso2wRTJbSK5Q8EiA26IUBD\r\n2kAIlEmouJ5glSY2GJtUIQFiqib+ASGEpglt+2NbUn73PcdNszFVqG5/755733vn\r\nnfs7555zb1Ye/tISMZNLREPGFs8vXCDKT9+H5s3FiytBtU9/gtb9wIWz55v964Ro\r\ne84++NgDat/QQ4jll8tLC2fUPvkEbXEZA2qfcn3h5fMrj6p93T/R3vfgQ4vN+wY+\r\n3HN+4dHm98lN9INfXDi/xG8Q4gzj0nPhoUdWlC4R+f3pCw8vNZ+nVfT3qPe2XClk\r\nO5kgTBlTr90EXS3sxY/fB/7zhFt70jr8ARU03C5ydeIUb8g7f9shfDKzETC8qi2g\r\n29bUo7yjqd9KEp/xJdy/ZHhV0aS807zY68SRpA28wYgzSV8BvWXST5IkAIMI8SXJ\r\nK7iz+86hBtHinzdZJzRY+eo592SdmNDBW4Q4+P9ZchSicGuQtDMdMbM3iIDbqdk6\r\nadtXfYnSb9Tq9NaT9UnivwZrNSdP7ICqVDBYOTe5Rk+hw1IYSEiQNKng1JomMnWg\r\nKteCq8HVmTOrwang8sKZNW1EaXFjabWWCa6Rg9VzuB6qSmtjNW9LXKrVBqFHy/Xg\r\nFTy+WoOGLzQ1oFWGMut4SJeaDa5povuq+6trlya9a2OTNa8kBStr1/dV165PeqVa\r\nDU/pW5bCYj591WYDbNYncN+oajkIHVBRW13lOtFjUWnt+uqqdxUzUUZkqU5JcwAz\r\n5c9oIpU6HdtX5bfGZMnLB2RJlmBHbRK621KzB6sVWCJxS0yfopRMbqG0vWUonjXD\r\nvHaF0o57RKnlbii13hWltpald1AqwGYbp7TzsymVP4fQFsNjn8HwJZXhS5/BsP0O\r\n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\r\nnwplbmRzdHJlYW0KZW5kb2JqCjE1IDAgb2JqCjw8IC9UaXRsZSAodGVzdCkgL1By\r\nb2R1Y2VyIChtYWNPUyBWZXJzaW9uIDE0LjQgXChCdWlsZCAyM0UyMTRcKSBRdWFy\r\ndHogUERGQ29udGV4dCkKL0NyZWF0b3IgKFBhZ2VzKSAvQ3JlYXRpb25EYXRlIChE\r\nOjIwMjQwNzIzMDQyNTM1WjAwJzAwJykgL01vZERhdGUgKEQ6MjAyNDA3MjMwNDI1\r\nMzVaMDAnMDAnKQo+PgplbmRvYmoKeHJlZgowIDE2CjAwMDAwMDAwMDAgNjU1MzUg\r\nZiAKMDAwMDAwMDMxMiAwMDAwMCBuIAowMDAwMDAzNDY3IDAwMDAwIG4gCjAwMDAw\r\nMDAwMjIgMDAwMDAgbiAKMDAwMDAwMDQyMiAwMDAwMCBuIAowMDAwMDAzMjMxIDAw\r\nMDAwIG4gCjAwMDAwMDM3MDAgMDAwMDAgbiAKMDAwMDAwMzY1OCAwMDAwMCBuIAow\r\nMDAwMDAwNTE5IDAwMDAwIG4gCjAwMDAwMDMzMTkgMDAwMDAgbiAKMDAwMDAwMzI2\r\nNiAwMDAwMCBuIAowMDAwMDAzMzk2IDAwMDAwIG4gCjAwMDAwMDM1NTYgMDAwMDAg\r\nbiAKMDAwMDAwNDA5MSAwMDAwMCBuIAowMDAwMDA0MzU3IDAwMDAwIG4gCjAwMDAw\r\nMDc3MzAgMDAwMDAgbiAKdHJhaWxlcgo8PCAvU2l6ZSAxNiAvUm9vdCAxMiAwIFIg\r\nL0luZm8gMTUgMCBSIC9JRCBbIDw1MmQxZDRhNWI4MzJkNDFiZmFmMWFkZTE2MmE1\r\nMzIyYj4KPDUyZDFkNGE1YjgzMmQ0MWJmYWYxYWRlMTYyYTUzMjJiPiBdID4+CnN0\r\nYXJ0eHJlZgo3OTI0CiUlRU9GCqCCBDowggQ2MIIDnqADAgECAhQRRyh1gt+btHEO\r\nRhgErNSbiL9FxDAOBgoqgw4DCgEBAgMCBQAwXTFOMEwGA1UEAwxF0rDQm9Ci0KLQ\r\nq9KaINCa0KPTmNCb0JDQndCU0KvQoNCj0KjQqyDQntCg0KLQkNCb0KvSmiAoR09T\r\nVCkgVEVTVCAyMDIyMQswCQYDVQQGEwJLWjAeFw0yMzExMDkxMDE4NDBaFw0yNDEx\r\nMDgxMDE4NDBaMHkxHjAcBgNVBAMMFdCi0JXQodCi0J7QkiDQotCV0KHQojEVMBMG\r\nA1UEBAwM0KLQldCh0KLQntCSMRgwFgYDVQQFEw9JSU4xMjM0NTY3ODkwMTExCzAJ\r\nBgNVBAYTAktaMRkwFwYDVQQqDBDQotCV0KHQotCe0JLQmNCnMIGsMCMGCSqDDgMK\r\nAQECAjAWBgoqgw4DCgEBAgIBBggqgw4DCgEDAwOBhAAEgYDa/NKfEL8rvhXRv1DM\r\nn+vaYz0bGFs6ixgojRIEKcCjYht4DkcrPOGW3k+ER4YR1M3jCv1tb7FHi/EQFWoO\r\neIBhFHq6cJ/M6ZHLucyjnIDgk/C7zvbg5mXB7YIQGyYHK0DJF4K2HpFkzJ4DNMP9\r\nLprKgGYp9UCUIUH0FflwQlVXaqOCAcYwggHCMDgGA1UdIAQxMC8wLQYGKoMOAwMC\r\nMCMwIQYIKwYBBQUHAgEWFWh0dHA6Ly9wa2kuZ292Lmt6L2NwczB3BggrBgEFBQcB\r\nAQRrMGkwKAYIKwYBBQUHMAGGHGh0dHA6Ly90ZXN0LnBraS5nb3Yua3ovb2NzcC8w\r\nPQYIKwYBBQUHMAKGMWh0dHA6Ly90ZXN0LnBraS5nb3Yua3ovY2VydC9uY2FfZ29z\r\ndDIwMjJfdGVzdC5jZXIwQQYDVR0fBDowODA2oDSgMoYwaHR0cDovL3Rlc3QucGtp\r\nLmdvdi5rei9jcmwvbmNhX2dvc3QyMDIyX3Rlc3QuY3JsMEMGA1UdLgQ8MDowOKA2\r\noDSGMmh0dHA6Ly90ZXN0LnBraS5nb3Yua3ovY3JsL25jYV9nb3N0MjAyMl9kX3Rl\r\nc3QuY3JsMB0GA1UdJQQWMBQGCCsGAQUFBwMEBggqgw4DAwQBATAOBgNVHQ8BAf8E\r\nBAMCA8gwHQYDVR0OBBYEFIFHKHWC35u0cQ5GGASs1JuIv0XEMB8GA1UdIwQYMBaA\r\nFPrSSxujoMlh/hyoUD5qortFDbijMBYGBiqDDgMDBQQMMAoGCCqDDgMDBQEBMA4G\r\nCiqDDgMKAQECAwIFAAOBgQBpz+3kpvElKZfsyHVbOWqbzdS5jqIafZOucNNM3Sfq\r\ngW40FP2UXK9fofDBcXsrZxXQL8P9t3a+9OstVN2KV3rKpf7St/iYe0t9kCjZZi37\r\n0t7JtamkTZkaRrFcJLZ2L5tnDI+hXY2IDRAlGBAC24IPLstj6nJIE1S28F1ReBhz\r\nEzGCAeQwggHgAgEBMHUwXTFOMEwGA1UEAwxF0rDQm9Ci0KLQq9KaINCa0KPTmNCb\r\n0JDQndCU0KvQoNCj0KjQqyDQntCg0KLQkNCb0KvSmiAoR09TVCkgVEVTVCAyMDIy\r\nMQswCQYDVQQGEwJLWgIUEUcodYLfm7RxDkYYBKzUm4i/RcQwDAYIKoMOAwoBAwMF\r\nAKCBwjAYBgkqhkiG9w0BCQMxCwYJKoZIhvcNAQcBMBwGCSqGSIb3DQEJBTEPFw0y\r\nNDA3MjYxMjI5MDhaMDcGCyqGSIb3DQEJEAIvMSgwJjAkMCIEIBu6B9ZqO4PyIjmd\r\noiU5ELt4u2GOUY5aKzbbJgQh2nOTME8GCSqGSIb3DQEJBDFCBEALpvV1bZjCzTux\r\nqckeawqZzI0ORycoMDwLurelpiRj2b5SrTuk0gs3GDwm1rMz8CElaDrZ54ly79Wn\r\nd74u5tsBMA4GCiqDDgMKAQECAwIFAASBgP98kuuP1Hio+fl5wT2D3F6WLvoslV/9\r\nqRflfFpMGOm3GqKog+SQ9+1O0PblzeMGhyD+E3cZb2avExpIQ4gGAPEhrykZtg79\r\nFeteZhrJyQTJhmp2YNPhpItZ2hESlSBtuTNpO56AYE+yNDG6b58nlJNcuOdMZ2rZ\r\nJHJ30f8zkZ28\r\n"


                  const binaryString = atob(cmsData);
				 const bytes = new Uint8Array(binaryString.length);
				 
				   for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i); 
                }
                // Convert ArrayBuffer to Uint8Array
                //const bytes = new Uint8Array(cmsData);

                try {
                    // Convert Uint8Array to base64
                    debugger
                    const base64String = this.arrayBufferToBase64(bytes);
                    console.log(base64String)
					
					// Decode base64 string to binary string
                    const binaryString = atob(base64String);

                    // Convert binary string to Uint8Array
                    const binaryBytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        binaryBytes[i] = binaryString.charCodeAt(i);
                    }

                       const pdfBlob = new Blob([binaryBytes], { type: 'application/pdf' });
                       console.log(pdfBlob);
                       

                    // Create a link element
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(pdfBlob);
                    link.download = 'document.pdf';

                    // Append the link to the body and trigger a click
                    document.body.appendChild(link);
                    link.click();

                    // Remove the link from the body
                    document.body.removeChild(link);
                } catch (error) {
                    console.error('Error processing CMS data:', error);
                    alert('Failed to process CMS data.');
                }
            

            // Read the file as ArrayBuffer
          //  reader.readAsArrayBuffer(file);
        },

        // Utility function to convert ArrayBuffer to base64
        arrayBufferToBase64:  function (buffer) {
            let binary = '';
            const bytes = new Uint8Array(buffer);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return window.btoa(binary);
        },

        onSendCMS2: async function() {
            let cmsData = "\r\nMIInNQYJKoZIhvcNAQcCoIInJjCCJyICAQExDjAMBggqgw4DCgEDAwUAMIIg5QYJ\r\nKoZIhvcNAQcBoIIg1gSCINIlUERGLTEuMwolxOXy5eun86DQxMYKMyAwIG9iago8\r\nPCAvRmlsdGVyIC9GbGF0ZURlY29kZSAvTGVuZ3RoIDIxOCA+PgpzdHJlYW0KeAFd\r\nj7Fqw0AMhnc/xT8mQ88n+84nQcgQJ0MKgRYOOpQOwbXbgO3Udpa+feU0pbRokH74\r\npPtuwCMGWC0v3mQMdmRYMNZ4Qo+0nAjVBLrWVCl3AzpdKH5CO4fkzhqyIuwdWgX/\r\nxHc0SB+wWiE9lPutnluvsdmW1+d9bhwLCXxhCskkg2M2uaWAkJMJNkjyT2g2tlCh\r\nQU/NI/0uh+ANO1bxDpsIugHfLXZJGuP8n9jgGYu4VICwqKcLPl4bNOcRFw2n/g37\r\nvjqiPX7W4xIviPfYRfXdHdT6C3OhRzUKZW5kc3RyZWFtCmVuZG9iagoxIDAgb2Jq\r\nCjw8IC9UeXBlIC9QYWdlIC9QYXJlbnQgMiAwIFIgL1Jlc291cmNlcyA0IDAgUiAv\r\nQ29udGVudHMgMyAwIFIgL01lZGlhQm94IFswIDAgNTk1LjI4IDg0MS44OV0KPj4K\r\nZW5kb2JqCjQgMCBvYmoKPDwgL1Byb2NTZXQgWyAvUERGIC9UZXh0IF0gL0NvbG9y\r\nU3BhY2UgPDwgL0NzMSA1IDAgUiA+PiAvRm9udCA8PCAvVFQxIDYgMCBSCj4+ID4+\r\nCmVuZG9iago4IDAgb2JqCjw8IC9OIDMgL0FsdGVybmF0ZSAvRGV2aWNlUkdCIC9M\r\nZW5ndGggMjYxMiAvRmlsdGVyIC9GbGF0ZURlY29kZSA+PgpzdHJlYW0KeAGdlndU\r\nU9kWh8+9N73QEiIgJfQaegkg0jtIFQRRiUmAUAKGhCZ2RAVGFBEpVmRUwAFHhyJj\r\nRRQLg4Ji1wnyEFDGwVFEReXdjGsJ7601896a/cdZ39nnt9fZZ+9917oAUPyCBMJ0\r\nWAGANKFYFO7rwVwSE8vE9wIYEAEOWAHA4WZmBEf4RALU/L09mZmoSMaz9u4ugGS7\r\n2yy/UCZz1v9/kSI3QyQGAApF1TY8fiYX5QKUU7PFGTL/BMr0lSkyhjEyFqEJoqwi\r\n48SvbPan5iu7yZiXJuShGlnOGbw0noy7UN6aJeGjjAShXJgl4GejfAdlvVRJmgDl\r\n9yjT0/icTAAwFJlfzOcmoWyJMkUUGe6J8gIACJTEObxyDov5OWieAHimZ+SKBIlJ\r\nYqYR15hp5ejIZvrxs1P5YjErlMNN4Yh4TM/0tAyOMBeAr2+WRQElWW2ZaJHtrRzt\r\n7VnW5mj5v9nfHn5T/T3IevtV8Sbsz55BjJ5Z32zsrC+9FgD2JFqbHbO+lVUAtG0G\r\nQOXhrE/vIADyBQC03pzzHoZsXpLE4gwnC4vs7GxzAZ9rLivoN/ufgm/Kv4Y595nL\r\n7vtWO6YXP4EjSRUzZUXlpqemS0TMzAwOl89k/fcQ/+PAOWnNycMsnJ/AF/GF6FVR\r\n6JQJhIlou4U8gViQLmQKhH/V4X8YNicHGX6daxRodV8AfYU5ULhJB8hvPQBDIwMk\r\nbj96An3rWxAxCsi+vGitka9zjzJ6/uf6Hwtcim7hTEEiU+b2DI9kciWiLBmj34Rs\r\nwQISkAd0oAo0gS4wAixgDRyAM3AD3iAAhIBIEAOWAy5IAmlABLJBPtgACkEx2AF2\r\ng2pwANSBetAEToI2cAZcBFfADXALDIBHQAqGwUswAd6BaQiC8BAVokGqkBakD5lC\r\n1hAbWgh5Q0FQOBQDxUOJkBCSQPnQJqgYKoOqoUNQPfQjdBq6CF2D+qAH0CA0Bv0B\r\nfYQRmALTYQ3YALaA2bA7HAhHwsvgRHgVnAcXwNvhSrgWPg63whfhG/AALIVfwpMI\r\nQMgIA9FGWAgb8URCkFgkAREha5EipAKpRZqQDqQbuY1IkXHkAwaHoWGYGBbGGeOH\r\nWYzhYlZh1mJKMNWYY5hWTBfmNmYQM4H5gqVi1bGmWCesP3YJNhGbjS3EVmCPYFuw\r\nl7ED2GHsOxwOx8AZ4hxwfrgYXDJuNa4Etw/XjLuA68MN4SbxeLwq3hTvgg/Bc/Bi\r\nfCG+Cn8cfx7fjx/GvyeQCVoEa4IPIZYgJGwkVBAaCOcI/YQRwjRRgahPdCKGEHnE\r\nXGIpsY7YQbxJHCZOkxRJhiQXUiQpmbSBVElqIl0mPSa9IZPJOmRHchhZQF5PriSf\r\nIF8lD5I/UJQoJhRPShxFQtlOOUq5QHlAeUOlUg2obtRYqpi6nVpPvUR9Sn0vR5Mz\r\nl/OX48mtk6uRa5Xrl3slT5TXl3eXXy6fJ18hf0r+pvy4AlHBQMFTgaOwVqFG4bTC\r\nPYVJRZqilWKIYppiiWKD4jXFUSW8koGStxJPqUDpsNIlpSEaQtOledK4tE20Otpl\r\n2jAdRzek+9OT6cX0H+i99AllJWVb5SjlHOUa5bPKUgbCMGD4M1IZpYyTjLuMj/M0\r\n5rnP48/bNq9pXv+8KZX5Km4qfJUilWaVAZWPqkxVb9UU1Z2qbapP1DBqJmphatlq\r\n+9Uuq43Pp893ns+dXzT/5PyH6rC6iXq4+mr1w+o96pMamhq+GhkaVRqXNMY1GZpu\r\nmsma5ZrnNMe0aFoLtQRa5VrntV4wlZnuzFRmJbOLOaGtru2nLdE+pN2rPa1jqLNY\r\nZ6NOs84TXZIuWzdBt1y3U3dCT0svWC9fr1HvoT5Rn62fpL9Hv1t/ysDQINpgi0Gb\r\nwaihiqG/YZ5ho+FjI6qRq9Eqo1qjO8Y4Y7ZxivE+41smsImdSZJJjclNU9jU3lRg\r\nus+0zwxr5mgmNKs1u8eisNxZWaxG1qA5wzzIfKN5m/krCz2LWIudFt0WXyztLFMt\r\n6ywfWSlZBVhttOqw+sPaxJprXWN9x4Zq42Ozzqbd5rWtqS3fdr/tfTuaXbDdFrtO\r\nu8/2DvYi+yb7MQc9h3iHvQ732HR2KLuEfdUR6+jhuM7xjOMHJ3snsdNJp9+dWc4p\r\nzg3OowsMF/AX1C0YctFx4bgccpEuZC6MX3hwodRV25XjWuv6zE3Xjed2xG3E3dg9\r\n2f24+ysPSw+RR4vHlKeT5xrPC16Il69XkVevt5L3Yu9q76c+Oj6JPo0+E752vqt9\r\nL/hh/QL9dvrd89fw5/rX+08EOASsCegKpARGBFYHPgsyCRIFdQTDwQHBu4IfL9Jf\r\nJFzUFgJC/EN2hTwJNQxdFfpzGC4sNKwm7Hm4VXh+eHcELWJFREPEu0iPyNLIR4uN\r\nFksWd0bJR8VF1UdNRXtFl0VLl1gsWbPkRoxajCCmPRYfGxV7JHZyqffS3UuH4+zi\r\nCuPuLjNclrPs2nK15anLz66QX8FZcSoeGx8d3xD/iRPCqeVMrvRfuXflBNeTu4f7\r\nkufGK+eN8V34ZfyRBJeEsoTRRJfEXYljSa5JFUnjAk9BteB1sl/ygeSplJCUoykz\r\nqdGpzWmEtPi000IlYYqwK10zPSe9L8M0ozBDuspp1e5VE6JA0ZFMKHNZZruYjv5M\r\n9UiMJJslg1kLs2qy3mdHZZ/KUcwR5vTkmuRuyx3J88n7fjVmNXd1Z752/ob8wTXu\r\naw6thdauXNu5Tnddwbrh9b7rj20gbUjZ8MtGy41lG99uit7UUaBRsL5gaLPv5sZC\r\nuUJR4b0tzlsObMVsFWzt3WazrWrblyJe0fViy+KK4k8l3JLr31l9V/ndzPaE7b2l\r\n9qX7d+B2CHfc3em681iZYlle2dCu4F2t5czyovK3u1fsvlZhW3FgD2mPZI+0Mqiy\r\nvUqvakfVp+qk6oEaj5rmvep7t+2d2sfb17/fbX/TAY0DxQc+HhQcvH/I91BrrUFt\r\nxWHc4azDz+ui6rq/Z39ff0TtSPGRz0eFR6XHwo911TvU1zeoN5Q2wo2SxrHjccdv\r\n/eD1Q3sTq+lQM6O5+AQ4ITnx4sf4H++eDDzZeYp9qukn/Z/2ttBailqh1tzWibak\r\nNml7THvf6YDTnR3OHS0/m/989Iz2mZqzymdLz5HOFZybOZ93fvJCxoXxi4kXhzpX\r\ndD66tOTSna6wrt7LgZevXvG5cqnbvfv8VZerZ645XTt9nX297Yb9jdYeu56WX+x+\r\naem172296XCz/ZbjrY6+BX3n+l37L972un3ljv+dGwOLBvruLr57/17cPel93v3R\r\nB6kPXj/Mejj9aP1j7OOiJwpPKp6qP6391fjXZqm99Oyg12DPs4hnj4a4Qy//lfmv\r\nT8MFz6nPK0a0RupHrUfPjPmM3Xqx9MXwy4yX0+OFvyn+tveV0auffnf7vWdiycTw\r\na9HrmT9K3qi+OfrW9m3nZOjk03dp76anit6rvj/2gf2h+2P0x5Hp7E/4T5WfjT93\r\nfAn88ngmbWbm3/eE8/sKZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqClsgL0lDQ0Jh\r\nc2VkIDggMCBSIF0KZW5kb2JqCjEwIDAgb2JqCjw8IC9UeXBlIC9TdHJ1Y3RUcmVl\r\nUm9vdCAvSyA5IDAgUiA+PgplbmRvYmoKOSAwIG9iago8PCAvVHlwZSAvU3RydWN0\r\nRWxlbSAvUyAvRG9jdW1lbnQgL1AgMTAgMCBSIC9LIFsgMTEgMCBSIF0gID4+CmVu\r\nZG9iagoxMSAwIG9iago8PCAvVHlwZSAvU3RydWN0RWxlbSAvUyAvUCAvUCA5IDAg\r\nUiAvUGcgMSAwIFIgL0sgMSAgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1Bh\r\nZ2VzIC9NZWRpYUJveCBbMCAwIDU5NS4yOCA4NDEuODldIC9Db3VudCAxIC9LaWRz\r\nIFsgMSAwIFIgXSA+PgplbmRvYmoKMTIgMCBvYmoKPDwgL1R5cGUgL0NhdGFsb2cg\r\nL1BhZ2VzIDIgMCBSIC9NYXJrSW5mbyA8PCAvTWFya2VkIHRydWUgPj4gL1N0cnVj\r\ndFRyZWVSb290CjEwIDAgUiA+PgplbmRvYmoKNyAwIG9iagpbIDEgMCBSICAvWFla\r\nIDAgODQxLjg5IDAgXQplbmRvYmoKNiAwIG9iago8PCAvVHlwZSAvRm9udCAvU3Vi\r\ndHlwZSAvVHJ1ZVR5cGUgL0Jhc2VGb250IC9BQUFBQUIrSGVsdmV0aWNhTmV1ZSAv\r\nRm9udERlc2NyaXB0b3IKMTMgMCBSIC9FbmNvZGluZyAvTWFjUm9tYW5FbmNvZGlu\r\nZyAvRmlyc3RDaGFyIDMyIC9MYXN0Q2hhciAxMjEgL1dpZHRocyBbIDI3OAowIDAg\r\nMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAg\r\nMCAwIDAgMCAwIDAgMCAwIDAgMCAwCjAgMCAwIDI1OSAwIDAgMCAwIDAgMCAwIDAg\r\nMCAwIDU3NCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCA1MzcgMCA1MzcgNTkzIDUz\r\nNwoyOTYgNTc0IDAgMjIyIDAgMCAyMjIgMCA1NTYgNTc0IDU5MyAwIDMzMyA1MDAg\r\nMzE1IDAgMCAwIDAgNTAwIF0gPj4KZW5kb2JqCjEzIDAgb2JqCjw8IC9UeXBlIC9G\r\nb250RGVzY3JpcHRvciAvRm9udE5hbWUgL0FBQUFBQitIZWx2ZXRpY2FOZXVlIC9G\r\nbGFncyAzMiAvRm9udEJCb3gKWy05NTEgLTQ4MSAxOTg3IDEwNzddIC9JdGFsaWNB\r\nbmdsZSAwIC9Bc2NlbnQgOTUyIC9EZXNjZW50IC0yMTMgL0NhcEhlaWdodAo3MTQg\r\nL1N0ZW1WIDk1IC9MZWFkaW5nIDI4IC9YSGVpZ2h0IDUxNyAvU3RlbUggODAgL0F2\r\nZ1dpZHRoIDQ0NyAvTWF4V2lkdGggMjIyNQovRm9udEZpbGUyIDE0IDAgUiA+Pgpl\r\nbmRvYmoKMTQgMCBvYmoKPDwgL0xlbmd0aDEgNTcwOCAvTGVuZ3RoIDMyODUgL0Zp\r\nbHRlciAvRmxhdGVEZWNvZGUgPj4Kc3RyZWFtCngBrVh9bFtXFb/3+jOOY/vFfv6I\r\n7djPzx/xR+3Yjh3ny0maOE2adf1Ma7dN2zTNmqKVVVso2wRTJbSK5Q8EiA26IUBD\r\n2kAIlEmouJ5glSY2GJtUIQFiqib+ASGEpglt+2NbUn73PcdNszFVqG5/755733vn\r\nnfs7555zb1Ye/tISMZNLREPGFs8vXCDKT9+H5s3FiytBtU9/gtb9wIWz55v964Ro\r\ne84++NgDat/QQ4jll8tLC2fUPvkEbXEZA2qfcn3h5fMrj6p93T/R3vfgQ4vN+wY+\r\n3HN+4dHm98lN9INfXDi/xG8Q4gzj0nPhoUdWlC4R+f3pCw8vNZ+nVfT3qPe2XClk\r\nO5kgTBlTr90EXS3sxY/fB/7zhFt70jr8ARU03C5ydeIUb8g7f9shfDKzETC8qi2g\r\n29bUo7yjqd9KEp/xJdy/ZHhV0aS807zY68SRpA28wYgzSV8BvWXST5IkAIMI8SXJ\r\nK7iz+86hBtHinzdZJzRY+eo592SdmNDBW4Q4+P9ZchSicGuQtDMdMbM3iIDbqdk6\r\nadtXfYnSb9Tq9NaT9UnivwZrNSdP7ICqVDBYOTe5Rk+hw1IYSEiQNKng1JomMnWg\r\nKteCq8HVmTOrwang8sKZNW1EaXFjabWWCa6Rg9VzuB6qSmtjNW9LXKrVBqFHy/Xg\r\nFTy+WoOGLzQ1oFWGMut4SJeaDa5povuq+6trlya9a2OTNa8kBStr1/dV165PeqVa\r\nDU/pW5bCYj591WYDbNYncN+oajkIHVBRW13lOtFjUWnt+uqqdxUzUUZkqU5JcwAz\r\n5c9oIpU6HdtX5bfGZMnLB2RJlmBHbRK621KzB6sVWCJxS0yfopRMbqG0vWUonjXD\r\nvHaF0o57RKnlbii13hWltpald1AqwGYbp7TzsymVP4fQFsNjn8HwJZXhS5/BsP0O\r\n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\r\nnwplbmRzdHJlYW0KZW5kb2JqCjE1IDAgb2JqCjw8IC9UaXRsZSAodGVzdCkgL1By\r\nb2R1Y2VyIChtYWNPUyBWZXJzaW9uIDE0LjQgXChCdWlsZCAyM0UyMTRcKSBRdWFy\r\ndHogUERGQ29udGV4dCkKL0NyZWF0b3IgKFBhZ2VzKSAvQ3JlYXRpb25EYXRlIChE\r\nOjIwMjQwNzIzMDQyNTM1WjAwJzAwJykgL01vZERhdGUgKEQ6MjAyNDA3MjMwNDI1\r\nMzVaMDAnMDAnKQo+PgplbmRvYmoKeHJlZgowIDE2CjAwMDAwMDAwMDAgNjU1MzUg\r\nZiAKMDAwMDAwMDMxMiAwMDAwMCBuIAowMDAwMDAzNDY3IDAwMDAwIG4gCjAwMDAw\r\nMDAwMjIgMDAwMDAgbiAKMDAwMDAwMDQyMiAwMDAwMCBuIAowMDAwMDAzMjMxIDAw\r\nMDAwIG4gCjAwMDAwMDM3MDAgMDAwMDAgbiAKMDAwMDAwMzY1OCAwMDAwMCBuIAow\r\nMDAwMDAwNTE5IDAwMDAwIG4gCjAwMDAwMDMzMTkgMDAwMDAgbiAKMDAwMDAwMzI2\r\nNiAwMDAwMCBuIAowMDAwMDAzMzk2IDAwMDAwIG4gCjAwMDAwMDM1NTYgMDAwMDAg\r\nbiAKMDAwMDAwNDA5MSAwMDAwMCBuIAowMDAwMDA0MzU3IDAwMDAwIG4gCjAwMDAw\r\nMDc3MzAgMDAwMDAgbiAKdHJhaWxlcgo8PCAvU2l6ZSAxNiAvUm9vdCAxMiAwIFIg\r\nL0luZm8gMTUgMCBSIC9JRCBbIDw1MmQxZDRhNWI4MzJkNDFiZmFmMWFkZTE2MmE1\r\nMzIyYj4KPDUyZDFkNGE1YjgzMmQ0MWJmYWYxYWRlMTYyYTUzMjJiPiBdID4+CnN0\r\nYXJ0eHJlZgo3OTI0CiUlRU9GCqCCBDowggQ2MIIDnqADAgECAhQRRyh1gt+btHEO\r\nRhgErNSbiL9FxDAOBgoqgw4DCgEBAgMCBQAwXTFOMEwGA1UEAwxF0rDQm9Ci0KLQ\r\nq9KaINCa0KPTmNCb0JDQndCU0KvQoNCj0KjQqyDQntCg0KLQkNCb0KvSmiAoR09T\r\nVCkgVEVTVCAyMDIyMQswCQYDVQQGEwJLWjAeFw0yMzExMDkxMDE4NDBaFw0yNDEx\r\nMDgxMDE4NDBaMHkxHjAcBgNVBAMMFdCi0JXQodCi0J7QkiDQotCV0KHQojEVMBMG\r\nA1UEBAwM0KLQldCh0KLQntCSMRgwFgYDVQQFEw9JSU4xMjM0NTY3ODkwMTExCzAJ\r\nBgNVBAYTAktaMRkwFwYDVQQqDBDQotCV0KHQotCe0JLQmNCnMIGsMCMGCSqDDgMK\r\nAQECAjAWBgoqgw4DCgEBAgIBBggqgw4DCgEDAwOBhAAEgYDa/NKfEL8rvhXRv1DM\r\nn+vaYz0bGFs6ixgojRIEKcCjYht4DkcrPOGW3k+ER4YR1M3jCv1tb7FHi/EQFWoO\r\neIBhFHq6cJ/M6ZHLucyjnIDgk/C7zvbg5mXB7YIQGyYHK0DJF4K2HpFkzJ4DNMP9\r\nLprKgGYp9UCUIUH0FflwQlVXaqOCAcYwggHCMDgGA1UdIAQxMC8wLQYGKoMOAwMC\r\nMCMwIQYIKwYBBQUHAgEWFWh0dHA6Ly9wa2kuZ292Lmt6L2NwczB3BggrBgEFBQcB\r\nAQRrMGkwKAYIKwYBBQUHMAGGHGh0dHA6Ly90ZXN0LnBraS5nb3Yua3ovb2NzcC8w\r\nPQYIKwYBBQUHMAKGMWh0dHA6Ly90ZXN0LnBraS5nb3Yua3ovY2VydC9uY2FfZ29z\r\ndDIwMjJfdGVzdC5jZXIwQQYDVR0fBDowODA2oDSgMoYwaHR0cDovL3Rlc3QucGtp\r\nLmdvdi5rei9jcmwvbmNhX2dvc3QyMDIyX3Rlc3QuY3JsMEMGA1UdLgQ8MDowOKA2\r\noDSGMmh0dHA6Ly90ZXN0LnBraS5nb3Yua3ovY3JsL25jYV9nb3N0MjAyMl9kX3Rl\r\nc3QuY3JsMB0GA1UdJQQWMBQGCCsGAQUFBwMEBggqgw4DAwQBATAOBgNVHQ8BAf8E\r\nBAMCA8gwHQYDVR0OBBYEFIFHKHWC35u0cQ5GGASs1JuIv0XEMB8GA1UdIwQYMBaA\r\nFPrSSxujoMlh/hyoUD5qortFDbijMBYGBiqDDgMDBQQMMAoGCCqDDgMDBQEBMA4G\r\nCiqDDgMKAQECAwIFAAOBgQBpz+3kpvElKZfsyHVbOWqbzdS5jqIafZOucNNM3Sfq\r\ngW40FP2UXK9fofDBcXsrZxXQL8P9t3a+9OstVN2KV3rKpf7St/iYe0t9kCjZZi37\r\n0t7JtamkTZkaRrFcJLZ2L5tnDI+hXY2IDRAlGBAC24IPLstj6nJIE1S28F1ReBhz\r\nEzGCAeQwggHgAgEBMHUwXTFOMEwGA1UEAwxF0rDQm9Ci0KLQq9KaINCa0KPTmNCb\r\n0JDQndCU0KvQoNCj0KjQqyDQntCg0KLQkNCb0KvSmiAoR09TVCkgVEVTVCAyMDIy\r\nMQswCQYDVQQGEwJLWgIUEUcodYLfm7RxDkYYBKzUm4i/RcQwDAYIKoMOAwoBAwMF\r\nAKCBwjAYBgkqhkiG9w0BCQMxCwYJKoZIhvcNAQcBMBwGCSqGSIb3DQEJBTEPFw0y\r\nNDA3MjYxMjI5MDhaMDcGCyqGSIb3DQEJEAIvMSgwJjAkMCIEIBu6B9ZqO4PyIjmd\r\noiU5ELt4u2GOUY5aKzbbJgQh2nOTME8GCSqGSIb3DQEJBDFCBEALpvV1bZjCzTux\r\nqckeawqZzI0ORycoMDwLurelpiRj2b5SrTuk0gs3GDwm1rMz8CElaDrZ54ly79Wn\r\nd74u5tsBMA4GCiqDDgMKAQECAwIFAASBgP98kuuP1Hio+fl5wT2D3F6WLvoslV/9\r\nqRflfFpMGOm3GqKog+SQ9+1O0PblzeMGhyD+E3cZb2avExpIQ4gGAPEhrykZtg79\r\nFeteZhrJyQTJhmp2YNPhpItZ2hESlSBtuTNpO56AYE+yNDG6b58nlJNcuOdMZ2rZ\r\nJHJ30f8zkZ28\r\n";

            try {
                // Convert CMS data to binary
                const binaryString = atob(cmsData);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
        
                // Convert binary data to base64
                const base64String = this.arrayBufferToBase64(bytes);
        
                // Get the OData model
                const oModel = this.getOwnerComponent().getModel();
                const oActionDataContext = oModel.bindContext("/mergePDF(...)");
                oActionDataContext.setParameter("cmsData", base64String);
                
                oActionDataContext.execute().then(function(oResponse) {
                    debugger
                    var  oActionContext = oActionDataContext.getBoundContext()
                    var oObject=oActionContext.getObject().value
                    // Decode the base64 PDF data
                    const pdfBytes = atob(oObject);
                    const pdfArray = new Uint8Array(pdfBytes.length);
                    for (let i = 0; i < pdfBytes.length; i++) {
                        pdfArray[i] = pdfBytes.charCodeAt(i);
                    }
                    

                    
        
                    // Create a blob from the response
                    const pdfBlob = new Blob([pdfArray], { type: 'application/pdf' });
                    
        
                    // Create a link element
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(pdfBlob);
                    link.download = 'Signed.pdf';
        
                    // Append the link to the body and trigger a click
                    document.body.appendChild(link);
                    link.click();
        
                    // Remove the link from the body
                    document.body.removeChild(link);
                }).catch(function(error) {
                    console.error('Error executing action:', error);
                    alert('Failed to merge PDF.');
                });
            } catch (error) {
                console.error('Error processing CMS data:', error);
                alert('Failed to process CMS data.');
            }
        },
        
        // Utility function to convert ArrayBuffer to base64
        arrayBufferToBase64: function (buffer) {
            let binary = '';
            const bytes = new Uint8Array(buffer);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return window.btoa(binary);
        }
        

        });
    });