import express, {Request, Response} from 'express'
import { UserAttribute, UserInstance } from '../models/userModel';
import { GeneratePassword, GenerateSalt, registerSchema , GenerateSignature, option, editProfileSchema, validatePassword, loginSchema, verifySignature, forgotPasswordSchema, resetPasswordSchema, orderRideSchema} from "../utils/validation";
import {  onRequestOTP , GenerateOTP, emailHtml, mailSent, mailSent2, emailHtml2} from "../utils/notification";
import bcrypt from 'bcrypt'
import {v4 as uuidv4} from 'uuid'
import jwt, { JwtPayload } from 'jsonwebtoken';
import { APP_SECRET, Base_Url, FromAdminMail, userSubject } from '../config';
import { RiderAttributes, RiderInstance } from '../models/riderModel';
import { OrderAttribute, OrderInstance } from '../models/orderModel';


export const Signup = async (req: Request, res: Response) => {
    try {
      console.log('req.body', req.body)
      const { name, phone, email, password, confirm_password} = req.body; 
    //   if(!name || !phoneNumber || !email || !password){
    //     return res.status(400).json({Error: "fill all the required fields"});
    //   }
      const uuiduser = uuidv4();
      console.log('we got to this point', uuiduser)
      const validateResult = registerSchema.validate(req.body);
      if (validateResult.error) {
        console.log('we got to this point', validateResult.error)
        return res.status(400).json({
          Error: validateResult.error.details[0].message,
         
        });
      }
      console.log('we got to this point', validateResult)
      //Generate salt
  
      const salt = await GenerateSalt();
      const userPassword = (await GeneratePassword(password, salt)) as string;
  
      const { otp, expiry } = GenerateOTP();
      const User = await UserInstance.findOne({ where: { email:email } });
      const userPhone = await UserInstance.findOne({
        where: { phone: phone}
      })
      
      const isRiderEmail = (await RiderInstance.findOne({
        where: { email: email },
      })) as unknown as RiderAttributes;
  
      const isRiderPhone = (await RiderInstance.findOne({
        where: { phone: phone },
      }))

      console.log('we got to this point')
      if (!User && !userPhone && !isRiderEmail && !isRiderPhone) {
        const user = await UserInstance.create({
          id: uuiduser,
          name,
          phone,
          email,
          password: userPassword,
          salt: salt,
          address:"",
          otp,
          otp_expiry:expiry,
          longitude:0,
          latitude:0,
          verified: false,
          role: "user",
        });

        // await onRequestOTP(otp, phoneNumber);
        // Check if user exist
  
        const User = await UserInstance.findOne({
          where: { email: email }
        }) as unknown as UserAttribute
        const signature = await GenerateSignature({
            id: User.id,
            email:User.email,
            verified: User.verified

        })
         return res.status(201).json({
          message: "User created successfully ",
          User,
          signature,
        });
      }
      return res.status(400).json({
        Error: "Email or Phone Number already exist",
      });
    } catch (error) {
      
      res.status(500).json({
        Error: "Internal server error",
        route: "users/signup",
      });
      console.log(error)
    }
  };
  

export const UpdateUserProfile = async (req: JwtPayload, res: Response) => {
  try {
    const token = req.params.id
    const { id } = await verifySignature(token) 
    const { name, phone, email } = req.body;
    const validateResult = editProfileSchema.validate(req.body, option);
    if (validateResult.error) {
      return res.status(400).json({
        Error: validateResult.error.details[0].message,
      });
    }
    const User = (await UserInstance.findOne({
      where: { id: id },
    })) as unknown as UserAttribute;
    if (!User) {
      return res.status(400).json({
        Error: "You are not authorized to update user",
      });
    }
    const newUser = (await UserInstance.update(
      {
        name,
        phone,
        email,
      },
      { where: { id: id } }
    )) as unknown as UserAttribute;
    if (newUser) {
      const User = (await UserInstance.findOne({
        where: { id: id },
      })) as unknown as UserAttribute;
      return res.status(200).json({
        message: "Profile updated successfully",
        User,
      });
    }
    return res.status(400).json({
      Error: "User does not exist",
    });
  } catch (err) {
    return res.status(500).json({
      Error: "Internal Server Error",
      route: "./users/updateUserProfile/:id",
    });
  }
};

