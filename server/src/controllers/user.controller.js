const userService =
   require("../services/user.service");

const ApiResponse =
   require("../utils/ApiResponse");

const getUsers =
   async(req,res,next)=>{

      try{

         const result =
            await userService.getUsers(
               req.query
            );

         return res.status(200).json(
            new ApiResponse(
               200,
               result,
               "Users fetched successfully"
            )
         );

      }catch(err){

         next(err);

      }

   };

module.exports = {
   getUsers
};