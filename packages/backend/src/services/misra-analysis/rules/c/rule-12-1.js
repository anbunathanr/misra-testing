"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_12_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 12.1
 * The precedence of operators within expressions should be made explicit.
 * Detects expressions that rely on implicit operator precedence without parentheses.
 */
class Rule_C_12_1 {
    id = 'MISRA-C-12.1';
    description = 'The precedence of operators within expressions should be made explicit';
    severity = 'advisory';
    category = 'Expressions';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Detect mixed arithmetic/bitwise without parentheses:
        // e.g. a + b * c, a | b & c, a + b << c
        const mixedPrecedenceRegex = /\b\w+\s*[+\-]\s*\w+\s*[*\/]\s*\w+|\b\w+\s*\|\s*\w+\s*&\s*\w+|\b\w+\s*[+\-]\s*\w+\s*<<\s*\w+/;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#') || line.startsWith('//') || !line)
                continue;
            if (mixedPrecedenceRegex.test(line)) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Expression relies on implicit operator precedence; use parentheses to make precedence explicit', line));
            }
        }
        return violations;
    }
}
exports.Rule_C_12_1 = Rule_C_12_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xMi0xLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xMi0xLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7OztHQUlHO0FBQ0gsTUFBYSxXQUFXO0lBQ3RCLEVBQUUsR0FBRyxjQUFjLENBQUM7SUFDcEIsV0FBVyxHQUFHLHdFQUF3RSxDQUFDO0lBQ3ZGLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxhQUFhLENBQUM7SUFDekIsUUFBUSxHQUFHLEdBQVksQ0FBQztJQUV4QixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7UUFFeEIsdURBQXVEO1FBQ3ZELHdDQUF3QztRQUN4QyxNQUFNLG9CQUFvQixHQUFHLDZGQUE2RixDQUFDO1FBRTNILEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdEMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBRTdCLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSTtnQkFBRSxTQUFTO1lBRXJFLElBQUksb0JBQW9CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ3BDLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCxnR0FBZ0csRUFDaEcsSUFBSSxDQUNMLENBQ0YsQ0FBQztZQUNKLENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBbkNELGtDQW1DQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDOjIwMTIgUnVsZSAxMi4xXHJcbiAqIFRoZSBwcmVjZWRlbmNlIG9mIG9wZXJhdG9ycyB3aXRoaW4gZXhwcmVzc2lvbnMgc2hvdWxkIGJlIG1hZGUgZXhwbGljaXQuXHJcbiAqIERldGVjdHMgZXhwcmVzc2lvbnMgdGhhdCByZWx5IG9uIGltcGxpY2l0IG9wZXJhdG9yIHByZWNlZGVuY2Ugd2l0aG91dCBwYXJlbnRoZXNlcy5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMTJfMSBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0xMi4xJztcclxuICBkZXNjcmlwdGlvbiA9ICdUaGUgcHJlY2VkZW5jZSBvZiBvcGVyYXRvcnMgd2l0aGluIGV4cHJlc3Npb25zIHNob3VsZCBiZSBtYWRlIGV4cGxpY2l0JztcclxuICBzZXZlcml0eSA9ICdhZHZpc29yeScgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnRXhwcmVzc2lvbnMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuICAgIGNvbnN0IGxpbmVzID0gYXN0LmxpbmVzO1xyXG5cclxuICAgIC8vIERldGVjdCBtaXhlZCBhcml0aG1ldGljL2JpdHdpc2Ugd2l0aG91dCBwYXJlbnRoZXNlczpcclxuICAgIC8vIGUuZy4gYSArIGIgKiBjLCBhIHwgYiAmIGMsIGEgKyBiIDw8IGNcclxuICAgIGNvbnN0IG1peGVkUHJlY2VkZW5jZVJlZ2V4ID0gL1xcYlxcdytcXHMqWytcXC1dXFxzKlxcdytcXHMqWypcXC9dXFxzKlxcdyt8XFxiXFx3K1xccypcXHxcXHMqXFx3K1xccyomXFxzKlxcdyt8XFxiXFx3K1xccypbK1xcLV1cXHMqXFx3K1xccyo8PFxccypcXHcrLztcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBsaW5lc1tpXS50cmltKCk7XHJcblxyXG4gICAgICBpZiAobGluZS5zdGFydHNXaXRoKCcjJykgfHwgbGluZS5zdGFydHNXaXRoKCcvLycpIHx8ICFsaW5lKSBjb250aW51ZTtcclxuXHJcbiAgICAgIGlmIChtaXhlZFByZWNlZGVuY2VSZWdleC50ZXN0KGxpbmUpKSB7XHJcbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgJ0V4cHJlc3Npb24gcmVsaWVzIG9uIGltcGxpY2l0IG9wZXJhdG9yIHByZWNlZGVuY2U7IHVzZSBwYXJlbnRoZXNlcyB0byBtYWtlIHByZWNlZGVuY2UgZXhwbGljaXQnLFxyXG4gICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=