export const Login = async (req: Request, res: Response) => {
  try {
      const { email, password } = req.body;
  
      const validateResult = loginSchema.validate(req.body, option);
      if (validateResult.error) {
          return res.status(400).json({
              Error: validateResult.error.details[0].message
          })
      }
      // check if user exists
      const User = await UserInstance.findOne({
          where: { email: email }
      }) as unknown as UserAttribute;

      const Rider = await RiderInstance.findOne({
        where: { email: email }
      }) as unknown as RiderAttributes;
      if (User) {
      const validation = await validatePassword(password, User.password, User.salt)
          if(validation){
              // Generate a new Signature
              let signature = await GenerateSignature({
                  id: User.id,
                  email: User.email,
                  verified: User.verified
              });
              return res.status(200).json({
                  message: "Login successful",
                  signature: signature,
                  id: User.id,
                  email: User.email,
                  verified: User.verified,
                  role: User.role,
                  name: User.name,
              })
          }
          return res.status(400).json({
            Error: "Wrong Username or password or not a verified user"
        })
      }
      else if (Rider) {
      const validation = await validatePassword(password, Rider.password, Rider.salt)
          if(validation){
              // Generate a new Signature
              let signature = await GenerateSignature({
                  id: Rider.id,
                  email: Rider.email,
                  verified: Rider.verified
              });
              return res.status(200).json({
                  message: "Login successful",
                  signature: signature,
                  id: Rider.id,
                  email: Rider.email,
                  verified: Rider.verified,
                  role: Rider.role,
                  name: Rider.name
              })
          }
          return res.status(400).json({
            Error: "Wrong Username or password or not a verified user"
        })
      }
      
    
      return res.status(401).json({
          Error: "account does not exist, please signup"
      })
  } catch (err:any) {
    return res.status(500).json({
          Error: err.stack,
          
          route: "/users/login"
      })
  }
}


/**==================Verify Users==================== **/
export const VerifyUser = async (req: Request, res: Response) => {
  try {
      const token = req.params.signature
      const decode = await verifySignature(token)
      // check if user is a registered user
      const User = await UserInstance.findOne({
          where: { email: decode.email }
      }) as unknown as UserAttribute
      if (User) {
          const { otp } = req.body
          //check if the otp submitted by the user is correct and is same with the one in the database
          if (User.otp === parseInt(otp) && User.otp_expiry >= new Date()) {
              //update user
              const updatedUser = await UserInstance.update({ verified: true },
                  { where: { email: decode.email } }) as unknown as UserAttribute
              // Generate a new Signature
              let signature = await GenerateSignature({
                  id: updatedUser.id,
                  email: updatedUser.email,
                  verified: updatedUser.verified
              });
              if (updatedUser) {
                  const User = (await UserInstance.findOne({
                      where: { email: decode.email },
                  })) as unknown as UserAttribute
                  return res.status(200).json({
                      message: "Your account have been verified successfully",
                      signature,
                      verified: User.verified
                  })
              }
          }
      }
      return res.status(400).json({
          Error: 'invalid credentials or OTP already expired'
      })
  }
  catch (err) {
      res.status(500).json({
          Error: "Internal server Error",
          route: "/users/verify"
      })
  }
}


