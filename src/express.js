var express = require("express");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

const fs = require("fs");

var app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  return next();
});
app.use(logger("dev"));
app.use(express.json());
// extended: true support qury post in body
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

const rateLimit = require("express-rate-limit");
const { AddWebsocket } = require("./websocket");
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  keyGenerator: (req, res) =>
    process.env.THROTTLE_HEADER
      ? req.header[process.env.THROTTLE_HEADER]
      : req.ip,
  statusCode: 200,
  headers: false,
  message: `{"err": "Too many requests, please wait a while"}`
});

//  apply to all requests
app.use(limiter);

app.get("/api/latest", (req, resp) => {
  resp.send(
    fs.readFileSync("/tmp/latest_img.json", {
      encoding: "ascii",
      flag: "r"
    })
  );
});

app.get("/api/", (req, resp) => {
  resp.send("my default API home");
});

module.exports = { app };
