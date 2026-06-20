
const authService = require('../services/auth.service');
const userModel = require('../models/user.model');
const ApiResponse = require('../utils/ApiResponse');

const register = async (req,res,next)=>{
try{
    const {name, email, password, role} = req.body;

    const user= await authService.registerUser(name, email, password, role);
    return res.status(201).json(
        new ApiResponse(
        201,
        user,
        "User Registered Successfully"
        )
    )
}catch(err){
    next(err);
}
}


const login = async (req,res,next)=>{
  try{
     const {email, password} = req.body;

   const result = await authService.loginUser(email, password);

   res.cookie(
      "accessToken",
      result.accessToken,
      {
        httpOnly:true,
        secure:false, // true in production HTTPS
        sameSite:"strict",
        maxAge:15 * 60 * 1000
      }
    );

    res.cookie(
      "refreshToken",
      result.refreshToken,
      {
        httpOnly:true,
        secure:false, // true in production HTTPS
        sameSite:"strict",
        maxAge:7 * 24 * 60 * 60 * 1000
      }
    );


   
   return res.status(200).json(
    new ApiResponse(
    200,
    result,
    "Login Successful"
    )
   )
  }catch(err){
    next(err)
  }
};

const refreshToken = async (req,res,next)=>{
   try{
      const {
         refreshToken
      } = req.body;

      const result =
         await authService
         .refreshAccessToken(
            refreshToken
         );


         res.cookie(
         "accessToken",
         result.accessToken,
         {
            httpOnly:true,
            secure:false,
            sameSite:"strict",
            maxAge:
              15 * 60 * 1000
         }
      );

      return res.status(200).json(
         new ApiResponse(
            200,
            result,
            "New Access Token Generated"
         )
      );

   }catch(err){
      next(err);
   }
};

const logout = async (req,res,next)=>{

   try{

      const refreshToken =
         req.cookies.refreshToken;

      await authService.logoutUser(
         refreshToken
      );

      res.clearCookie(
         "accessToken"
      );

      res.clearCookie(
         "refreshToken"
      );

      return res.status(200).json(
         new ApiResponse(
            200,
            {},
            "Logout Successful"
         )
      );

   }catch(err){

      next(err);

   }

};

const getMe =
 async(req,res,next)=>{

   try{

      const user =
         await userModel
         .findUserById(
            req.user.id
         );

         if(!user){
         throw new ApiError(
            404,
            "User not found"
         );
      }

      delete user.password_hash;

      return res.status(200).json(
         new ApiResponse(
            200,
            user,
            "Current User"
         )
      );

   }catch(err){

      next(err);

   }

};

module.exports = {
    register,
    login,
    refreshToken,
    logout,
    getMe
};