/**============================Resend OTP=========================== **/
export const ResendOTP = async (req: Request, res: Response) => {
  try{
    const token = req.params.signature;
     const decode = await verifySignature(token);
     // check if user is a registered user
     const User = await UserInstance.findOne({
         where: { email: decode.email }
     }) as unknown as UserAttribute;
     if (User) {
         //Generate otp
         const { otp, expiry } = GenerateOTP();
         //update user
         const updatedUser = await UserInstance.update({ otp, otp_expiry: expiry },
             { where: { email: decode.email } }) as unknown as UserAttribute;
         if (updatedUser) {
             //Send OTP to user
             // await onRequestOTP(otp, User.phone);
             //send Email
             const html = emailHtml(otp);
             await mailSent(FromAdminMail, User.email, userSubject, html);
             return res.status(200).json({
                 message: "OTP resent successfully, kindly check your eamil or phone number for OTP verification"
             })
         }
     }
     return res.status(400).json({
         Error: 'Error sending OTP'
     })
  }catch(err){
    return res.status(500).json({
         Error: "Internal server Error",
         route: "/users/resend-otp/:signature"
     })
  }
 }


/**=========================== Resend Password============================== **/
export const forgotPassword = async(req: Request, res: Response) => {
  try {
    console.log(req.body)
      const {email} = req.body;
      const validateResult = forgotPasswordSchema.validate(req.body, option);
  if (validateResult.error) {
    return res.status(400).json({
      Error: validateResult.error.details[0].message,
    });
}
     //check if the User exist
     const oldUser = (await UserInstance.findOne({
      where: { email: email },
    })) as unknown as UserAttribute;

    const oldRider = (await RiderInstance.findOne({
      where: { email: email },
    })) as unknown as RiderAttributes;

  // if(!oldUser || !oldRider) {
  //     return res.status(400).json({
  //         message: "email not found",
  //       })
  // }
  if(oldUser){
  const secret = APP_SECRET + oldUser.password;
   const token = jwt.sign({email: oldUser.email, id: oldUser.id},secret, {expiresIn: "10m"})
  //  if(!token){
  //     return res.status(400).json({
  //         Error: "Invalid credentials",
  //     })
  //  }
  const link = `${Base_Url}/users/resetpasswordd/${oldUser.id}`
  if(token) {
    const html = emailHtml2(link);
    await mailSent2(FromAdminMail, oldUser.email, userSubject, html);
    return res.status(200).json({
      message: "password reset link sent to email",
      link
    });
  }
  return res.status(400).json({
          Error: "Invalid credentials",
      })
}else if(oldRider){
  const secret = APP_SECRET + oldRider.password;
    const token = jwt.sign({email: oldRider.email, id: oldRider.id},secret, {expiresIn: "10m"})
    const link = `${Base_Url}/users/resetpasswordd/${oldRider.id}`
    if(token) {
      const html = emailHtml2(link);
      await mailSent2(FromAdminMail, oldRider.email, userSubject, html);
      return res.status(200).json({
        message: "password reset link sent to email",
        link
      });
    }
    return res.status(400).json({
            Error: "Invalid credentials",
        })
}
return res.status(400).json({
          message: "email not found",
        })
      
} catch (error) {
      res.status(500).json({
          Error: "Internal server Error",
          route: "/users/forgotpasswordd",
        }); 
  }
}
export const resetPasswordGet = async(req:Request, res:Response) => {
  const {id, token} = req.params;
  const oldUser = (await UserInstance.findOne({
      where: {id: id} 
  }))as unknown as UserAttribute
  if(!oldUser) {
      return res.status(400).json({
          message: "User Does Not Exist"
      })
  }
  const secret = APP_SECRET + oldUser.password;
  try {
       const verify = jwt.verify(token, secret)
       return res.status(200).json({
          email: oldUser.email,
          verify
           });
  } catch (error) {
      res.send("Not Verified")
  }
}
export const resetPasswordPost  = async( req:JwtPayload, res:Response) =>{
  const { id} = req.params;
  const {password} = req.body
  const oldUser = (await UserInstance.findOne({
      where: {id: id} 
  }))as unknown as UserAttribute
  const validateResult = resetPasswordSchema.validate(req.body, option);
  if (validateResult.error) {
    return res.status(400).json({
      Error: validateResult.error.details[0].message,
    });
}
  if(!oldUser) {
      return res.status(400).json({
          message: "user does not exist"
      })
  }
  const secret = APP_SECRET + oldUser.password;
  console.log("secret",secret)
  try {
      //const verify = jwt.verify(token, secret) as unknown as JwtPayload
      //console.log("id:",verify)
     const encryptedPassword = await bcrypt.hash(password,oldUser.salt)
     console.log("password",password)
     const updatedPassword =  (await UserInstance.update(
      {
         password: encryptedPassword
       }, {where: {id: id}}
       )) as unknown as UserAttribute

       return res.status(200).json({
          message: "you have succesfully changed your password",
          updatedPassword

        });
  } catch (error) {
    res.status(500).json({
      Error: "Internal server Error",
      route: "/users/reset-password/:id/:token",
    }); 
  }
}


