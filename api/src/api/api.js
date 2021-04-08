const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const api = express().use(bodyParser.json(), cors());

api.use('/transcription', require('../routes/transcriptionRoutes'));
api.use('/user', require('../routes/userRoutes'));
api.use( (error, request, response, next) => {
    console.error(error.stack)
    response.status(500)
        .send('Internal Server Error, please check the log for further details.')
})

module.exports = api;
