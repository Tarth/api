const fs = require("fs");

function parseJWT(token) {
  const base64Payload = token.split(".")[1];
  const payload = Buffer.from(base64Payload, "base64");
  return JSON.parse(payload.toString());
}

async function readJSON(filename) {
  try {
    let rawdata = fs.readFileSync(filename);
    let parsedData = JSON.parse(rawdata);
    return parsedData;
  } catch (e) {
    return e;
  }
}

async function writeJSON(userData, filename, replaceOrExtend) {
  try {
    let userDataToJSON = null;
    if (
      replaceOrExtend == undefined ||
      filename == undefined ||
      userData == undefined
    ) {
      return "undefined arg";
    }
    if (replaceOrExtend === "extend") {
      let userDataArray = await readJSON(filename);
      userDataToJSON = [...userDataArray, userData];
    } else {
      userDataToJSON = userData;
    }

    let data = JSON.stringify(userDataToJSON, null, 2);
    fs.writeFile(filename, data, (err) => {
      if (err) throw err;
      console.log("The file has been saved");
    });
  } catch (err) {
    throw err;
  }
}

async function replaceActiveRefreshToken(activeToken) {
  const filename = "refreshtokens.json";
  const tokens = await readJSON(filename); // tokens: []
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

function userGroupEnum() {
  const userGroups = {
    winotoadmin: 1,
    planner: 2,
    worker: 3,
  };
  return Object.freeze(userGroups);
}

function getUserGroupNumber(usergroup) {
  const _userGroupEnum = userGroupEnum();
  if (_userGroupEnum.hasOwnProperty(usergroup)) {
    return _userGroupEnum[usergroup];
  }
}

function getTokenFromReqHeader(req) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  return token;
}

module.exports = {
  parseJWT,
  readJSON,
  writeJSON,
  replaceActiveRefreshToken,
  userGroupEnum,
  getUserGroupNumber,
  getTokenFromReqHeader,
};
