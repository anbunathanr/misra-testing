"use strict";
/**
 * OPTIONS Handler Lambda Function
 *
 * Handles CORS preflight requests for all API endpoints
 * Returns appropriate CORS headers for browser preflight checks
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const cors_1 = require("../../utils/cors");
const handler = async (event) => {
    return {
        statusCode: 200,
        headers: {
            ...cors_1.corsHeaders,
            'Access-Control-Allow-Origin': event.headers.origin || '*',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS,PATCH',
            'Access-Control-Allow-Headers': event.headers['access-control-request-headers'] || 'Content-Type,Authorization,X-Requested-With,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Correlation-ID',
            'Access-Control-Max-Age': '86400',
        },
        body: ''
    };
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3B0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7OztHQUtHOzs7QUFHSCwyQ0FBK0M7QUFFeEMsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUFFLEtBQTJCLEVBQWtDLEVBQUU7SUFDM0YsT0FBTztRQUNMLFVBQVUsRUFBRSxHQUFHO1FBQ2YsT0FBTyxFQUFFO1lBQ1AsR0FBRyxrQkFBVztZQUNkLDZCQUE2QixFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxJQUFJLEdBQUc7WUFDMUQsOEJBQThCLEVBQUUsbUNBQW1DO1lBQ25FLDhCQUE4QixFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUMsZ0NBQWdDLENBQUMsSUFBSSx3R0FBd0c7WUFDM0wsd0JBQXdCLEVBQUUsT0FBTztTQUNsQztRQUNELElBQUksRUFBRSxFQUFFO0tBQ1QsQ0FBQztBQUNKLENBQUMsQ0FBQztBQVpXLFFBQUEsT0FBTyxXQVlsQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBPUFRJT05TIEhhbmRsZXIgTGFtYmRhIEZ1bmN0aW9uXHJcbiAqIFxyXG4gKiBIYW5kbGVzIENPUlMgcHJlZmxpZ2h0IHJlcXVlc3RzIGZvciBhbGwgQVBJIGVuZHBvaW50c1xyXG4gKiBSZXR1cm5zIGFwcHJvcHJpYXRlIENPUlMgaGVhZGVycyBmb3IgYnJvd3NlciBwcmVmbGlnaHQgY2hlY2tzXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBjb3JzSGVhZGVycyB9IGZyb20gJy4uLy4uL3V0aWxzL2NvcnMnO1xyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgaGVhZGVyczoge1xyXG4gICAgICAuLi5jb3JzSGVhZGVycyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6IGV2ZW50LmhlYWRlcnMub3JpZ2luIHx8ICcqJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiAnR0VULFBPU1QsUFVULERFTEVURSxPUFRJT05TLFBBVENIJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiBldmVudC5oZWFkZXJzWydhY2Nlc3MtY29udHJvbC1yZXF1ZXN0LWhlYWRlcnMnXSB8fCAnQ29udGVudC1UeXBlLEF1dGhvcml6YXRpb24sWC1SZXF1ZXN0ZWQtV2l0aCxYLUFtei1EYXRlLFgtQXBpLUtleSxYLUFtei1TZWN1cml0eS1Ub2tlbixYLUNvcnJlbGF0aW9uLUlEJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLU1heC1BZ2UnOiAnODY0MDAnLFxyXG4gICAgfSxcclxuICAgIGJvZHk6ICcnXHJcbiAgfTtcclxufTtcclxuIl19