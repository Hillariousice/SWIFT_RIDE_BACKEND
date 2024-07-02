import express, {Request, Response} from 'express';
// import { orderRide } from '../controller/orderController';
import { UpdateUserProfile, Login, VerifyUser, ResendOTP , forgotPassword, resetPasswordGet, resetPasswordPost, getMyCompletedOrders, orderRide, Signup, getMyOrders } from "../controller/userController";
import { auth } from '../middleware/authorization';



const router = express.Router();

router.post('/signup', Signup)
router.patch("/updateUserProfile/:id", auth, UpdateUserProfile);
router.post('/login', Login)
router.post('/verify/:signature', VerifyUser)
router.get('/resend-otp/:signature', ResendOTP)

//routes for reset user password 
router.post('/forgotpasswordd', forgotPassword)
router.get("/resetpasswordd/:token", resetPasswordGet)
router.post("/resetpasswordd/:token", resetPasswordPost)

//
router.post("/order-ride/", auth, orderRide);
router.get("/completed-orders", auth, getMyCompletedOrders);
router.get("/my-orders", auth, getMyOrders);


export default router;