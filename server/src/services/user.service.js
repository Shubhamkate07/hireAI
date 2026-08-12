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

      // Defence-in-depth: ensure password_hash never reaches the API response
      // even if the SQL query is ever widened to SELECT *.
      const safeUsers = users.map(u => {
         const { password_hash, ...safe } = u;
         return safe;
      });

      const total =
         await userModel.getUserCount(
            recent
         );

      const totalPages =
         Math.ceil(
            total / limit
         );

      return {
         users: safeUsers,
         total,
         page,
         totalPages
      };

   };

module.exports = {
   getUsers
};