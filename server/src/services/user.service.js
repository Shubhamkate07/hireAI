const userModel =
   require("../models/user.model");

const getUsers =
   async(query)=>{

      const page =
         parseInt(query.page) || 1;

      const limit =
         parseInt(query.limit) || 10;

      const recent =
         query.recent;

      const offset =
         (page - 1) * limit;

      const users =
         await userModel.getAllUsers(
            offset,
            limit,
            recent
         );

      const total =
         await userModel.getUserCount(
            recent
         );

      const totalPages =
         Math.ceil(
            total / limit
         );

      return {
         users,
         total,
         page,
         totalPages
      };

   };

module.exports = {
   getUsers
};