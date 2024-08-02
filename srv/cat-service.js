const cds = require('@sap/cds');
const { PDFDocument, rgb } = require('pdf-lib');
const { Crypto } = require('@peculiar/webcrypto');
const asn1js = require('asn1js');
const pkijs = require('pkijs');
const QRCode = require('qrcode');

// Set up the Web Crypto API polyfill
const crypto = new Crypto();
pkijs.setEngine('nodeEngine', crypto, new pkijs.CryptoEngine({ name: 'nodeEngine', crypto, subtle: crypto.subtle }));

module.exports = cds.service.impl(async function () {
    this.on('mergePDF', async (req) => {
        const { cmsData } = req.data;
        console.log(cmsData);

        // Convert base64 string to Uint8Array
        const binaryString = Buffer.from(cmsData, 'base64').toString('binary');
        const cmsBytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            cmsBytes[i] = binaryString.charCodeAt(i);
        }

        // Load initial PDF
        const pdfDoc = await PDFDocument.load(cmsBytes);

        // Extract signer info
        // let content ='ҰЛТТЫҚ КУӘЛАНДЫРУШЫ ОРТАЛЫҚ (GOST) TEST 2022, 2.5.4.6: KZ'

        let content = extractSignerInfo(cmsData);
        console.log("Received content", content);

        // Generate QR code
        const qrCodeData = await QRCode.toBuffer(content); // Generate QR code as PNG buffer

        // Create a new page for content and QR code
        const page = pdfDoc.addPage([600, 300]);

        // Add content to page
        page.drawText(content.split("\n")[0], {
            x: 20,
            y: 250,
            size: 10,
            color: rgb(0, 0, 0),
        });

        // Add QR code to page
        const qrImage = await pdfDoc.embedPng(qrCodeData);
        const qrDimensions = qrImage.scale(0.5); // Scale QR code to fit

        page.drawImage(qrImage, {
            x: 400,
            y: 100,
            width: qrDimensions.width,
            height: qrDimensions.height,
        });

        // Serialize the PDFDocument to bytes (a Uint8Array)
        const pdfBytes = await pdfDoc.save();

        // Convert to base64
        const base64String = arrayBufferToBase64(pdfBytes);
        console.log("This is base 64", base64String);

        return base64String;
    });

    this.before('CREATE', 'Files', req => {
        console.log('Create called');
        console.log(JSON.stringify(req.data));

        const baseUrl = determineBaseUrl(req);
        req.data.url = `${baseUrl}/odata/v4/catalog/Files(${req.data.ID})/content`;
    });

    this.before('READ', 'Files', req => {
        console.log('content-type: ', req.headers['content-type']);
    });

    this.after('READ', 'Files', (each) => {
        if (each) {
            each.headers = each.headers || {};
            each.headers['Access-Control-Allow-Origin'] = '*'; // Allow all origins
        }
    });

    this.on('CREATE', 'Files', (req, next) => {
        req.headers = req.headers || {};
        req.headers['Access-Control-Allow-Origin'] = '*'; // Allow all origins
        return next();
    });
});

// Helper function to determine base URL
function determineBaseUrl(req) {
    let baseUrl = "https://port4004-workspaces-ws-nvvxp.us10.trial.applicationstudio.cloud.sap";
    if (req.headers.host && req.headers.host.includes("hana.ondemand.com")) {
        baseUrl = "https://ea036260trial.launchpad.cfapps.us10.hana.ondemand.com/b866c22b-35af-478a-85ee-05f8a1d64c9f.esignature.comkposignatureapp-0.0.1";
    }
    return baseUrl;
}

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return Buffer.from(binary, 'binary').toString('base64');
}

function extractSignerInfo(cmsData) {
    let cmsArrayBuffer;

    if (Buffer.isBuffer(cmsData)) {
        cmsArrayBuffer = cmsData.buffer.slice(cmsData.byteOffset, cmsData.byteOffset + cmsData.byteLength);
    } else if (typeof cmsData === 'string') {
        const isBase64 = /^[A-Za-z0-9+/=]+$/.test(cmsData);
        const isHex = /^[A-Fa-f0-9]+$/.test(cmsData);

        if (isBase64) {
            cmsArrayBuffer = Buffer.from(cmsData, 'base64').buffer;
        } else if (isHex) {
            cmsArrayBuffer = Buffer.from(cmsData, 'hex').buffer;
        } else {
            throw new Error('Unsupported data format. Please provide base64 or hex encoded CMS data.');
        }
    } else {
        throw new Error('Unsupported data type for CMS content.');
    }

    const asn1 = asn1js.fromBER(cmsArrayBuffer);
    if (asn1.offset === -1) {
        throw new Error('Error decoding ASN.1 data');
    }

    const cmsContent = new pkijs.ContentInfo({ schema: asn1.result });
    const signedData = new pkijs.SignedData({ schema: cmsContent.content });

    let content = '';

    if (signedData.signerInfos.length > 0) {
        console.log('Number of signers:', signedData.signerInfos.length);

        for (const signerInfo of signedData.signerInfos) {
            const issuer = signerInfo.sid.issuer;
            const serialNumber = signerInfo.sid.serialNumber.valueBlock.valueHex;

            const issuerSign = issuer.typesAndValues.map(attr => `${attr.type}: ${attr.value.valueBlock.value}`).join(', ');
            const serialNumberOfSign = Buffer.from(serialNumber).toString('hex');

            console.log('  Issuer:', issuerSign);
            console.log('  Serial Number:', serialNumberOfSign);

            const signerCertificate = signedData.certificates.find(cert => {
                return (
                    cert.issuer.isEqual(signerInfo.sid.issuer) &&
                    cert.serialNumber.isEqual(signerInfo.sid.serialNumber)
                );
            });

            if (signerCertificate) {
                const signerCertificateSubject = signerCertificate.subject.typesAndValues.map(attr => `${attr.type}: ${attr.value.valueBlock.value}`).join(', ');
                // content += `Serial Number: ${serialNumberOfSign}\n`;
                content += `Serial Number: ${serialNumberOfSign}\n Issuer Sign: ${issuerSign}\n Signer Certificate: ${signerCertificateSubject} `;

            }
        }
    } else {
        console.log('No signers found in the CMS data.');
        content = 'No signer information extracted.';
    }

    return content;
}
