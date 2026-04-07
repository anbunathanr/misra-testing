"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_18_0_5 = void 0;
/**
 * MISRA C++:2008 Rule 18-0-5
 * The unbounded functions of library <cstring> shall not be used
 *
 * NOTE: This is a stub implementation. Full implementation requires:
 * - Detailed AST analysis for this specific rule
 * - Comprehensive test cases
 * - Integration with the rule engine
 */
class Rule_CPP_18_0_5 {
    id = 'MISRA-CPP-18.0.5';
    description = 'The unbounded functions of library <cstring> shall not be used';
    severity = 'required';
    category = 'Library';
    language = 'CPP';
    async check(ast, sourceCode) {
        // Stub implementation - returns no violations
        // TODO: Implement full rule checking logic
        return [];
    }
}
exports.Rule_CPP_18_0_5 = Rule_CPP_18_0_5;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xOC0wLTUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTE4LTAtNS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFJQTs7Ozs7Ozs7R0FRRztBQUNILE1BQWEsZUFBZTtJQUMxQixFQUFFLEdBQUcsa0JBQWtCLENBQUM7SUFDeEIsV0FBVyxHQUFHLGdFQUFnRSxDQUFDO0lBQy9FLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxTQUFTLENBQUM7SUFDckIsUUFBUSxHQUFHLEtBQWMsQ0FBQztJQUUxQixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0Qyw4Q0FBOEM7UUFDOUMsMkNBQTJDO1FBQzNDLE9BQU8sRUFBRSxDQUFDO0lBQ1osQ0FBQztDQUNGO0FBWkQsMENBWUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcblxuLyoqXG4gKiBNSVNSQSBDKys6MjAwOCBSdWxlIDE4LTAtNVxuICogVGhlIHVuYm91bmRlZCBmdW5jdGlvbnMgb2YgbGlicmFyeSA8Y3N0cmluZz4gc2hhbGwgbm90IGJlIHVzZWRcbiAqIFxuICogTk9URTogVGhpcyBpcyBhIHN0dWIgaW1wbGVtZW50YXRpb24uIEZ1bGwgaW1wbGVtZW50YXRpb24gcmVxdWlyZXM6XG4gKiAtIERldGFpbGVkIEFTVCBhbmFseXNpcyBmb3IgdGhpcyBzcGVjaWZpYyBydWxlXG4gKiAtIENvbXByZWhlbnNpdmUgdGVzdCBjYXNlc1xuICogLSBJbnRlZ3JhdGlvbiB3aXRoIHRoZSBydWxlIGVuZ2luZVxuICovXG5leHBvcnQgY2xhc3MgUnVsZV9DUFBfMThfMF81IGltcGxlbWVudHMgTUlTUkFSdWxlIHtcbiAgaWQgPSAnTUlTUkEtQ1BQLTE4LjAuNSc7XG4gIGRlc2NyaXB0aW9uID0gJ1RoZSB1bmJvdW5kZWQgZnVuY3Rpb25zIG9mIGxpYnJhcnkgPGNzdHJpbmc+IHNoYWxsIG5vdCBiZSB1c2VkJztcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xuICBjYXRlZ29yeSA9ICdMaWJyYXJ5JztcbiAgbGFuZ3VhZ2UgPSAnQ1BQJyBhcyBjb25zdDtcblxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xuICAgIC8vIFN0dWIgaW1wbGVtZW50YXRpb24gLSByZXR1cm5zIG5vIHZpb2xhdGlvbnNcbiAgICAvLyBUT0RPOiBJbXBsZW1lbnQgZnVsbCBydWxlIGNoZWNraW5nIGxvZ2ljXG4gICAgcmV0dXJuIFtdO1xuICB9XG59XG4iXX0=