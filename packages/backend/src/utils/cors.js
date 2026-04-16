"use strict";
/**
 * CORS (Cross-Origin Resource Sharing) utilities
 * Provides headers for API Gateway Lambda functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsHeaders = void 0;
exports.getCorsHeaders = getCorsHeaders;
exports.handleOptionsRequest = handleOptionsRequest;
exports.isOriginAllowed = isOriginAllowed;
/**
 * Standard CORS headers for API responses
 * Allows requests from any origin in development, specific origins in production
 */
exports.corsHeaders = {
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS,PATCH',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
};
/**
 * Get CORS headers with custom origin
 */
function getCorsHeaders(origin) {
    return {
        ...exports.corsHeaders,
        'Access-Control-Allow-Origin': origin || exports.corsHeaders['Access-Control-Allow-Origin']
    };
}
/**
 * Handle OPTIONS preflight requests
 */
function handleOptionsRequest() {
    return {
        statusCode: 200,
        headers: exports.corsHeaders,
        body: ''
    };
}
/**
 * Validate origin against allowed origins
 */
function isOriginAllowed(origin) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
    if (allowedOrigins.includes('*')) {
        return true;
    }
    return allowedOrigins.some(allowed => {
        // Support wildcard subdomains like *.example.com
        if (allowed.startsWith('*.')) {
            const domain = allowed.substring(2);
            return origin.endsWith(domain);
        }
        return origin === allowed;
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29ycy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7R0FHRzs7O0FBaUJILHdDQUtDO0FBS0Qsb0RBTUM7QUFLRCwwQ0FlQztBQW5ERDs7O0dBR0c7QUFDVSxRQUFBLFdBQVcsR0FBRztJQUN6Qiw2QkFBNkIsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsSUFBSSxHQUFHO0lBQ2pFLDhCQUE4QixFQUFFLHNFQUFzRTtJQUN0Ryw4QkFBOEIsRUFBRSxtQ0FBbUM7SUFDbkUsa0NBQWtDLEVBQUUsTUFBTTtJQUMxQyxjQUFjLEVBQUUsa0JBQWtCO0NBQ25DLENBQUM7QUFFRjs7R0FFRztBQUNILFNBQWdCLGNBQWMsQ0FBQyxNQUFlO0lBQzVDLE9BQU87UUFDTCxHQUFHLG1CQUFXO1FBQ2QsNkJBQTZCLEVBQUUsTUFBTSxJQUFJLG1CQUFXLENBQUMsNkJBQTZCLENBQUM7S0FDcEYsQ0FBQztBQUNKLENBQUM7QUFFRDs7R0FFRztBQUNILFNBQWdCLG9CQUFvQjtJQUNsQyxPQUFPO1FBQ0wsVUFBVSxFQUFFLEdBQUc7UUFDZixPQUFPLEVBQUUsbUJBQVc7UUFDcEIsSUFBSSxFQUFFLEVBQUU7S0FDVCxDQUFDO0FBQ0osQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBZ0IsZUFBZSxDQUFDLE1BQWM7SUFDNUMsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFeEUsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDakMsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQsT0FBTyxjQUFjLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ25DLGlEQUFpRDtRQUNqRCxJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUM3QixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3BDLE9BQU8sTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNqQyxDQUFDO1FBQ0QsT0FBTyxNQUFNLEtBQUssT0FBTyxDQUFDO0lBQzVCLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBDT1JTIChDcm9zcy1PcmlnaW4gUmVzb3VyY2UgU2hhcmluZykgdXRpbGl0aWVzXHJcbiAqIFByb3ZpZGVzIGhlYWRlcnMgZm9yIEFQSSBHYXRld2F5IExhbWJkYSBmdW5jdGlvbnNcclxuICovXHJcblxyXG4vKipcclxuICogU3RhbmRhcmQgQ09SUyBoZWFkZXJzIGZvciBBUEkgcmVzcG9uc2VzXHJcbiAqIEFsbG93cyByZXF1ZXN0cyBmcm9tIGFueSBvcmlnaW4gaW4gZGV2ZWxvcG1lbnQsIHNwZWNpZmljIG9yaWdpbnMgaW4gcHJvZHVjdGlvblxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGNvcnNIZWFkZXJzID0ge1xyXG4gICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiBwcm9jZXNzLmVudi5BTExPV0VEX09SSUdJTlMgfHwgJyonLFxyXG4gICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0NvbnRlbnQtVHlwZSxBdXRob3JpemF0aW9uLFgtQW16LURhdGUsWC1BcGktS2V5LFgtQW16LVNlY3VyaXR5LVRva2VuJyxcclxuICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6ICdHRVQsUE9TVCxQVVQsREVMRVRFLE9QVElPTlMsUEFUQ0gnLFxyXG4gICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1DcmVkZW50aWFscyc6ICd0cnVlJyxcclxuICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nXHJcbn07XHJcblxyXG4vKipcclxuICogR2V0IENPUlMgaGVhZGVycyB3aXRoIGN1c3RvbSBvcmlnaW5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRDb3JzSGVhZGVycyhvcmlnaW4/OiBzdHJpbmcpOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+IHtcclxuICByZXR1cm4ge1xyXG4gICAgLi4uY29yc0hlYWRlcnMsXHJcbiAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogb3JpZ2luIHx8IGNvcnNIZWFkZXJzWydBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nXVxyXG4gIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBIYW5kbGUgT1BUSU9OUyBwcmVmbGlnaHQgcmVxdWVzdHNcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBoYW5kbGVPcHRpb25zUmVxdWVzdCgpIHtcclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgaGVhZGVyczogY29yc0hlYWRlcnMsXHJcbiAgICBib2R5OiAnJ1xyXG4gIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBWYWxpZGF0ZSBvcmlnaW4gYWdhaW5zdCBhbGxvd2VkIG9yaWdpbnNcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBpc09yaWdpbkFsbG93ZWQob3JpZ2luOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICBjb25zdCBhbGxvd2VkT3JpZ2lucyA9IHByb2Nlc3MuZW52LkFMTE9XRURfT1JJR0lOUz8uc3BsaXQoJywnKSB8fCBbJyonXTtcclxuICBcclxuICBpZiAoYWxsb3dlZE9yaWdpbnMuaW5jbHVkZXMoJyonKSkge1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG4gIFxyXG4gIHJldHVybiBhbGxvd2VkT3JpZ2lucy5zb21lKGFsbG93ZWQgPT4ge1xyXG4gICAgLy8gU3VwcG9ydCB3aWxkY2FyZCBzdWJkb21haW5zIGxpa2UgKi5leGFtcGxlLmNvbVxyXG4gICAgaWYgKGFsbG93ZWQuc3RhcnRzV2l0aCgnKi4nKSkge1xyXG4gICAgICBjb25zdCBkb21haW4gPSBhbGxvd2VkLnN1YnN0cmluZygyKTtcclxuICAgICAgcmV0dXJuIG9yaWdpbi5lbmRzV2l0aChkb21haW4pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG9yaWdpbiA9PT0gYWxsb3dlZDtcclxuICB9KTtcclxufVxyXG4iXX0=