// Import required modules
const cds = require('@sap/cds');
const cors = require('cors');

// Bootstrap CDS server
cds.on('bootstrap', app => {
    // Use CORS middleware
    app.use(cors({
        origin: '*', // Allow all origins
        methods: 'GET, POST, PUT, DELETE, OPTIONS',
        allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    }));
});

// Start CDS server
module.exports = cds.server;
