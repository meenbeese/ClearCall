import mongoose from 'mongoose';
import { readFileSync } from 'fs';
const { Schema, model } = mongoose;

const callSchema = new Schema({
  transcript: {
    type: String,
    required: true,
  },
  llmoutput: {
    type: String,
    required: true,
  },
  logdate: {
    type: Date,
    default: () => Date.now(),
    immutable: true,
  },
  sus: {
    type: Boolean,
    required: true,
  },
  userid: {
    type: Number,
    required: true,
  },
  phonenumber: {
    type: Number,
    required: true,
    immutable: true,
  }
});

export async function logCall(currentUserId, phoneNumber){
  var suspicious = true;
  const transcontent = readFileSync('./transcript.txt').toString();
  const llmcontent = readFileSync('./llmoutput.txt').toString();
  if (llmcontent === ""){
    suspicious = false;
  }


  // Create a new blog post object
  const article = new Call({
      transcript: transcontent,
      llmoutput: llmcontent,
      sus: suspicious,
      userid: currentUserId,
      phonenumber: phoneNumber,
  });
  // Insert the article in our MongoDB database
  await article.save();
  return true;
}

export async function returnCall(currentUserId){
  const calls = await Call.find({});
  return calls;
}

const Call = model('Call', callSchema);
export default Call;