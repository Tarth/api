const fs = require("fs");

function parseJWT(token) {
  var base64Payload = token.split(".")[1];
  var payload = Buffer.from(base64Payload, "base64");
  return JSON.parse(payload.toString());
}

function readJSON(filename) {
  let rawdata = fs.readFileSync(filename);
  let parsedData = JSON.parse(rawdata);
  return parsedData;
}

function writeJSON(userData, filename) {
  let userDataArray = readJSON(filename);
  const newArray = [...userDataArray, userData];
  let data = JSON.stringify(newArray, null, 2);
  fs.writeFileSync(filename, data);
}

function replaceActiveRefreshToken(activeToken) {
  const filename = "refreshtokens.json";
  const tokens = readJSON(filename); // tokens: []
  const decodedActiveToken = parseJWT(activeToken);
  let newArray = [];

  if (tokens.length == 0) {
    newArray = [...tokens, activeToken];
  } else {
    for (const token of tokens) {
      const decodeOldToken = parseJWT(token);
      if (decodedActiveToken.name === decodeOldToken.name) {
        newArray.push(activeToken);
      } else {
        newArray.push(token);
      }
    }
  }
  fs.writeFileSync(filename, JSON.stringify(newArray, null, 2));
}

module.exports = {
  parseJWT,
  readJSON,
  writeJSON,
  replaceActiveRefreshToken,
};
