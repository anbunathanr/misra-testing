"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_18_0_2 = void 0;
/**
 * MISRA C++:2008 Rule 18-0-2
 * The library functions atof, atoi and atol from library <cstdlib> shall not be used
 *
 * NOTE: This is a stub implementation. Full implementation requires:
 * - Detailed AST analysis for this specific rule
 * - Comprehensive test cases
 * - Integration with the rule engine
 */
class Rule_CPP_18_0_2 {
    id = 'MISRA-CPP-18.0.2';
    description = 'The library functions atof, atoi and atol from library <cstdlib> shall not be used';
    severity = 'required';
    category = 'Library';
    language = 'CPP';
    async check(ast, sourceCode) {
        // Stub implementation - returns no violations
        // TODO: Implement full rule checking logic
        return [];
    }
}
exports.Rule_CPP_18_0_2 = Rule_CPP_18_0_2;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xOC0wLTIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTE4LTAtMi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFJQTs7Ozs7Ozs7R0FRRztBQUNILE1BQWEsZUFBZTtJQUMxQixFQUFFLEdBQUcsa0JBQWtCLENBQUM7SUFDeEIsV0FBVyxHQUFHLG9GQUFvRixDQUFDO0lBQ25HLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxTQUFTLENBQUM7SUFDckIsUUFBUSxHQUFHLEtBQWMsQ0FBQztJQUUxQixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0Qyw4Q0FBOEM7UUFDOUMsMkNBQTJDO1FBQzNDLE9BQU8sRUFBRSxDQUFDO0lBQ1osQ0FBQztDQUNGO0FBWkQsMENBWUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcblxuLyoqXG4gKiBNSVNSQSBDKys6MjAwOCBSdWxlIDE4LTAtMlxuICogVGhlIGxpYnJhcnkgZnVuY3Rpb25zIGF0b2YsIGF0b2kgYW5kIGF0b2wgZnJvbSBsaWJyYXJ5IDxjc3RkbGliPiBzaGFsbCBub3QgYmUgdXNlZFxuICogXG4gKiBOT1RFOiBUaGlzIGlzIGEgc3R1YiBpbXBsZW1lbnRhdGlvbi4gRnVsbCBpbXBsZW1lbnRhdGlvbiByZXF1aXJlczpcbiAqIC0gRGV0YWlsZWQgQVNUIGFuYWx5c2lzIGZvciB0aGlzIHNwZWNpZmljIHJ1bGVcbiAqIC0gQ29tcHJlaGVuc2l2ZSB0ZXN0IGNhc2VzXG4gKiAtIEludGVncmF0aW9uIHdpdGggdGhlIHJ1bGUgZW5naW5lXG4gKi9cbmV4cG9ydCBjbGFzcyBSdWxlX0NQUF8xOF8wXzIgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xuICBpZCA9ICdNSVNSQS1DUFAtMTguMC4yJztcbiAgZGVzY3JpcHRpb24gPSAnVGhlIGxpYnJhcnkgZnVuY3Rpb25zIGF0b2YsIGF0b2kgYW5kIGF0b2wgZnJvbSBsaWJyYXJ5IDxjc3RkbGliPiBzaGFsbCBub3QgYmUgdXNlZCc7XG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcbiAgY2F0ZWdvcnkgPSAnTGlicmFyeSc7XG4gIGxhbmd1YWdlID0gJ0NQUCcgYXMgY29uc3Q7XG5cbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcbiAgICAvLyBTdHViIGltcGxlbWVudGF0aW9uIC0gcmV0dXJucyBubyB2aW9sYXRpb25zXG4gICAgLy8gVE9ETzogSW1wbGVtZW50IGZ1bGwgcnVsZSBjaGVja2luZyBsb2dpY1xuICAgIHJldHVybiBbXTtcbiAgfVxufVxuIl19