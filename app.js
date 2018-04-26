const reportData = require('index.js')
const Json2csvParser = require('json2csv').Parser;
const express = require('express')
const app = express()

app.post('/', (req, res) => res.send(reportData))
