#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const cdk = __importStar(require("aws-cdk-lib"));
const misra_platform_stack_1 = require("./misra-platform-stack");
const app = new cdk.App();
// Get environment from context or default to production
const environment = app.node.tryGetContext('environment') || 'production';
// Deploy Full Platform Stack with authentication functions
new misra_platform_stack_1.MisraPlatformStack(app, `MisraPlatform-${environment}-Stack`, {
    environment: environment, // Pass environment to stack
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
    },
    tags: {
        Environment: environment,
        Project: 'MISRA-Platform',
    },
});
app.synth();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLHVDQUFxQztBQUNyQyxpREFBbUM7QUFDbkMsaUVBQTREO0FBRTVELE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBRTFCLHdEQUF3RDtBQUN4RCxNQUFNLFdBQVcsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsSUFBSSxZQUFZLENBQUM7QUFFMUUsMkRBQTJEO0FBQzNELElBQUkseUNBQWtCLENBQUMsR0FBRyxFQUFFLGlCQUFpQixXQUFXLFFBQVEsRUFBRTtJQUNoRSxXQUFXLEVBQUUsV0FBVyxFQUFFLDRCQUE0QjtJQUN0RCxHQUFHLEVBQUU7UUFDSCxPQUFPLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUI7UUFDeEMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLElBQUksV0FBVztLQUN0RDtJQUNELElBQUksRUFBRTtRQUNKLFdBQVcsRUFBRSxXQUFXO1FBQ3hCLE9BQU8sRUFBRSxnQkFBZ0I7S0FDMUI7Q0FDRixDQUFDLENBQUM7QUFFSCxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXHJcbmltcG9ydCAnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJztcclxuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0IHsgTWlzcmFQbGF0Zm9ybVN0YWNrIH0gZnJvbSAnLi9taXNyYS1wbGF0Zm9ybS1zdGFjayc7XHJcblxyXG5jb25zdCBhcHAgPSBuZXcgY2RrLkFwcCgpO1xyXG5cclxuLy8gR2V0IGVudmlyb25tZW50IGZyb20gY29udGV4dCBvciBkZWZhdWx0IHRvIHByb2R1Y3Rpb25cclxuY29uc3QgZW52aXJvbm1lbnQgPSBhcHAubm9kZS50cnlHZXRDb250ZXh0KCdlbnZpcm9ubWVudCcpIHx8ICdwcm9kdWN0aW9uJztcclxuXHJcbi8vIERlcGxveSBGdWxsIFBsYXRmb3JtIFN0YWNrIHdpdGggYXV0aGVudGljYXRpb24gZnVuY3Rpb25zXHJcbm5ldyBNaXNyYVBsYXRmb3JtU3RhY2soYXBwLCBgTWlzcmFQbGF0Zm9ybS0ke2Vudmlyb25tZW50fS1TdGFja2AsIHtcclxuICBlbnZpcm9ubWVudDogZW52aXJvbm1lbnQsIC8vIFBhc3MgZW52aXJvbm1lbnQgdG8gc3RhY2tcclxuICBlbnY6IHtcclxuICAgIGFjY291bnQ6IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX0FDQ09VTlQsXHJcbiAgICByZWdpb246IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX1JFR0lPTiB8fCAndXMtZWFzdC0xJyxcclxuICB9LFxyXG4gIHRhZ3M6IHtcclxuICAgIEVudmlyb25tZW50OiBlbnZpcm9ubWVudCxcclxuICAgIFByb2plY3Q6ICdNSVNSQS1QbGF0Zm9ybScsXHJcbiAgfSxcclxufSk7XHJcblxyXG5hcHAuc3ludGgoKTtcclxuIl19