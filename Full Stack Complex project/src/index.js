// require('dotenv').config({path:'./env'})  //this is the first way we can do but its not an right practice to change our way

import dotenv from "dotenv";
import connectDB from "./db/db_index.js";
import { app } from "./app.js";

dotenv.config({
  path:'./.env',
})
connectDB()
  .then(()=>{
    app.listen(process.env.PORT || 8000,(req,res)=>{
      console.log(`Server in running at ${process.env.PORT}`);
    })
  })
  .catch((err) => {
    console.log("MogoDB connection failed !!!", err);
  });























/*
import express from "express";
const app = express();

(async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    app.on("error", (error) => {
      console.log("Error: ", error);
      throw error;
    });
    app.listen(process.env.PORT,()=>{
        console.log(`App is running on port: ${process.env.PORT}`)
    })
  } catch (error) {
    console.error("ERROR: ", error);
    throw err;
  }
})();
*/

// This is the First approach which is in one folder only
