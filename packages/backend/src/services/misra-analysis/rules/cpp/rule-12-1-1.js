"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_12_1_1 = void 0;
/**
 * MISRA C++:2008 Rule 12-1-1
 * An object's dynamic type shall not be used from the body of its constructor or destructor
 *
 * NOTE: This is a stub implementation. Full implementation requires:
 * - Detailed AST analysis for this specific rule
 * - Comprehensive test cases
 * - Integration with the rule engine
 */
class Rule_CPP_12_1_1 {
    id = 'MISRA-CPP-12.1.1';
    description = 'An object\'s dynamic type shall not be used from the body of its constructor or destructor';
    severity = 'required';
    category = 'Classes';
    language = 'CPP';
    async check(ast, sourceCode) {
        // Stub implementation - returns no violations
        // TODO: Implement full rule checking logic
        return [];
    }
}
exports.Rule_CPP_12_1_1 = Rule_CPP_12_1_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xMi0xLTEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTEyLTEtMS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFJQTs7Ozs7Ozs7R0FRRztBQUNILE1BQWEsZUFBZTtJQUMxQixFQUFFLEdBQUcsa0JBQWtCLENBQUM7SUFDeEIsV0FBVyxHQUFHLDRGQUE0RixDQUFDO0lBQzNHLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxTQUFTLENBQUM7SUFDckIsUUFBUSxHQUFHLEtBQWMsQ0FBQztJQUUxQixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0Qyw4Q0FBOEM7UUFDOUMsMkNBQTJDO1FBQzNDLE9BQU8sRUFBRSxDQUFDO0lBQ1osQ0FBQztDQUNGO0FBWkQsMENBWUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcblxuLyoqXG4gKiBNSVNSQSBDKys6MjAwOCBSdWxlIDEyLTEtMVxuICogQW4gb2JqZWN0J3MgZHluYW1pYyB0eXBlIHNoYWxsIG5vdCBiZSB1c2VkIGZyb20gdGhlIGJvZHkgb2YgaXRzIGNvbnN0cnVjdG9yIG9yIGRlc3RydWN0b3JcbiAqIFxuICogTk9URTogVGhpcyBpcyBhIHN0dWIgaW1wbGVtZW50YXRpb24uIEZ1bGwgaW1wbGVtZW50YXRpb24gcmVxdWlyZXM6XG4gKiAtIERldGFpbGVkIEFTVCBhbmFseXNpcyBmb3IgdGhpcyBzcGVjaWZpYyBydWxlXG4gKiAtIENvbXByZWhlbnNpdmUgdGVzdCBjYXNlc1xuICogLSBJbnRlZ3JhdGlvbiB3aXRoIHRoZSBydWxlIGVuZ2luZVxuICovXG5leHBvcnQgY2xhc3MgUnVsZV9DUFBfMTJfMV8xIGltcGxlbWVudHMgTUlTUkFSdWxlIHtcbiAgaWQgPSAnTUlTUkEtQ1BQLTEyLjEuMSc7XG4gIGRlc2NyaXB0aW9uID0gJ0FuIG9iamVjdFxcJ3MgZHluYW1pYyB0eXBlIHNoYWxsIG5vdCBiZSB1c2VkIGZyb20gdGhlIGJvZHkgb2YgaXRzIGNvbnN0cnVjdG9yIG9yIGRlc3RydWN0b3InO1xuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XG4gIGNhdGVnb3J5ID0gJ0NsYXNzZXMnO1xuICBsYW5ndWFnZSA9ICdDUFAnIGFzIGNvbnN0O1xuXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XG4gICAgLy8gU3R1YiBpbXBsZW1lbnRhdGlvbiAtIHJldHVybnMgbm8gdmlvbGF0aW9uc1xuICAgIC8vIFRPRE86IEltcGxlbWVudCBmdWxsIHJ1bGUgY2hlY2tpbmcgbG9naWNcbiAgICByZXR1cm4gW107XG4gIH1cbn1cbiJdfQ==