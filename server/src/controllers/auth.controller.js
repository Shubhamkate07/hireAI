
const authService = require('../services/auth.service');
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

const refreshToken = (req,res)=>{
    res.json({
        message:"Refresh Token API"
    });
};

const logout = (req,res)=>{
    res.json({
        message:"Logout API"
    });
};

module.exports = {
    register,
    login,
    refreshToken,
    logout
};