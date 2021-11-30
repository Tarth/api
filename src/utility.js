const fs = require("fs");
const db = require("./queries");

class BaseResponse {
  constructor(_data) {
    this.isSuccess = false;
    this.data = _data;
    return { isSuccess: this.isSuccess, data: this.data };
  }
}

class SuccessResponse extends BaseResponse {
  constructor(_data) {
    super(_data);
    this.isSuccess = true;
    this.data = _data;
    return { isSuccess: this.isSuccess, data: this.data };
  }
}

function parseJWT(token) {
  const base64Payload = token.split(".")[1];
  const payload = Buffer.from(base64Payload, "base64");
  return JSON.parse(payload.toString());
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
  userGroupEnum,
  getUserGroupNumber,
  getTokenFromReqHeader,
  BaseResponse,
  // ErrorResponse,
  SuccessResponse,
};
