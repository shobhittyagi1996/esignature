const cds = require('@sap/cds');
const { PDFDocument } = require('pdf-lib');

module.exports = cds.service.impl(async function() {
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
        const content = "Signature Verification Result = Successfully \n IIN = 123456789011 \n Certificate Number = 1147287582df9bb4710e461804acd49b88bf45c4 \n Name = KPO"

        // Create a new page
        const page = pdfDoc.addPage([600, 300]);
        page.drawText(content, {
            x: 20,
            y: 250,
            size: 10,
        });

        // Serialize the PDFDocument to bytes (a Uint8Array)
        const pdfBytes = await pdfDoc.save();

        // Convert to base64
        const base64String = arrayBufferToBase64(pdfBytes);
        console.log("This is base 64",base64String);

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
