import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // file sirf multer se aati h agar file aarai h iseliye hi multer use hota h
    cb(null, "./public/temp"); //null part is for error handle so filal hame error handle nai karna eslye null krr diya h.// second parameter is the destination ja me apni files rakuga
  },
  filename: function (req, file, cb) {
    //   const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)//this is for agar hame file name change karna h unique rakna hai this is dependns upon us totally // isko advance kiya ja sakta h like unique id se raka jata h nano id's use kii jati h like numbers or char.., string // we are avoiding for now
    //   cb(null, file.fieldname + '-' + uniqueSuffix) //try karna h doc read karna h bhot kuch milegaa file ko console log karke dekna h
    cb(null, file.originalname);
  },
});

export const upload = multer({
  storage,
});
// isko pure ko middle ware me hi use karege.