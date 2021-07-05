require("dotenv").config();
const userData = require("../users.json");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const util = require("./utility");
const expiresTime = "15000m";

function authenticateAccessToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
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

function groupPermissions(req, res, next, minAccessLevel) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  const user = util.parseJWT(token);
  const accessLevel = util.getUserGroupNumber(minAccessLevel);
  const userGroup = util.getUserGroupNumber(user.usergroup);

  if (userGroup > accessLevel) {
    console.log("User not allowed");
  } else {
    console.log("Correct Permissions");
  }

  res.send();
}

module.exports = {
  authenticateAccessToken,
  authenticateUser,
  generateAccessToken,
  groupPermissions,
};
