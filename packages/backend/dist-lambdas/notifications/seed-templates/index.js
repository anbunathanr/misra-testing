"use strict";var E=Object.create;var m=Object.defineProperty;var C=Object.getOwnPropertyDescriptor;var k=Object.getOwnPropertyNames;var D=Object.getPrototypeOf,R=Object.prototype.hasOwnProperty;var _=(e,t)=>{for(var r in t)m(e,r,{get:t[r],enumerable:!0})},T=(e,t,r,d)=>{if(t&&typeof t=="object"||typeof t=="function")for(let o of k(t))!R.call(e,o)&&o!==r&&m(e,o,{get:()=>t[o],enumerable:!(d=C(t,o))||d.enumerable});return e};var N=(e,t,r)=>(r=e!=null?E(D(e)):{},T(t||!e||!e.__esModule?m(r,"default",{value:e,enumerable:!0}):r,e)),P=e=>T(m({},"__esModule",{value:!0}),e);var L={};_(L,{handler:()=>M});module.exports=P(L);var I=require("@aws-sdk/client-dynamodb"),l=require("@aws-sdk/lib-dynamodb");var v=N(require("crypto")),u=new Uint8Array(256),c=u.length;function x(){return c>u.length-16&&(v.default.randomFillSync(u),c=0),u.slice(c,c+=16)}var s=[];for(let e=0;e<256;++e)s.push((e+256).toString(16).slice(1));function w(e,t=0){return s[e[t+0]]+s[e[t+1]]+s[e[t+2]]+s[e[t+3]]+"-"+s[e[t+4]]+s[e[t+5]]+"-"+s[e[t+6]]+s[e[t+7]]+"-"+s[e[t+8]]+s[e[t+9]]+"-"+s[e[t+10]]+s[e[t+11]]+s[e[t+12]]+s[e[t+13]]+s[e[t+14]]+s[e[t+15]]}var A=N(require("crypto")),y={randomUUID:A.default.randomUUID};function j(e,t,r){if(y.randomUUID&&!t&&!e)return y.randomUUID();e=e||{};let d=e.random||(e.rng||x)();if(d[6]=d[6]&15|64,d[8]=d[8]&63|128,t){r=r||0;for(let o=0;o<16;++o)t[r+o]=d[o];return t}return w(d)}var g=j;var f=class{docClient;tableName;constructor(){let t=new I.DynamoDBClient({region:process.env.AWS_REGION||"us-east-1"});this.docClient=l.DynamoDBDocumentClient.from(t),this.tableName=process.env.NOTIFICATION_TEMPLATES_TABLE||"NotificationTemplates"}async getTemplate(t,r){try{let d=new l.QueryCommand({TableName:this.tableName,IndexName:"EventTypeChannelIndex",KeyConditionExpression:"eventType = :eventType AND channel = :channel",ExpressionAttributeValues:{":eventType":t,":channel":r},Limit:1}),o=await this.docClient.send(d);return o.Items&&o.Items.length>0?o.Items[0]:null}catch(d){throw console.error("Error getting template",{eventType:t,channel:r,error:d}),d}}async renderTemplate(t,r){let d=t.body;return d=d.replace(/\{\{(\w+)\}\}/g,(o,n)=>{let a=r[n];return a==null?(console.warn(`Template variable '${n}' not found in context, using empty string`),""):Array.isArray(a)?a.join(", "):typeof a=="object"?JSON.stringify(a):String(a)}),d}async createTemplate(t){if(!await this.validateTemplate(t))throw new Error("Invalid template syntax");let d=new Date().toISOString(),o={...t,templateId:g(),createdAt:d,updatedAt:d};try{let n=new l.PutCommand({TableName:this.tableName,Item:o});return await this.docClient.send(n),o}catch(n){throw console.error("Error creating template",{error:n}),n}}async updateTemplate(t,r){if(r.body){let o={...r,body:r.body};if(!await this.validateTemplate(o))throw new Error("Invalid template syntax")}let d=new Date().toISOString();try{let o=[],n={},a={};o.push("#updatedAt = :updatedAt"),n["#updatedAt"]="updatedAt",a[":updatedAt"]=d,Object.entries(r).forEach(([i,S])=>{i!=="templateId"&&i!=="createdAt"&&i!=="updatedAt"&&(o.push(`#${i} = :${i}`),n[`#${i}`]=i,a[`:${i}`]=S)});let p=new l.UpdateCommand({TableName:this.tableName,Key:{templateId:t},UpdateExpression:`SET ${o.join(", ")}`,ExpressionAttributeNames:n,ExpressionAttributeValues:a,ReturnValues:"ALL_NEW"});return(await this.docClient.send(p)).Attributes}catch(o){throw console.error("Error updating template",{templateId:t,error:o}),o}}async validateTemplate(t){try{if(!t.body)return console.error("Template body is required"),!1;let r=(t.body.match(/\{\{/g)||[]).length,d=(t.body.match(/\}\}/g)||[]).length;if(r!==d)return console.error("Template has unbalanced braces",{openBraces:r,closeBraces:d}),!1;let o=t.body.match(/\{\{(\w+)\}\}/g),a=(o?o.map(p=>p.replace(/\{\{|\}\}/g,"")):[]).filter(p=>!/^\w+$/.test(p));return a.length>0?(console.error("Template has invalid variable names",{invalidVariables:a}),!1):t.channel==="email"&&t.format!=="html"&&t.format!=="text"?(console.error("Email templates must use html or text format"),!1):t.channel==="sms"&&t.format!=="text"?(console.error("SMS templates must use text format"),!1):t.channel==="slack"&&t.format!=="slack_blocks"?(console.error("Slack templates must use slack_blocks format"),!1):!0}catch(r){return console.error("Error validating template",{error:r}),!1}}},b=new f;var h=[{eventType:"test_completion",channel:"email",format:"html",subject:"Test Completed: {{testName}}",body:`
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #4CAF50;">\u2713 Test Completed Successfully</h2>
          <p>Your test execution has completed.</p>
          
          <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Test Name:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{testName}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Execution ID:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{executionId}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Status:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{status}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Result:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{result}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Duration:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{duration}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Timestamp:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{timestamp}}</td>
            </tr>
          </table>
          
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            This is an automated notification from AIBTS Test Execution System.
          </p>
        </body>
      </html>
    `,variables:["testName","executionId","status","result","duration","timestamp"]},{eventType:"test_failure",channel:"email",format:"html",subject:"Test Failed: {{testName}}",body:`
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #f44336;">\u2717 Test Failed</h2>
          <p>Your test execution has failed. Please review the details below.</p>
          
          <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Test Name:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{testName}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Execution ID:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{executionId}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Status:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{status}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Result:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{result}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Duration:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{duration}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Error:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd; color: #f44336;">{{errorMessage}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Timestamp:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{timestamp}}</td>
            </tr>
          </table>
          
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            This is an automated notification from AIBTS Test Execution System.
          </p>
        </body>
      </html>
    `,variables:["testName","executionId","status","result","duration","errorMessage","timestamp"]},{eventType:"critical_alert",channel:"email",format:"html",subject:"\u{1F6A8} CRITICAL ALERT: {{testName}}",body:`
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="background-color: #f44336; color: white; padding: 15px; border-radius: 5px;">
            <h2 style="margin: 0;">\u{1F6A8} CRITICAL ALERT</h2>
          </div>
          
          <p style="margin-top: 20px; font-size: 16px; color: #f44336;">
            <strong>A critical test failure has been detected that requires immediate attention.</strong>
          </p>
          
          <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Test Name:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{testName}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Execution ID:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{executionId}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Project:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{projectName}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Status:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{status}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Error:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd; color: #f44336; font-weight: bold;">{{errorMessage}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Timestamp:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{timestamp}}</td>
            </tr>
          </table>
          
          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Action Required:</strong> Please investigate this failure immediately.</p>
          </div>
          
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            This is an automated critical alert from AIBTS Test Execution System.
          </p>
        </body>
      </html>
    `,variables:["testName","executionId","projectName","status","errorMessage","timestamp"]},{eventType:"summary_report",channel:"email",format:"html",subject:"Test Execution Summary Report",body:`
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #2196F3;">\u{1F4CA} Test Execution Summary Report</h2>
          <p>Here's your test execution summary for the reporting period.</p>
          
          <h3>Report Details</h3>
          <p><strong>Report Type:</strong> {{reportData}}</p>
          
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            This is an automated report from AIBTS Test Execution System.
          </p>
        </body>
      </html>
    `,variables:["reportData"]},{eventType:"critical_alert",channel:"sms",format:"text",body:'\u{1F6A8} CRITICAL: Test "{{testName}}" failed. Error: {{errorMessage}}. Check AIBTS dashboard immediately.',variables:["testName","errorMessage"]},{eventType:"test_failure",channel:"slack",format:"slack_blocks",body:JSON.stringify([{type:"header",text:{type:"plain_text",text:"\u274C Test Failed"}},{type:"section",fields:[{type:"mrkdwn",text:`*Test Name:*
{{testName}}`},{type:"mrkdwn",text:`*Status:*
{{status}}`},{type:"mrkdwn",text:`*Result:*
{{result}}`},{type:"mrkdwn",text:`*Duration:*
{{duration}}`}]},{type:"section",text:{type:"mrkdwn",text:"*Error:*\n```{{errorMessage}}```"}},{type:"context",elements:[{type:"mrkdwn",text:"Execution ID: {{executionId}} | {{timestamp}}"}]}]),variables:["testName","status","result","duration","errorMessage","executionId","timestamp"]},{eventType:"critical_alert",channel:"slack",format:"slack_blocks",body:JSON.stringify([{type:"header",text:{type:"plain_text",text:"\u{1F6A8} CRITICAL ALERT"}},{type:"section",text:{type:"mrkdwn",text:"*A critical test failure requires immediate attention*"}},{type:"section",fields:[{type:"mrkdwn",text:`*Test Name:*
{{testName}}`},{type:"mrkdwn",text:`*Project:*
{{projectName}}`},{type:"mrkdwn",text:`*Status:*
{{status}}`},{type:"mrkdwn",text:`*Timestamp:*
{{timestamp}}`}]},{type:"section",text:{type:"mrkdwn",text:"*Error:*\n```{{errorMessage}}```"}},{type:"divider"},{type:"context",elements:[{type:"mrkdwn",text:"\u26A0\uFE0F *Action Required:* Please investigate this failure immediately"}]}]),variables:["testName","projectName","status","errorMessage","timestamp"]}];var M=async e=>{console.log("Starting template seeding",{templateCount:h.length});let t={success:!0,templatesCreated:0,templatesSkipped:0,errors:[]};for(let r of h)try{if(await b.getTemplate(r.eventType,r.channel)){console.log("Template already exists, skipping",{eventType:r.eventType,channel:r.channel}),t.templatesSkipped++;continue}await b.createTemplate(r),console.log("Template created successfully",{eventType:r.eventType,channel:r.channel}),t.templatesCreated++}catch(d){let o=`Failed to create template for ${r.eventType}/${r.channel}: ${d}`;console.error(o,{error:d}),t.errors.push(o),t.success=!1}return console.log("Template seeding completed",t),t};0&&(module.exports={handler});
