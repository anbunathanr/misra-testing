"use strict";var g=Object.defineProperty;var A=Object.getOwnPropertyDescriptor;var O=Object.getOwnPropertyNames;var x=Object.prototype.hasOwnProperty;var E=(r,e)=>{for(var t in e)g(r,t,{get:e[t],enumerable:!0})},T=(r,e,t,a)=>{if(e&&typeof e=="object"||typeof e=="function")for(let o of O(e))!x.call(r,o)&&o!==t&&g(r,o,{get:()=>e[o],enumerable:!(a=A(e,o))||a.enumerable});return r};var I=r=>T(g({},"__esModule",{value:!0}),r);var L={};E(L,{handler:()=>b});module.exports=I(L);var y=require("@aws-sdk/client-dynamodb"),P=require("@aws-sdk/lib-dynamodb"),c=require("@aws-sdk/client-ses");function p(r){return!r||typeof r!="string"?!1:/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.trim())}var u={"Access-Control-Allow-Origin":process.env.ALLOWED_ORIGINS||"*","Access-Control-Allow-Headers":"Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token","Access-Control-Allow-Methods":"GET,POST,PUT,DELETE,OPTIONS,PATCH","Access-Control-Allow-Credentials":"true","Content-Type":"application/json"};var f=class r{context;defaultMetadata;constructor(e,t={}){this.context=e,this.defaultMetadata=t}log(e,t,a){let o={timestamp:new Date().toISOString(),level:e,context:this.context,message:t,requestId:process.env.AWS_REQUEST_ID,...this.defaultMetadata,...a};console.log(JSON.stringify(o))}debug(e,t){process.env.LOG_LEVEL==="DEBUG"&&this.log("DEBUG",e,t)}info(e,t){this.log("INFO",e,t)}warn(e,t){this.log("WARN",e,t)}error(e,t,a){let o,s=a;t&&t instanceof Error?o=t:t&&typeof t=="object"&&(s=t);let l={timestamp:new Date().toISOString(),level:"ERROR",context:this.context,message:e,requestId:process.env.AWS_REQUEST_ID,...this.defaultMetadata,...s,error:o?{message:o.message,stack:o.stack,name:o.name}:void 0};console.error(JSON.stringify(l))}child(e,t={}){return new r(`${this.context}.${e}`,{...this.defaultMetadata,...t})}time(e){let t=Date.now();return()=>{let a=Date.now()-t;this.info(`${e} completed`,{duration:a})}}};function h(r,e){return new f(r,e)}var n=h("GenerateOTP"),S=new y.DynamoDBClient({region:process.env.AWS_REGION||"us-east-1"}),v=new c.SESClient({region:process.env.AWS_REGION||"us-east-1"}),b=async r=>{let e=r.headers["X-Correlation-ID"]||Math.random().toString(36).substring(7);try{if(n.info("Generate OTP request received",{correlationId:e,path:r.path,method:r.httpMethod}),!r.body)return i(400,"MISSING_BODY","Request body is required",e);let t=JSON.parse(r.body);if(!t.email)return i(400,"MISSING_EMAIL","Email is required",e);if(!p(t.email))return i(400,"INVALID_EMAIL","Please provide a valid email address",e);n.info("Generating OTP for email",{correlationId:e,email:t.email});let a=R(),o=process.env.OTP_TABLE_NAME||"OTP",s=10*60,l=Math.floor(Date.now()/1e3)+s;try{await S.send(new P.PutCommand({TableName:o,Item:{otpId:`${t.email}-${Date.now()}`,email:t.email,otp:a,createdAt:Date.now(),ttl:l,attempts:0,maxAttempts:5}})),n.info("OTP stored in DynamoDB",{correlationId:e,email:t.email,expiresIn:s})}catch(m){return n.error("Failed to store OTP in DynamoDB",{correlationId:e,email:t.email,error:m.message}),i(500,"OTP_STORAGE_FAILED","Failed to generate OTP",e)}try{await w(t.email,a,t.email,e),n.info("OTP email sent successfully",{correlationId:e,email:t.email})}catch(m){return n.error("Failed to send OTP email",{correlationId:e,email:t.email,error:m.message}),i(500,"EMAIL_SEND_FAILED","Failed to send OTP email",e)}n.info("Generate OTP completed successfully",{correlationId:e,email:t.email});let d={success:!0,message:"OTP sent to your email",email:t.email,expiresIn:s};return{statusCode:200,headers:u,body:JSON.stringify(d)}}catch(t){return n.error("Generate OTP failed",{correlationId:e,error:t.message,name:t.name,stack:t.stack}),i(500,"GENERATE_OTP_FAILED",t.message||"Failed to generate OTP",e)}};function R(){return Math.floor(1e5+Math.random()*9e5).toString()}async function w(r,e,t,a){let o=`
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
  `,s=`
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
  `,l={Source:process.env.SES_FROM_EMAIL||"noreply@misra-platform.com",Destination:{ToAddresses:[r]},Message:{Subject:{Data:"Your MISRA Platform OTP Code",Charset:"UTF-8"},Body:{Html:{Data:o,Charset:"UTF-8"},Text:{Data:s,Charset:"UTF-8"}}}};try{await v.send(new c.SendEmailCommand(l)),n.info("OTP email sent via SES",{correlationId:a,email:r})}catch(d){throw n.error("Failed to send OTP email via SES",{correlationId:a,email:r,error:d.message}),d}}function i(r,e,t,a){return{statusCode:r,headers:u,body:JSON.stringify({error:{code:e,message:t,timestamp:new Date().toISOString(),requestId:a}})}}0&&(module.exports={handler});
