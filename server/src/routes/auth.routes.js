const express = require("express");

const authController =
 require("../controllers/auth.controller");

const authMiddleware =
 require("../middleware/auth.middleware");

const authLimiter =
   require(
      "../middleware/rateLimit.middleware"
   );

   
   const router = express.Router();
   
   router.use(authLimiter);
   
router.post(
    "/register",
    authController.register
);

router.post(
    "/login",
    authController.login
);

// apply for specific route 

// router.post(
//    "/login",
//    authLimiter,
//    authController.login
// );

router.post(
    "/refresh-token",
    authController.refreshToken
);

router.post(
    "/logout",
    authController.logout
);

router.get(
   "/me",
   authMiddleware,
   authController.getMe
);



module.exports = router;