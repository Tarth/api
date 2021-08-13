require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const util = require("./utility");
const db = require("./queries");
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
  try {
    if (!req.body.hasOwnProperty("username") || !req.body.hasOwnProperty("password")) {
      return "missing mail/password";
    }
    const userData = await db.getUsers(null, null, "SELECT * FROM users ORDER BY name ASC");
    const user = userData.find((user) => user.username == req.body.username);
    if (user == undefined) {
      return "missing user";
    }
    if (await bcrypt.compare(req.body.password, user.password)) {
      return user;
    } else {
      return "wrong password";
    }
  } catch (e) {
    res.status(500).send(e);
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
  const query =
    "SELECT users.id, users.username, users.usergroup_id, usergroups.groupname AS usergroup FROM users INNER JOIN usergroups ON users.usergroup_id = usergroups.id ORDER BY users.id ASC";
  const users = await db.getUsers(null, null, query);
  const result = users.find((userElement) => userElement.username === tokenUser.username);
  const userGroup = result.usergroup_id;
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
