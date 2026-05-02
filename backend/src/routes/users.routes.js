/*This file decides which controller function should handle which request*/
/* in this file our handler gets the req and res objects from the express */
/* The routes file defines API endpoints using Express Router and connects them to controller functions, which are executed with req and res automatically passed by Express. */
import { Router } from "express";
/*“Bring the Router function from Express into this file so I can use it.”*/
/* Router() lets you create modular routes */
/*You created a separate module for user-related routes Instead of mixing everything together */
import {
  addToHistory,
  getUserHistory,
  login,
  register,
} from "../controllers/user.controller.js";

const router = Router();
/*Now router becomes a mini Express app used only for handling routes.*/
/*Router() returns a router object (mini Express application)*/
/*router.route("/path") returns a route object, which lets you chain methods like ".post()
" */
/*router.route(path) is used to define multiple HTTP methods (GET, POST, etc.) for the same route in a clean, chained way*/

router.route("/login").post(login); /* URL: "/login" Method: "post"
Handler: "login" */
/*.route() helps when multiple methods share the same path: */
/*router
  .route("/profile")
  .get(getProfile)
  .post(updateProfile)
  .delete(deleteProfile); */
router.route("/register").post(register);
router.route("/add_to_activity").post(addToHistory);
router.route("/get_all_activity").get(getUserHistory);
export default router;
