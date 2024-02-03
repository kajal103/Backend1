import { asyncHandler } from "../utils/AsyncHandle.js";
import { ApiErr } from "../utils/ApiErr.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiRespons.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiErr(500, "Something went wrong while generating tokens !");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullname, email, username, password, phoneNumber } = req.body;
  //   console.log("email: ", email);
  // if (fullname === "") {
  //   throw new ApiErr(400,"Full Name is required");     // this is the one method but in this we have to make if else statement for all field name in simple we have some short method see below
  // }
  if (
    [fullname, email, username, password, phoneNumber].some(
      (field) => field?.trim() === ""
    ) // this method basicly do works easly .some() is an array method its checks any of the array elements pass the test or not
  ) {
    throw new ApiErr(400, "All field are required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiErr(409, "UserName and Email already exists");
  }
  // console.log(req.files);
  const avatarLocalPath = req.files?.avatar[0]?.path; //files come from multer [0] this 0 because hame chiye uski first property witch gives us object, if exist object gives path of data (image)
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  //this is the core javascript concept
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiErr(400, "Avatar files is required");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!avatar) {
    throw new ApiErr(400, "Avatar files is required");
  }

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    username: username.toLowerCase(),
    email,
    phoneNumber,
    coverImage: coverImage?.url || "", // this is the safty mesure and we need to understand (Imp)
    password,
  });
  const createuser = await User.findById(user._id).select(
    "-password -refreshToken" //ye method thoda weard h jaise edr jo hame nai chiye hota h vo hum likte h minus sign dalke
  );
  if (!createuser) {
    throw new ApiErr(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createuser, "User register Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // req body se data fetch -> data

  const { email, username, password } = req.body;
  // username or email kiseebe login karana apne upar h
  if (!email && !username) {
    throw new ApiErr(400, "username or email is required !!");
  }
  // Here is an alternative of above code based on logic discussed in video:
  // if (!(username || email)) {
  //     throw new ApiError(400, "username or email is required")

  // }
  // find the user database me exist karta h ya nai
  const user = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!user) {
    throw new ApiErr(404, "User does not exist");
  }
  // password check
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiErr(401, "Invalid User Credentials !!");
  }
  // access and refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
    user._id
  );
  //yaha hame apna sochna h ratna nai h ki database ko waps bulana expensive hoga ya nai, agr haa tho hum voi (object)user update kar dete ye pura hamare upr hai
  //ye optional step tha hame man tho aisa karo wrna dusra way me karo...
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  // send cookie
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accessToken, options) //key and then there value and option to make secure
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken, //ye bejna ek achi practice h
          refreshToken, //ye bejna ek achi practice h
        },
        "User logged In Successfully !!"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  //jaise hum access karte req.body ka tho kya yaha hamare pass access h req.user ji ha bikul hai because hamne middleware object create krr diya n usko user information be de di
  await User.findByIdAndUpdate(
    req.user._id, // perticular user ka sara data h tho hum fir usme se user ki _id  leke aa gaii //1.edrr user ko find krr liya
    {
      $set: {
        refreshToken: undefined, //2. edr batana padta h ki update karna kya h hame tho update me user ko delete karana h (logout) tho mongodb ka operator h usko use krrna padta h $set (abb ye set karta kya h hame ek object deta h and batata kya kya update karna h vo meko bata do vo vo values me ya vo vo fields me jake update karr duga ) tho muje tho ek hi field chiye tho me user model me jake refreshToke ko leke ata hu n usko karr do undefine
      },
    },
    // yaha ek instresting bat kya h yaha hum or field be add kar sakte h jaise yaha ek new value le sakte h jisko hum true kar sakte h tho isme kya hoga jo return me respons  usme new updated value milegi if old milegi tho kya hoga hamara refresh token be aa jayega but hame undefine wala chiye tho vo hame latest wala de dega new wala (new:true karnese)
    {
      new: true,
    } //abb (ek kam tho ho gaya)  yaha tak ho gaya refresh token tho database se gayab ho gaya abb cookies wala kam karna padega tho obivsly.. option ko lana padega kam same h option tho upr se copy paste karr lete h option ke andar cookies clear karni h tho vo( responsebej dete h) age krr dete h
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logout successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiErr(401, "Unauthorized request");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiErr(401, "Invalid refresh token");
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiErr(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };
    const { accessToken, newRefreshToken } =
      await generateAccessAndRefereshTokens(user._id);
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Access token refreshed successfully!"
        )
      );
  } catch (error) {
    throw new ApiErr(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, ConfirmPassword } = req.body;
  if (!(newPassword === ConfirmPassword)) {
    throw new ApiErr(400, "New Password And Confirm Password must be same!!");
  }
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiErr(400, "Invalid old password");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed Successfully !!"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  //get user data who is login
  return res
    .status(200)
    .json(
      new ApiResponse(200, req.user, "Current user fetched Successfully!!")
    );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  //generally if we want to update any file make seperate controller is good for production base
  const { fullname, email, phoneNumber } = req.body;
  if (!fullname || !email || !phoneNumber) {
    throw new ApiErr(400, "All Fields are required!!");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname: fullname, //kya h hum is subko aise be lik sakte h or normal fullname karke be lik sakte because es6 ke module h tho new way aisa lik sakte h
        email: email,
        phoneNumber: phoneNumber,
        /*
        fullname,
        email,
        phoneNumber
        */
      },
    },
    { new: true }
  ).select("-password"); //yaha hum dusre bar be backend hit kar sakte the and user._id findById karke .select method apply kar sakte the but hame yai dimag lagana h ki hum kaha database calls bachani h etc agar karna h tho hamare upr h hum kar sakte h
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account Updated successfully!!"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path; //hame iss time sirf file chiye naaki files or isme hum req.file?.path and fir usko optionaly rap kar dege ki agar apke pass file present h tho uski path de do
  if (!avatarLocalPath) {
    throw new ApiErr(400, "Avatar file is missing");
  }
  //TODO: delete old image- assignment

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiErr(400, "Error while uploading on avatar");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar Updated successfully!!"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path; //hame iss time sirf file chiye naaki files or isme hum req.file?.path and fir usko optionaly rap kar dege ki agar apke pass file present h tho uski path de do
  if (!coverImageLocalPath) {
    throw new ApiErr(400, "coverImage file is missing");
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new ApiErr(400, "Error while uploading on coverImage");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "coverImage Updated successfully!!"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiErr(400, "username is missing!!");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subcriptions",
        localField: "username", //from my here should be username and from lecture there is _id need to confirm
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subcriptions",
        localField: "username", //from my here should be username and from lecture there is _id need to confirm
        foreignField: "subscriber",
        as: "subscribedTO", //jisko mene subs karke raka h ye vo h
      },
    },
    {
      $addFields: {
        //HAMARE liye extra field add karke deta h jo hame chiye ho vaisi
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedTOCount: {
          $size: "$subscribedTO",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?.username, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        //ye basically hame jo jo bejna h sirf voi beje naki sab send na kare jo hame need nai h its takes extra space only
        fullname: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedTOCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);
  //That is, all values are truthy except false, 0, -0, 0n, "", null, undefined, NaN
  if (!channel?.length) {
    throw new ApiErr(404, "channel doed not exists!!");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched succesfully!!")//hum pura data be return kar skte h but hum iska sirf first object return kar dete h 0th value tho kya frontend wala thoda kush rehga ki sirf ek object aya h tho usmese data pic pic karke laga dega  
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
};

//******************* This are all steps for Login User *********************
// req body se data fetch -> data
// username or email kiseebe login karana apne upar h
// find the user database me exist karta h ya nai
// password check
// access and refresh token
// send cookie

//****************** mere side ka h
// get details like Email and password
// validate - not empty and password or email is correct or not if yes then login user

//**********************this are all steps for registration***********************
// get user details from frontend
// validation - not empty
// check if user already exists: username & email
// check for images, check for avatar
// upload them to cloudinary if image available,avatar check
// create user object - creation,create entry in database
// remove password and refresh token field from response
// check for user creation or not
// return response
// comsole.log and see all data of cloudinary how its comming and hole data also study deep by own