/*********************** ORDER RIDE **************************/
export const orderRide = async (req: JwtPayload, res: Response) => {
  try {
    const { id } = req.user;
    const {
      pickupLocation,
      packageDescription,
      dropOffLocation,
      dropOffPhoneNumber,
      offerAmount,
    } = req.body;
    const orderUUID = uuidv4();
    //validate req body
    const validateResult = orderRideSchema.validate(req.body, option);
    if (validateResult.error) {
      return res.status(400).json({
        Error: validateResult.error.details[0].message,
      });
    }
    //verify if user exist
    const user = (await UserInstance.findOne({
      where: { id: id },
    })) as unknown as UserAttribute;
    if (!user) {
      return res.status(400).json({
        message: "User not found",
      });
    }
    if (user) {
      const order = (await OrderInstance.create({
        id: orderUUID,
        pickupLocation,
        packageDescription,
        dropOffLocation,
        dropOffPhoneNumber,
        offerAmount,
        paymentMethod: "",
       orderNumber: "" + Math.floor(Math.random() * 1000000000),
        status: "pending",
        userId: user.id,
      })) as unknown as OrderAttribute;
      res.status(201).json({
        message: "Order created successfully",
        order,
      });
      if (!order) {
        return res.status(400).json({
          message: "Unable to create order!",
        });
      }
    }
  } catch (error) {
    res.status(500).json({
      Error: "Internal server Error",
      route: "/order-ride",
      msg: error,
    });
    // console.log(error)
  }
};


/*************************GET ALL ORDERS ****************************/
export const getMyOrders = async (req: JwtPayload, res: Response) => {
  try {
      const { id } = req.user;

      const user = await UserInstance.findOne({
          where: {id: id} 
      })as unknown as UserAttribute;

      if(!user){
          return res.status(400).json({
              message: "User not found"
          })
      }

  
      const Orders = await OrderInstance.findAndCountAll({
        where: {userId: user.id},
      })


      if(!Orders){
          return res.status(400).json({
              message: "No orders found"
          })
      }

      res.status(200).json({
          message: "Orders fetched successfully",
          Orders,
          count: Orders.count
      })

      
  } catch (error) {
      res.status(500).json({
          Error: "Internal server Error",
          route: "/get-all-orders",
          msg: error,
      });
  }
}


/*************************GET ALL COMPLETED ORDERS ****************************/
export const getMyCompletedOrders = async (req: JwtPayload, res: Response) => {
  try {
      const { id } = req.user;

      const user = await UserInstance.findOne({
          where: {id: id} 
      })as unknown as UserAttribute;

      if(!user){
          return res.status(400).json({
              message: "User not found"
          })
      }

  
      const completedOrders = await OrderInstance.findAndCountAll({
        where: {userId: user.id, status: "completed"},
      })


      if(!completedOrders){
          return res.status(400).json({
              message: "No orders found"
          })
      }

      res.status(200).json({
          message: "Orders fetched successfully",
          completedOrders,
          count: completedOrders.count
      })

      
  } catch (error) {
      res.status(500).json({
          Error: "Internal server Error",
          route: "/get-all-orders",
          msg: error,
      });
  }
}
