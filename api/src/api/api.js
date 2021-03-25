const express = require('express');
const cors = require('cors');
const xray = require('aws-xray-sdk');
const bodyParser = require('body-parser');
const api = express().use(bodyParser.json(), cors());
const applicationName = process.env.APPLICATION_NAME || 'data-management-checklist';
api.use(xray.express.openSegment(applicationName));

api.use('/transcription', require('../routes/transcriptionRoutes'));
api.use( (err, req, res, next) => {
    console.error(err.stack)
    res.status(500)
        .send('Internal Server Error, please check the log for further details.')
})
api.use(xray.express.closeSegment());

module.exports = api;
