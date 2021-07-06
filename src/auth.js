require("dotenv").config();
const userData = require("../users.json");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const util = require("./utility");
const expiresTime = "15000m";

function authenticateAccessToken(req, res, next) {
  const token = util.getTokenFromReqHeader(req);
  if (token == null) {
    return res.status(401).json("missing token");
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.status(403).json("invalid token");
    req.user = user;
    next();
  });
}

function generateAccessToken(user) {
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: expiresTime,
  });
}

async function authenticateUser(req, res) {
  if (
    !req.body.hasOwnProperty("username") ||
    !req.body.hasOwnProperty("password")
  ) {
    return "missing mail/password";
  }
  const user = userData.find((user) => user.username == req.body.username);
  if (user == undefined) {
    return "missing user";
  }
  try {
    if (await bcrypt.compare(req.body.password, user.password)) {
      return user;
    } else {
      return "wrong password";
    }
  } catch {
    res.status(500).send();
  }
}

async function groupPermissions(req, res, next, minAccessLevel) {
  if (!util.userGroupEnum().hasOwnProperty(minAccessLevel)) {
    res.status(400).send("Incorrect/missing access level");
    return;
  }
  const token = util.getTokenFromReqHeader(req);
  const tokenUser = util.parseJWT(token);
  const accessLevel = util.getUserGroupNumber(minAccessLevel);
  const users = await util.readJSON("users.json");

  const result = users.find(
    (userElement) => userElement.username === tokenUser.username
  );
  const userGroup = util.getUserGroupNumber(result.usergroup);
  if (accessLevel == undefined) {
    res.status(400).send("Bad request");
  } else if (userGroup > accessLevel) {
    res.status(401).send("User doesn't have sufficient permissions");
  } else {
    next();
  }
}

module.exports = {
  authenticateAccessToken,
  authenticateUser,
  generateAccessToken,
  groupPermissions,
};
