import mongoose from 'mongoose'
import { logCall } from './model/Call.js';
import { returnCall } from './model/Call.js';
import 'dotenv/config';

const srv = process.env.MONGO_SRV

mongoose.connect(`${process.env.MONGO_SRV}`)
let check = logCall(2, 18002672001);
  // Find a single blog post

const callList = await returnCall(2);

console.log(callList[1]);
console.log(callList[1].sus);