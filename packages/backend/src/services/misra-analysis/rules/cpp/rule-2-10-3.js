"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_2_10_3 = void 0;
/**
 * MISRA C++:2008 Rule 2-10-3
 * A typedef name (including qualification, if any) shall be a unique identifier
 *
 * NOTE: This is a stub implementation. Full implementation requires:
 * - Detailed AST analysis for this specific rule
 * - Comprehensive test cases
 * - Integration with the rule engine
 */
class Rule_CPP_2_10_3 {
    id = 'MISRA-CPP-2.10.3';
    description = 'A typedef name (including qualification, if any) shall be a unique identifier';
    severity = 'required';
    category = 'Identifiers';
    language = 'CPP';
    async check(ast, sourceCode) {
        // Stub implementation - returns no violations
        // TODO: Implement full rule checking logic
        return [];
    }
}
exports.Rule_CPP_2_10_3 = Rule_CPP_2_10_3;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0yLTEwLTMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTItMTAtMy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFJQTs7Ozs7Ozs7R0FRRztBQUNILE1BQWEsZUFBZTtJQUMxQixFQUFFLEdBQUcsa0JBQWtCLENBQUM7SUFDeEIsV0FBVyxHQUFHLCtFQUErRSxDQUFDO0lBQzlGLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxhQUFhLENBQUM7SUFDekIsUUFBUSxHQUFHLEtBQWMsQ0FBQztJQUUxQixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0Qyw4Q0FBOEM7UUFDOUMsMkNBQTJDO1FBQzNDLE9BQU8sRUFBRSxDQUFDO0lBQ1osQ0FBQztDQUNGO0FBWkQsMENBWUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcblxuLyoqXG4gKiBNSVNSQSBDKys6MjAwOCBSdWxlIDItMTAtM1xuICogQSB0eXBlZGVmIG5hbWUgKGluY2x1ZGluZyBxdWFsaWZpY2F0aW9uLCBpZiBhbnkpIHNoYWxsIGJlIGEgdW5pcXVlIGlkZW50aWZpZXJcbiAqIFxuICogTk9URTogVGhpcyBpcyBhIHN0dWIgaW1wbGVtZW50YXRpb24uIEZ1bGwgaW1wbGVtZW50YXRpb24gcmVxdWlyZXM6XG4gKiAtIERldGFpbGVkIEFTVCBhbmFseXNpcyBmb3IgdGhpcyBzcGVjaWZpYyBydWxlXG4gKiAtIENvbXByZWhlbnNpdmUgdGVzdCBjYXNlc1xuICogLSBJbnRlZ3JhdGlvbiB3aXRoIHRoZSBydWxlIGVuZ2luZVxuICovXG5leHBvcnQgY2xhc3MgUnVsZV9DUFBfMl8xMF8zIGltcGxlbWVudHMgTUlTUkFSdWxlIHtcbiAgaWQgPSAnTUlTUkEtQ1BQLTIuMTAuMyc7XG4gIGRlc2NyaXB0aW9uID0gJ0EgdHlwZWRlZiBuYW1lIChpbmNsdWRpbmcgcXVhbGlmaWNhdGlvbiwgaWYgYW55KSBzaGFsbCBiZSBhIHVuaXF1ZSBpZGVudGlmaWVyJztcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xuICBjYXRlZ29yeSA9ICdJZGVudGlmaWVycyc7XG4gIGxhbmd1YWdlID0gJ0NQUCcgYXMgY29uc3Q7XG5cbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcbiAgICAvLyBTdHViIGltcGxlbWVudGF0aW9uIC0gcmV0dXJucyBubyB2aW9sYXRpb25zXG4gICAgLy8gVE9ETzogSW1wbGVtZW50IGZ1bGwgcnVsZSBjaGVja2luZyBsb2dpY1xuICAgIHJldHVybiBbXTtcbiAgfVxufVxuIl19