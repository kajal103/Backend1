import { ApiErr } from "../utils/ApiErr.js";
import { asyncHandler } from "../utils/AsyncHandle.js";
import { User } from "../models/user.models.js";
import jwt from "jsonwebtoken";
export const verifyJwt = asyncHandler(async (req, _, next) => {
  //Go to postman and there is the fild of Authorization in header part so we can find that n it gives value "Bearer " and one space
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", ""); //mobile application wala example usme  cookies nai ate tho access token nai ata h esliye usko optional raka h and or me header bej rai h
    // console.log(token);
    if (!token) {
      throw new ApiErr(401, "Unauthorized request!!");
    }
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET); //decode all data hear
    const user = await User.findById(decodedToken?._id).select(
      //agr hamare pass decoded token h tho optionally hum isko unrap karr dete h fir yaha par hame _id mill jayega because( model jab banaya tha tho udr hamne yai dala tha)model me _id hi send kiya token me
      "-password -refreshToken"
    ); // ye wale _id isliye like because hamne user.modules me generateAccessToken me "_id" ka refrence diye h hum
    if (!user) {
      //Todo: discuss about frontend
      throw new ApiErr(401, "Invalid access token");
    }
    //user n all mill gaya tho kya kar do edr ek req.user add krr do or (=user) ko jo information h vo object me add kar do
    // yaha confirm ho gaya ki access h hi user ka
    req.user = user; //hear comes an instresting part, we have access of req(request) ka tho hum kya karege  iss req ke andar new object create kar dete h req.Any_name=user (user ka access de dete h yaha) and finally yaha kam ho gaya h tho hum next() kar dete h
    next();// its mandatory because agar ye run hoo gaya tho eske age karna kya vo kase pata chalega router ko tho hamne bol diya next()abb age jao tho fir vo logout run karega middleware ke bad next is compulsory//
  } catch (error) {
    throw new ApiErr(401, error?.message || "Invalid access token");
  }
});

//req ke pass cookie ka access h kaise aya hamne tho tho diya usko middle ware karke
