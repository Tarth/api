require("dotenv").config();
const userData = require("../users.json");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

function generateAccessToken(user) {
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "45s" });
}

async function authenticateUser(req, res) {
  if (
    !req.body.hasOwnProperty("mail") ||
    !req.body.hasOwnProperty("password")
  ) {
    return "missing mail/password";
  }
  const user = userData.find((user) => user.mail == req.body.mail);
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

module.exports = {
  authenticateToken,
  authenticateUser,
  generateAccessToken,
};
