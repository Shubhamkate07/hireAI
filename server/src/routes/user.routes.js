const express =
   require("express");

const router =
   express.Router();

const authMiddleware =
   require(
      "../middleware/auth.middleware"
   );

const rbacMiddleware =
   require(
      "../middleware/rbac.middleware"
   );

const userController =
   require(
      "../controllers/user.controller"
   );

router.get(
   "/",
   authMiddleware,
   rbacMiddleware(
      ["admin"]
   ),
   userController.getUsers
);

module.exports = router;