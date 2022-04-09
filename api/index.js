const { app } = require("../src/express");
const { version } = require("./version");

// This file is for VERCEL
// DO NOT CHANGE THIS FILE

if (process.env.VERCEL === "1") {
  app.get("/api/health", (rq, rs) => {
    rs.send("API HEALTH  [VERCEL] " + version);
  });

  module.exports = app;
}
