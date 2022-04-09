const { app } = require("./src/express");
const { version } = require("./api/version");
const { AddWebsocket } = require("./src/websocket");

// This file is for codesandbox dev
// DO NOT CHANGE THIS FILE

if (process.env.VERCEL !== "1") {
  // only if not in vercel
  app.get("/api/health", (rq, rs) => {
    rs.send("API HEALTH [express] " + version);
  });

  app.get("/", (rq, rs) => {
    rs.send("Home [express] " + version);
  });

  var server = app.listen(8080, function () {
    console.log("Listening on port " + server.address().port);
  });

  AddWebsocket(server).then((e) => console.log("Websocket started"));
}
