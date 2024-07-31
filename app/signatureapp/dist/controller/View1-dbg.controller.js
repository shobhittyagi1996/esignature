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
    function (Controller, JSONModel, Item, MessageToast,WebSocket) {
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
                } else {
                    sBaseUrl = "https://ea036260trial.launchpad.cfapps.us10.hana.ondemand.com/b866c22b-35af-478a-85ee-05f8a1d64c9f.esignature.comkposignatureapp-0.0.1"; // Assuming relative URLs work for the deployed environment
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
                    url: this._baseUrl + item.getUrl(),
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
                    url: this._baseUrl + "/odata/v4/catalog/Files",
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
                var url = `${this._baseUrl}/odata/v4/catalog/Files(${id})/content`;
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
                                that.request(file,that)
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

                    webSocket.onopen = function () {
                        console.log("socket connection is opened [state = " + webSocket.readyState + "]: " + webSocket.url);
                        resolve(webSocket);
                    };

                    webSocket.onerror = function (err) {
                        // unblockScreen();
                        console.error("socket connection error : ", err);
                        reject(err);
                    };

                    webSocket.onclose = function (event) {
                        debugger
                        if (event.wasClean) {
                            console.error("socket connection is closed ");
                        } else {
                            console.log('Connection error');
                            openDialog();
                        }
                        console.log('Code: ' + event.code + ' Reason: ' + event.reason);
                    };
                });
            },

            request: async function (file,controller) {
                // blockScreen();
                this.getView().setBusy(true)




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
                        "signingParams": { decode},
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
                        webSocket.onmessage = ({ data }) => {
                            response = JSON.parse(data);
                            debugger
                            if (response != null) {
                                var responseStatus = response['status'];
                                if (responseStatus === true) {
                                    var responseBody = response['body'];
                                    if (responseBody != null) {
                                        // unblockScreen();
                                        if (responseBody.hasOwnProperty('result')) {
                                            var result = responseBody.result;
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
                        }
                    })
                })
                    .catch(function (err) {
                        // unblockScreen();
                        console.log(err)
                    });
            }


        });
    });