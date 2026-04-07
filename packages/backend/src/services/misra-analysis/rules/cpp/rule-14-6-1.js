"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_14_6_1 = void 0;
/**
 * MISRA C++:2008 Rule 14-6-1
 * In a class template with a dependent base, any name that may be found in that dependent base shall be referred to using a qualified-id or this->
 *
 * NOTE: This is a stub implementation. Full implementation requires:
 * - Detailed AST analysis for this specific rule
 * - Comprehensive test cases
 * - Integration with the rule engine
 */
class Rule_CPP_14_6_1 {
    id = 'MISRA-CPP-14.6.1';
    description = 'In a class template with a dependent base, any name that may be found in that dependent base shall be referred to using a qualified-id or this->';
    severity = 'required';
    category = 'Templates';
    language = 'CPP';
    async check(ast, sourceCode) {
        // Stub implementation - returns no violations
        // TODO: Implement full rule checking logic
        return [];
    }
}
exports.Rule_CPP_14_6_1 = Rule_CPP_14_6_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xNC02LTEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTE0LTYtMS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFJQTs7Ozs7Ozs7R0FRRztBQUNILE1BQWEsZUFBZTtJQUMxQixFQUFFLEdBQUcsa0JBQWtCLENBQUM7SUFDeEIsV0FBVyxHQUFHLGtKQUFrSixDQUFDO0lBQ2pLLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxXQUFXLENBQUM7SUFDdkIsUUFBUSxHQUFHLEtBQWMsQ0FBQztJQUUxQixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0Qyw4Q0FBOEM7UUFDOUMsMkNBQTJDO1FBQzNDLE9BQU8sRUFBRSxDQUFDO0lBQ1osQ0FBQztDQUNGO0FBWkQsMENBWUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcblxuLyoqXG4gKiBNSVNSQSBDKys6MjAwOCBSdWxlIDE0LTYtMVxuICogSW4gYSBjbGFzcyB0ZW1wbGF0ZSB3aXRoIGEgZGVwZW5kZW50IGJhc2UsIGFueSBuYW1lIHRoYXQgbWF5IGJlIGZvdW5kIGluIHRoYXQgZGVwZW5kZW50IGJhc2Ugc2hhbGwgYmUgcmVmZXJyZWQgdG8gdXNpbmcgYSBxdWFsaWZpZWQtaWQgb3IgdGhpcy0+XG4gKiBcbiAqIE5PVEU6IFRoaXMgaXMgYSBzdHViIGltcGxlbWVudGF0aW9uLiBGdWxsIGltcGxlbWVudGF0aW9uIHJlcXVpcmVzOlxuICogLSBEZXRhaWxlZCBBU1QgYW5hbHlzaXMgZm9yIHRoaXMgc3BlY2lmaWMgcnVsZVxuICogLSBDb21wcmVoZW5zaXZlIHRlc3QgY2FzZXNcbiAqIC0gSW50ZWdyYXRpb24gd2l0aCB0aGUgcnVsZSBlbmdpbmVcbiAqL1xuZXhwb3J0IGNsYXNzIFJ1bGVfQ1BQXzE0XzZfMSBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XG4gIGlkID0gJ01JU1JBLUNQUC0xNC42LjEnO1xuICBkZXNjcmlwdGlvbiA9ICdJbiBhIGNsYXNzIHRlbXBsYXRlIHdpdGggYSBkZXBlbmRlbnQgYmFzZSwgYW55IG5hbWUgdGhhdCBtYXkgYmUgZm91bmQgaW4gdGhhdCBkZXBlbmRlbnQgYmFzZSBzaGFsbCBiZSByZWZlcnJlZCB0byB1c2luZyBhIHF1YWxpZmllZC1pZCBvciB0aGlzLT4nO1xuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XG4gIGNhdGVnb3J5ID0gJ1RlbXBsYXRlcyc7XG4gIGxhbmd1YWdlID0gJ0NQUCcgYXMgY29uc3Q7XG5cbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcbiAgICAvLyBTdHViIGltcGxlbWVudGF0aW9uIC0gcmV0dXJucyBubyB2aW9sYXRpb25zXG4gICAgLy8gVE9ETzogSW1wbGVtZW50IGZ1bGwgcnVsZSBjaGVja2luZyBsb2dpY1xuICAgIHJldHVybiBbXTtcbiAgfVxufVxuIl19