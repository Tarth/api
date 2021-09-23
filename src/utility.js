const fs = require("fs");
const db = require("./queries");

//48Bytes

// class BaseResponse {
//   constructor(_isSuccess) {
//     this._isSuccess;
//   }
// }

// class ErrorResponse extends BaseResponse {
//   constructor(errorText, _isSuccess) {
//     super(_isSuccess);
//     _isSuccess = false;
//     return { isSuccess: _isSuccess, errorText: errorText };
//   }
// }
class BaseResponse {
  constructor(_isSuccess, _errorText) {
    this.isSuccess = _isSuccess;
    this.errorText = _errorText;

    return { isSuccess: this.isSuccess, errorText: this.errorText };
  }
}

class SuccessResponse extends BaseResponse {
  constructor(_isSuccess, _successText, _data) {
    super(_isSuccess, _errorText);
    this.data = _data;
    return { isSuccess: _isSuccess, successText: this.successText };
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
