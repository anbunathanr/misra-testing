"use strict";var u=Object.defineProperty;var T=Object.getOwnPropertyDescriptor;var v=Object.getOwnPropertyNames;var M=Object.prototype.hasOwnProperty;var b=(r,t)=>{for(var e in t)u(r,e,{get:t[e],enumerable:!0})},C=(r,t,e,a)=>{if(t&&typeof t=="object"||typeof t=="function")for(let s of v(t))!M.call(r,s)&&s!==e&&u(r,s,{get:()=>t[s],enumerable:!(a=T(t,s))||a.enumerable});return r};var D=r=>C(u({},"__esModule",{value:!0}),r);var V={};b(V,{handler:()=>L});module.exports=D(V);var m=require("@aws-sdk/client-cognito-identity-provider"),x=require("@aws-sdk/client-dynamodb"),y=require("@aws-sdk/lib-dynamodb"),g=require("@aws-sdk/client-ses");function E(r){return!r||typeof r!="string"?!1:/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.trim())}function A(r){let t=[];return!r||typeof r!="string"?(t.push("Password is required"),{isValid:!1,message:t.join("; ")}):(r.length<8&&t.push("Password must be at least 8 characters long"),/[A-Z]/.test(r)||t.push("Password must contain at least one uppercase letter"),/[a-z]/.test(r)||t.push("Password must contain at least one lowercase letter"),/\d/.test(r)||t.push("Password must contain at least one number"),/[!@#$%^&*(),.?":{}|<>]/.test(r)||t.push("Password must contain at least one special character"),{isValid:t.length===0,message:t.join("; ")})}var f={"Access-Control-Allow-Origin":process.env.ALLOWED_ORIGINS||"*","Access-Control-Allow-Headers":"Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token","Access-Control-Allow-Methods":"GET,POST,PUT,DELETE,OPTIONS,PATCH","Access-Control-Allow-Credentials":"true","Content-Type":"application/json"};var p=class r{context;defaultMetadata;constructor(t,e={}){this.context=t,this.defaultMetadata=e}log(t,e,a){let s={timestamp:new Date().toISOString(),level:t,context:this.context,message:e,requestId:process.env.AWS_REQUEST_ID,...this.defaultMetadata,...a};console.log(JSON.stringify(s))}debug(t,e){process.env.LOG_LEVEL==="DEBUG"&&this.log("DEBUG",t,e)}info(t,e){this.log("INFO",t,e)}warn(t,e){this.log("WARN",t,e)}error(t,e,a){let s,d=a;e&&e instanceof Error?s=e:e&&typeof e=="object"&&(d=e);let n={timestamp:new Date().toISOString(),level:"ERROR",context:this.context,message:t,requestId:process.env.AWS_REQUEST_ID,...this.defaultMetadata,...d,error:s?{message:s.message,stack:s.stack,name:s.name}:void 0};console.error(JSON.stringify(n))}child(t,e={}){return new r(`${this.context}.${t}`,{...this.defaultMetadata,...e})}time(t){let e=Date.now();return()=>{let a=Date.now()-e;this.info(`${t} completed`,{duration:a})}}};function I(r,t){return new p(r,t)}var o=I("Register"),h=new m.CognitoIdentityProviderClient({region:process.env.AWS_REGION||"us-east-1"}),S=new x.DynamoDBClient({region:process.env.AWS_REGION||"us-east-1"}),U=new g.SESClient({region:process.env.AWS_REGION||"us-east-1"}),L=async r=>{let t=r.headers["X-Correlation-ID"]||Math.random().toString(36).substring(7);try{if(o.info("User registration request received",{correlationId:t,path:r.path,method:r.httpMethod}),!r.body)return l(400,"MISSING_BODY","Request body is required",t);let e=JSON.parse(r.body);if(!e.email)return l(400,"MISSING_EMAIL","Email is required",t);if(!E(e.email))return l(400,"INVALID_EMAIL","Please provide a valid email address",t);if(e.password){let i=A(e.password);if(!i.isValid)return l(400,"WEAK_PASSWORD",i.message,t)}let a=process.env.COGNITO_USER_POOL_ID;if(!a)return o.error("COGNITO_USER_POOL_ID not configured",{correlationId:t}),l(500,"CONFIG_ERROR","Authentication service configuration error",t);o.info("Attempting to register user",{correlationId:t,email:e.email,name:e.name});try{return await h.send(new m.AdminGetUserCommand({UserPoolId:a,Username:e.email})),o.warn("User already exists",{correlationId:t,email:e.email}),l(409,"USER_EXISTS","User with this email already exists",t)}catch(i){if(i.name!=="UserNotFoundException")throw i}let s=_();o.info("Creating Cognito user",{correlationId:t,email:e.email,passwordProvided:!!e.password});let n=(await h.send(new m.AdminCreateUserCommand({UserPoolId:a,Username:e.email,TemporaryPassword:s,UserAttributes:[{Name:"email",Value:e.email},{Name:"email_verified",Value:"false"},{Name:"name",Value:e.name||e.email},{Name:"custom:otpEnabled",Value:"false"}],MessageAction:"SUPPRESS"}))).User?.Username;if(!n)throw new Error("Failed to create user - no user ID returned");o.info("User created successfully",{correlationId:t,userId:n,email:e.email});let c=e.password||s;o.info("Setting permanent password",{correlationId:t,userId:n,isCustomPassword:!!e.password}),await h.send(new m.AdminSetUserPasswordCommand({UserPoolId:a,Username:e.email,Password:c,Permanent:!0})),o.info("Permanent password set",{correlationId:t,userId:n});let w=N(),P=process.env.OTP_TABLE_NAME||"OTP",R=Math.floor(Date.now()/1e3)+10*60;o.info("Generating OTP for user",{correlationId:t,email:e.email,otpTableName:P});try{await S.send(new y.PutCommand({TableName:P,Item:{otpId:`${e.email}-${Date.now()}`,email:e.email,otp:w,createdAt:Date.now(),ttl:R,userId:n}})),o.info("OTP stored in DynamoDB",{correlationId:t,email:e.email})}catch(i){o.warn("Failed to store OTP in DynamoDB",{correlationId:t,error:i.message})}try{await G(e.email,w,e.name||e.email,t),o.info("OTP email sent successfully",{correlationId:t,email:e.email})}catch(i){o.error("Failed to send OTP email",{correlationId:t,email:e.email,error:i.message})}try{let i=process.env.USERS_TABLE_NAME||"misra-users";await S.send(new y.PutCommand({TableName:i,Item:{email:e.email,userId:n,tempPassword:c,createdAt:Date.now(),name:e.name||e.email,otpVerified:!1}})),o.info("Stored user credentials in DynamoDB",{correlationId:t,email:e.email})}catch(i){o.warn("Failed to store credentials in DynamoDB",{correlationId:t,error:i.message})}o.info("User registration completed successfully",{correlationId:t,userId:n,email:e.email});let O={userId:n,email:e.email,message:"User registered successfully. Please verify your email and set up MFA.",requiresEmailVerification:!0};return o.info("User registration completed successfully",{correlationId:t,userId:n,email:e.email}),{statusCode:201,headers:f,body:JSON.stringify(O)}}catch(e){return o.error("User registration failed",{correlationId:t,error:e.message,name:e.name,stack:e.stack}),e.name==="UsernameExistsException"?l(409,"USER_EXISTS","User with this email already exists",t):e.name==="InvalidPasswordException"?l(400,"INVALID_PASSWORD",e.message,t):e.name==="TooManyRequestsException"?l(429,"TOO_MANY_REQUESTS","Too many registration attempts. Please try again later.",t):l(500,"REGISTRATION_FAILED",e.message||"Failed to register user",t)}};function N(){return Math.floor(1e5+Math.random()*9e5).toString()}function _(){let r="ABCDEFGHIJKLMNOPQRSTUVWXYZ",t="abcdefghijklmnopqrstuvwxyz",e="0123456789",a="!@#$%^&*",s="";s+=r[Math.floor(Math.random()*r.length)],s+=t[Math.floor(Math.random()*t.length)],s+=e[Math.floor(Math.random()*e.length)],s+=a[Math.floor(Math.random()*a.length)];let d=r+t+e+a;for(let n=s.length;n<12;n++)s+=d[Math.floor(Math.random()*d.length)];return s.split("").sort(()=>Math.random()-.5).join("")}async function G(r,t,e,a){let s=`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; }
          .header { text-align: center; color: #7b61ff; margin-bottom: 20px; }
          .otp-box { background-color: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
          .otp-code { font-size: 32px; font-weight: bold; color: #7b61ff; letter-spacing: 5px; font-family: monospace; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>\u{1F510} MISRA Platform - OTP Verification</h2>
          </div>
          
          <p>Hi ${e},</p>
          
          <p>Your One-Time Password (OTP) for MISRA Platform is:</p>
          
          <div class="otp-box">
            <div class="otp-code">${t}</div>
          </div>
          
          <p><strong>\u23F0 This code will expire in 10 minutes.</strong></p>
          
          <p>If you didn't request this code, please ignore this email and your account will remain secure.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          
          <div class="footer">
            <p>MISRA Compliance Platform</p>
            <p>Automated Code Analysis & Compliance Verification</p>
            <p>\xA9 2026 - All rights reserved</p>
          </div>
        </div>
      </body>
    </html>
  `,d=`
MISRA Platform - OTP Verification

Hi ${e},

Your One-Time Password (OTP) for MISRA Platform is:

${t}

\u23F0 This code will expire in 10 minutes.

If you didn't request this code, please ignore this email and your account will remain secure.

---
MISRA Compliance Platform
Automated Code Analysis & Compliance Verification
\xA9 2026 - All rights reserved
  `,n={Source:process.env.SES_FROM_EMAIL||"noreply@misra-platform.com",Destination:{ToAddresses:[r]},Message:{Subject:{Data:"Your MISRA Platform OTP Code",Charset:"UTF-8"},Body:{Html:{Data:s,Charset:"UTF-8"},Text:{Data:d,Charset:"UTF-8"}}}};try{await U.send(new g.SendEmailCommand(n)),o.info("OTP email sent via SES",{correlationId:a,email:r})}catch(c){throw o.error("Failed to send OTP email via SES",{correlationId:a,email:r,error:c.message}),c}}function l(r,t,e,a){return{statusCode:r,headers:f,body:JSON.stringify({error:{code:t,message:e,timestamp:new Date().toISOString(),requestId:a}})}}0&&(module.exports={handler});
