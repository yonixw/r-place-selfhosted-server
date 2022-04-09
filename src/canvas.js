const fs = require("fs");

const wsMsgCodes = {
  TOO_SOON: 0,
  SET_COLOR: 1,
  FULL_IMAGE: 2
};

function encodeColors(code, x, y, color) {
  const encoded = [
    (color << 2) + (x >> 8),
    x & 255,
    y >> 2,
    ((y & 3) << 6) + code
  ];

  return new Uint8Array(encoded);
}

function parseMsg(m = new Uint8Array([])) {
  let data = { code: -1, x: -1, y: -1, color: -1 };
  if (m.length !== 1 && m.length !== 4) {
    // Do nothing, return initial -1
  } else if (m.length === 1) {
    data.code = m[0] & 63;
  } else if (m.length === 4) {
    let parsed = [
      m[0] >> 2,
      ((m[0] & 3) << 8) + m[1],
      (m[2] << 2) + (m[3] >> 6),
      m[3] & 63
    ];
    data.color = parsed[0];
    data.x = parsed[1];
    data.y = parsed[2];
    data.code = parsed[3];
  }
  return data;
}

const W = 1024;

const ZIP_INTERVAL = 10 * 1000;
const SAVE_INTERVAL = 60 * 1000;

let imgData = new Array(W * W).fill(20);
let zippedImage = [];
let zippedJSON = JSON.stringify(zippedImage);

try {
  // Load from disk
  let startUnzip = Date.now();
  zippedJSON = fs.readFileSync("/tmp/latest_img.json", {
    encoding: "ascii",
    flag: "r"
  });
  zippedImage = JSON.parse(zippedJSON);
  imgData = unzipImageBuffer(zippedImage);
  console.log("Un-Zipped Image, Time (s): ", (Date.now() - startUnzip) / 1000);
} catch (err) {
  console.error(err);
}

function _4colors_to3bytes(arr, i) {
  let result = [
    (arr[i] << 2) + (arr[i + 1] >> 4),
    ((arr[i + 1] & 15) << 4) + (arr[i + 2] >> 2),
    ((arr[i + 2] & 3) << 6) + (arr[i + 3] & 63)
  ];
  return result;
}

function _3bytes_to4colors(arr, i) {
  let result = [
    arr[i] >> 2,
    ((arr[i] & 3) << 4) + (arr[i + 1] >> 4),
    ((arr[i + 1] & 15) << 2) + (arr[i + 2] >> 6),
    arr[i + 2] & 63
  ];
  return result;
}

function zipImage(arr, w) {
  const count = Math.ceil((w * w) / 4);
  let result = new Array(count * 3).fill(0);
  for (let i = 0; i < count; i++) {
    let small = _4colors_to3bytes(arr, i * 4);
    for (let j = 0; j < 3; j++) {
      result[i * 3 + j] = small[j];
    }
  }
  return result;
}

function unzipImageBuffer(arr) {
  const count = Math.ceil(arr.length / 3);
  let result = new Array(count * 4).fill(0);
  for (let i = 0; i < count; i++) {
    let bigagain = _3bytes_to4colors(arr, i * 3);
    for (let j = 0; j < 4; j++) {
      result[i * 4 + j] = bigagain[j];
    }
  }
  return result;
}

function refreshZipped() {
  let start = Date.now();
  zippedImage = zipImage(imgData, W);
  zippedJSON = JSON.stringify(zippedImage);
  console.log("Zipped Image, Time (s): ", (Date.now() - start) / 1000);
}


setTimeout(
()=> {
    setInterval(() => {
      refreshZipped();
    }, ZIP_INTERVAL);
}
,1000*((60-(new Date()).getSeconds())%10-1)) // wait for last second each 10 sec

refreshZipped();

function getImage() {
  return zippedImage;
}

function saveToDisk() {
  fs.writeFile("/tmp/latest_img.json", zippedJSON, (err) => {
    if (err) {
      console.error(err);
    } else {
      
      if ((new Date()).getMinutes() % 10 == 0) {
          let dd = new Date().toISOString().replace(/:|\./g, "-");
          fs.writeFile("/tmp/" + dd + "_img.json", zippedJSON, (err) => {
            if (err) console.error(err);
            else console.log("Saved to Disk + 10 min");
          });
      }
      else {
          console.log("Saved to Disk, skipped 10 minute");
      }
      
    }
  });
}

setInterval(() => {
  saveToDisk();
}, SAVE_INTERVAL);

function onColorSet(wss, parsedMsg, originalMsg) {
  if (parsedMsg.color < 0 || parsedMsg.color > 23) {
      return;
  }
  imgData[parsedMsg.y * W + parsedMsg.x] = parsedMsg.color;
  wss.clients.forEach((ws) => {
    try {
      ws.send(originalMsg);
    } catch (error) {}
  });
}

function sendFull(ws) {
  ws.send(zippedImage);
}

module.exports = {
  onColorSet,
  parseMsg,
  encodeColors,
  wsMsgCodes,
  getImage,
  sendFull
};
