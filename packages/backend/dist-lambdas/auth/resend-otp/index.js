"use strict";var u=Object.defineProperty;var E=Object.getOwnPropertyDescriptor;var I=Object.getOwnPropertyNames;var x=Object.prototype.hasOwnProperty;var R=(r,e)=>{for(var t in e)u(r,t,{get:e[t],enumerable:!0})},T=(r,e,t,n)=>{if(e&&typeof e=="object"||typeof e=="function")for(let o of I(e))!x.call(r,o)&&o!==t&&u(r,o,{get:()=>e[o],enumerable:!(n=E(e,o))||n.enumerable});return r};var S=r=>T(u({},"__esModule",{value:!0}),r);var M={};R(M,{handler:()=>C});module.exports=S(M);var m=require("@aws-sdk/client-cognito-identity-provider"),O=require("@aws-sdk/client-dynamodb"),P=require("@aws-sdk/lib-dynamodb"),g=require("@aws-sdk/client-ses");function h(r){return!r||typeof r!="string"?!1:/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.trim())}var f={"Access-Control-Allow-Origin":process.env.ALLOWED_ORIGINS||"*","Access-Control-Allow-Headers":"Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token","Access-Control-Allow-Methods":"GET,POST,PUT,DELETE,OPTIONS,PATCH","Access-Control-Allow-Credentials":"true","Content-Type":"application/json"};var p=class r{context;defaultMetadata;constructor(e,t={}){this.context=e,this.defaultMetadata=t}log(e,t,n){let o={timestamp:new Date().toISOString(),level:e,context:this.context,message:t,requestId:process.env.AWS_REQUEST_ID,...this.defaultMetadata,...n};console.log(JSON.stringify(o))}debug(e,t){process.env.LOG_LEVEL==="DEBUG"&&this.log("DEBUG",e,t)}info(e,t){this.log("INFO",e,t)}warn(e,t){this.log("WARN",e,t)}error(e,t,n){let o,a=n;t&&t instanceof Error?o=t:t&&typeof t=="object"&&(a=t);let d={timestamp:new Date().toISOString(),level:"ERROR",context:this.context,message:e,requestId:process.env.AWS_REQUEST_ID,...this.defaultMetadata,...a,error:o?{message:o.message,stack:o.stack,name:o.name}:void 0};console.error(JSON.stringify(d))}child(e,t={}){return new r(`${this.context}.${e}`,{...this.defaultMetadata,...t})}time(e){let t=Date.now();return()=>{let n=Date.now()-t;this.info(`${e} completed`,{duration:n})}}};function y(r,e){return new p(r,e)}var s=y("ResendOTP"),v=new m.CognitoIdentityProviderClient({region:process.env.AWS_REGION||"us-east-1"}),w=new O.DynamoDBClient({region:process.env.AWS_REGION||"us-east-1"}),b=new g.SESClient({region:process.env.AWS_REGION||"us-east-1"}),C=async r=>{let e=r.headers["X-Correlation-ID"]||Math.random().toString(36).substring(7);try{if(s.info("Resend OTP request received",{correlationId:e,path:r.path,method:r.httpMethod}),!r.body)return i(400,"MISSING_BODY","Request body is required",e);let t=JSON.parse(r.body);if(!t.email)return i(400,"MISSING_EMAIL","Email is required",e);if(!h(t.email))return i(400,"INVALID_EMAIL","Please provide a valid email address",e);let n=process.env.COGNITO_USER_POOL_ID;if(!n)return s.error("COGNITO_USER_POOL_ID not configured",{correlationId:e}),i(500,"CONFIG_ERROR","Authentication service configuration error",e);s.info("Verifying user exists",{correlationId:e,email:t.email});let o;try{o=(await v.send(new m.AdminGetUserCommand({UserPoolId:n,Username:t.email}))).Username||t.email}catch(l){if(l.name==="UserNotFoundException")return s.warn("User not found",{correlationId:e,email:t.email}),i(404,"USER_NOT_FOUND","User with this email does not exist",e);throw l}s.info("User verified, generating new OTP",{correlationId:e,email:t.email,userId:o});let a=D(),d=process.env.OTP_TABLE_NAME||"OTP",c=Math.floor(Date.now()/1e3)+10*60;try{await w.send(new P.PutCommand({TableName:d,Item:{otpId:`${t.email}-${Date.now()}`,email:t.email,otp:a,createdAt:Date.now(),ttl:c,userId:o}})),s.info("OTP stored in DynamoDB",{correlationId:e,email:t.email})}catch(l){return s.error("Failed to store OTP in DynamoDB",{correlationId:e,email:t.email,error:l.message}),i(500,"OTP_STORAGE_FAILED","Failed to generate OTP",e)}try{await L(t.email,a,t.email,e),s.info("OTP email sent successfully",{correlationId:e,email:t.email})}catch(l){return s.error("Failed to send OTP email",{correlationId:e,email:t.email,error:l.message}),i(500,"EMAIL_SEND_FAILED","Failed to send OTP email",e)}s.info("Resend OTP completed successfully",{correlationId:e,email:t.email});let A={success:!0,message:"OTP sent to your email",email:t.email};return{statusCode:200,headers:f,body:JSON.stringify(A)}}catch(t){return s.error("Resend OTP failed",{correlationId:e,error:t.message,name:t.name,stack:t.stack}),i(500,"RESEND_OTP_FAILED",t.message||"Failed to resend OTP",e)}};function D(){return Math.floor(1e5+Math.random()*9e5).toString()}async function L(r,e,t,n){let o=`
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
          
          <p>Hi ${t},</p>
          
          <p>Your One-Time Password (OTP) for MISRA Platform is:</p>
          
          <div class="otp-box">
            <div class="otp-code">${e}</div>
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
  `,a=`
MISRA Platform - OTP Verification

Hi ${t},

Your One-Time Password (OTP) for MISRA Platform is:

${e}

\u23F0 This code will expire in 10 minutes.

If you didn't request this code, please ignore this email and your account will remain secure.

---
MISRA Compliance Platform
Automated Code Analysis & Compliance Verification
\xA9 2026 - All rights reserved
  `,d={Source:process.env.SES_FROM_EMAIL||"noreply@misra-platform.com",Destination:{ToAddresses:[r]},Message:{Subject:{Data:"Your MISRA Platform OTP Code",Charset:"UTF-8"},Body:{Html:{Data:o,Charset:"UTF-8"},Text:{Data:a,Charset:"UTF-8"}}}};try{await b.send(new g.SendEmailCommand(d)),s.info("OTP email sent via SES",{correlationId:n,email:r})}catch(c){throw s.error("Failed to send OTP email via SES",{correlationId:n,email:r,error:c.message}),c}}function i(r,e,t,n){return{statusCode:r,headers:f,body:JSON.stringify({error:{code:e,message:t,timestamp:new Date().toISOString(),requestId:n}})}}0&&(module.exports={handler});
