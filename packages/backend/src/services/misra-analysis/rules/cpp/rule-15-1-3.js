"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_15_1_3 = void 0;
/**
 * MISRA C++:2008 Rule 15-1-3
 * An empty throw (throw;) shall only be used in the compound-statement of a catch handler
 *
 * NOTE: This is a stub implementation. Full implementation requires:
 * - Detailed AST analysis for this specific rule
 * - Comprehensive test cases
 * - Integration with the rule engine
 */
class Rule_CPP_15_1_3 {
    id = 'MISRA-CPP-15.1.3';
    description = 'An empty throw (throw;) shall only be used in the compound-statement of a catch handler';
    severity = 'required';
    category = 'Exceptions';
    language = 'CPP';
    async check(ast, sourceCode) {
        // Stub implementation - returns no violations
        // TODO: Implement full rule checking logic
        return [];
    }
}
exports.Rule_CPP_15_1_3 = Rule_CPP_15_1_3;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xNS0xLTMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTE1LTEtMy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFJQTs7Ozs7Ozs7R0FRRztBQUNILE1BQWEsZUFBZTtJQUMxQixFQUFFLEdBQUcsa0JBQWtCLENBQUM7SUFDeEIsV0FBVyxHQUFHLHlGQUF5RixDQUFDO0lBQ3hHLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxZQUFZLENBQUM7SUFDeEIsUUFBUSxHQUFHLEtBQWMsQ0FBQztJQUUxQixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0Qyw4Q0FBOEM7UUFDOUMsMkNBQTJDO1FBQzNDLE9BQU8sRUFBRSxDQUFDO0lBQ1osQ0FBQztDQUNGO0FBWkQsMENBWUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcblxuLyoqXG4gKiBNSVNSQSBDKys6MjAwOCBSdWxlIDE1LTEtM1xuICogQW4gZW1wdHkgdGhyb3cgKHRocm93Oykgc2hhbGwgb25seSBiZSB1c2VkIGluIHRoZSBjb21wb3VuZC1zdGF0ZW1lbnQgb2YgYSBjYXRjaCBoYW5kbGVyXG4gKiBcbiAqIE5PVEU6IFRoaXMgaXMgYSBzdHViIGltcGxlbWVudGF0aW9uLiBGdWxsIGltcGxlbWVudGF0aW9uIHJlcXVpcmVzOlxuICogLSBEZXRhaWxlZCBBU1QgYW5hbHlzaXMgZm9yIHRoaXMgc3BlY2lmaWMgcnVsZVxuICogLSBDb21wcmVoZW5zaXZlIHRlc3QgY2FzZXNcbiAqIC0gSW50ZWdyYXRpb24gd2l0aCB0aGUgcnVsZSBlbmdpbmVcbiAqL1xuZXhwb3J0IGNsYXNzIFJ1bGVfQ1BQXzE1XzFfMyBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XG4gIGlkID0gJ01JU1JBLUNQUC0xNS4xLjMnO1xuICBkZXNjcmlwdGlvbiA9ICdBbiBlbXB0eSB0aHJvdyAodGhyb3c7KSBzaGFsbCBvbmx5IGJlIHVzZWQgaW4gdGhlIGNvbXBvdW5kLXN0YXRlbWVudCBvZiBhIGNhdGNoIGhhbmRsZXInO1xuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XG4gIGNhdGVnb3J5ID0gJ0V4Y2VwdGlvbnMnO1xuICBsYW5ndWFnZSA9ICdDUFAnIGFzIGNvbnN0O1xuXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XG4gICAgLy8gU3R1YiBpbXBsZW1lbnRhdGlvbiAtIHJldHVybnMgbm8gdmlvbGF0aW9uc1xuICAgIC8vIFRPRE86IEltcGxlbWVudCBmdWxsIHJ1bGUgY2hlY2tpbmcgbG9naWNcbiAgICByZXR1cm4gW107XG4gIH1cbn1cbiJdfQ==