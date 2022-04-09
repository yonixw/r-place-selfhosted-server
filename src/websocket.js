const WebSocket = require("ws");
const queryString = require("query-string");
const { onColorSet, parseMsg, wsMsgCodes, sendFull } = require("./canvas");

// https://cheatcode.co/tutorials/how-to-set-up-a-websocket-server-with-node-js-and-express

//https://websocketking.com/

const MAX_PLAY_TIME = 1000 * 60 * 5; // 5 minutes
const THROTTLE = 1000 * 1; // Time between sends
const ERROR_CODES = {
  PLAYTIME_END: 4000,
  NOT_HUMAN: 4001,
  TOO_FAST: 4002
};

const AddWebsocket = async (expressServer) => {
  const websocketServer = new WebSocket.Server({
    noServer: true,
    path: "/websockets",
    perMessageDeflate: false,
    clientTracking: true
  });

  expressServer.on("upgrade", (request, socket, head) => {
    websocketServer.handleUpgrade(request, socket, head, (websocket) => {
      websocketServer.emit("connection", websocket, request);
    });
  });

  websocketServer.on("connection", function connection(
    websocketConnection,
    connectionRequest
  ) {
    const [_path, params] = connectionRequest?.url?.split("?");
    const connectionParams = queryString.parse(params);

    // NOTE: connectParams are not used here but good to understand how to get
    // to them if you need to pass data with the connection to identify it (e.g., a userId).
    console.log(
      JSON.stringify({
        count: websocketServer.clients.size,
        _path,
        connectionParams
      })
    );

    let lastMessageTime = Date.now() - THROTTLE - 1;

    if (
      !connectionParams ||
      connectionParams["captcha"] !== "0" ||
      !connectionParams["nick"] ||
      connectionParams["captcha"].length < 1
    ) {
      websocketConnection.close(ERROR_CODES.NOT_HUMAN, "Not human");
      return;
    } else {
      setTimeout(() => {
        websocketConnection.close(ERROR_CODES.PLAYTIME_END, "Playtime end");
      }, MAX_PLAY_TIME);

      websocketConnection.on("message", (message) => {
        try {
           if (Date.now() - lastMessageTime < THROTTLE) {
            websocketConnection.send([0]);
            return;
          }
          lastMessageTime = Date.now(); 

          const data = parseMsg(message);
          console.log(data);
          if (data.code === wsMsgCodes.SET_COLOR) {
            onColorSet(websocketServer, data, message);
          }
          if (data.code === wsMsgCodes.FULL_IMAGE) {
            sendFull(websocketConnection);
          }
          // Message is Buffer object
          //const parsedMessage = message.toString("ascii");
          //onColorSet
        } catch (error) {
          console.error("Handle socket", error);
          try {
            websocketConnection.close();
          } catch (error) {
            console.error("Close socket", error);
          }
        }
      });
    }
  });

  return websocketServer;
};

module.exports = { AddWebsocket };
