"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_2_10_4 = void 0;
/**
 * MISRA C++:2008 Rule 2-10-4
 * A class, union or enum name (including qualification, if any) shall be a unique identifier
 *
 * NOTE: This is a stub implementation. Full implementation requires:
 * - Detailed AST analysis for this specific rule
 * - Comprehensive test cases
 * - Integration with the rule engine
 */
class Rule_CPP_2_10_4 {
    id = 'MISRA-CPP-2.10.4';
    description = 'A class, union or enum name (including qualification, if any) shall be a unique identifier';
    severity = 'required';
    category = 'Identifiers';
    language = 'CPP';
    async check(ast, sourceCode) {
        // Stub implementation - returns no violations
        // TODO: Implement full rule checking logic
        return [];
    }
}
exports.Rule_CPP_2_10_4 = Rule_CPP_2_10_4;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0yLTEwLTQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTItMTAtNC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFJQTs7Ozs7Ozs7R0FRRztBQUNILE1BQWEsZUFBZTtJQUMxQixFQUFFLEdBQUcsa0JBQWtCLENBQUM7SUFDeEIsV0FBVyxHQUFHLDRGQUE0RixDQUFDO0lBQzNHLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxhQUFhLENBQUM7SUFDekIsUUFBUSxHQUFHLEtBQWMsQ0FBQztJQUUxQixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0Qyw4Q0FBOEM7UUFDOUMsMkNBQTJDO1FBQzNDLE9BQU8sRUFBRSxDQUFDO0lBQ1osQ0FBQztDQUNGO0FBWkQsMENBWUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcblxuLyoqXG4gKiBNSVNSQSBDKys6MjAwOCBSdWxlIDItMTAtNFxuICogQSBjbGFzcywgdW5pb24gb3IgZW51bSBuYW1lIChpbmNsdWRpbmcgcXVhbGlmaWNhdGlvbiwgaWYgYW55KSBzaGFsbCBiZSBhIHVuaXF1ZSBpZGVudGlmaWVyXG4gKiBcbiAqIE5PVEU6IFRoaXMgaXMgYSBzdHViIGltcGxlbWVudGF0aW9uLiBGdWxsIGltcGxlbWVudGF0aW9uIHJlcXVpcmVzOlxuICogLSBEZXRhaWxlZCBBU1QgYW5hbHlzaXMgZm9yIHRoaXMgc3BlY2lmaWMgcnVsZVxuICogLSBDb21wcmVoZW5zaXZlIHRlc3QgY2FzZXNcbiAqIC0gSW50ZWdyYXRpb24gd2l0aCB0aGUgcnVsZSBlbmdpbmVcbiAqL1xuZXhwb3J0IGNsYXNzIFJ1bGVfQ1BQXzJfMTBfNCBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XG4gIGlkID0gJ01JU1JBLUNQUC0yLjEwLjQnO1xuICBkZXNjcmlwdGlvbiA9ICdBIGNsYXNzLCB1bmlvbiBvciBlbnVtIG5hbWUgKGluY2x1ZGluZyBxdWFsaWZpY2F0aW9uLCBpZiBhbnkpIHNoYWxsIGJlIGEgdW5pcXVlIGlkZW50aWZpZXInO1xuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XG4gIGNhdGVnb3J5ID0gJ0lkZW50aWZpZXJzJztcbiAgbGFuZ3VhZ2UgPSAnQ1BQJyBhcyBjb25zdDtcblxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xuICAgIC8vIFN0dWIgaW1wbGVtZW50YXRpb24gLSByZXR1cm5zIG5vIHZpb2xhdGlvbnNcbiAgICAvLyBUT0RPOiBJbXBsZW1lbnQgZnVsbCBydWxlIGNoZWNraW5nIGxvZ2ljXG4gICAgcmV0dXJuIFtdO1xuICB9XG59XG4iXX0=