const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userid: { type: String, required: true },
  userpw: { type: String, required: true },
  username: { type: String, required: true },
  mobile: { type: String, required: true },
  brandname: { type: String, required: true },
}, { collection: 'user' });  // 컬렉션 이름을 명시적으로 지정

const User = mongoose.model('User', userSchema);

module.exports = User;
