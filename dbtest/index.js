import mongoose from 'mongoose'
import { logCall } from './model/Call.js';
import { returnCall } from './model/Call.js';

mongoose.connect("mongodb+srv://emailrpau:e58MqpSfT3UOBsBJ@cluster0.xkxfl.mongodb.net/myFirstDatabase?retryWrites=true&w=majority")
let check = logCall(2, 18002672001);
  // Find a single blog post

const callList = await returnCall(2);

console.log(callList[1]);
console.log(callList[1].sus);