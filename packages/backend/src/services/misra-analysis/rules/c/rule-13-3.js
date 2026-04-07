"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_13_3 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 13.3
 * A full expression containing an increment (++) or decrement (--) operator
 * should have no other potential side effects other than that caused by the
 * increment or decrement operator.
 * Detects ++ or -- used as sub-expressions (e.g., a = b++).
 */
class Rule_C_13_3 {
    id = 'MISRA-C-13.3';
    description = 'A full expression containing an increment or decrement operator should have no other potential side effects';
    severity = 'advisory';
    category = 'Side effects';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Detect ++ or -- used as part of a larger expression (not standalone statement)
        // e.g.: a = b++; x = ++y + 1; foo(i++);
        const incDecInExprRegex = /(?:=\s*[^;]*(?:\+\+|--)|(?:\+\+|--)[^;]*=|[^;]*(?:\+\+|--)[^;]*[+\-*\/&|])/;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#') || line.startsWith('//') || !line)
                continue;
            // Skip standalone increment/decrement statements like: i++; or ++i;
            if (/^\w+\s*(?:\+\+|--);\s*$/.test(line) || /^(?:\+\+|--)\s*\w+;\s*$/.test(line))
                continue;
            if (incDecInExprRegex.test(line) && (line.includes('++') || line.includes('--'))) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Increment/decrement operator used within a larger expression', line));
            }
        }
        return violations;
    }
}
exports.Rule_C_13_3 = Rule_C_13_3;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xMy0zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xMy0zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7Ozs7O0dBTUc7QUFDSCxNQUFhLFdBQVc7SUFDdEIsRUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQixXQUFXLEdBQUcsNkdBQTZHLENBQUM7SUFDNUgsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLGNBQWMsQ0FBQztJQUMxQixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFDbkMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQztRQUV4QixpRkFBaUY7UUFDakYsd0NBQXdDO1FBQ3hDLE1BQU0saUJBQWlCLEdBQUcsNEVBQTRFLENBQUM7UUFFdkcsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN0QyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFFN0IsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJO2dCQUFFLFNBQVM7WUFFckUsb0VBQW9FO1lBQ3BFLElBQUkseUJBQXlCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLHlCQUF5QixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7Z0JBQUUsU0FBUztZQUUzRixJQUFJLGlCQUFpQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ2pGLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCw4REFBOEQsRUFDOUQsSUFBSSxDQUNMLENBQ0YsQ0FBQztZQUNKLENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBdENELGtDQXNDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDOjIwMTIgUnVsZSAxMy4zXHJcbiAqIEEgZnVsbCBleHByZXNzaW9uIGNvbnRhaW5pbmcgYW4gaW5jcmVtZW50ICgrKykgb3IgZGVjcmVtZW50ICgtLSkgb3BlcmF0b3JcclxuICogc2hvdWxkIGhhdmUgbm8gb3RoZXIgcG90ZW50aWFsIHNpZGUgZWZmZWN0cyBvdGhlciB0aGFuIHRoYXQgY2F1c2VkIGJ5IHRoZVxyXG4gKiBpbmNyZW1lbnQgb3IgZGVjcmVtZW50IG9wZXJhdG9yLlxyXG4gKiBEZXRlY3RzICsrIG9yIC0tIHVzZWQgYXMgc3ViLWV4cHJlc3Npb25zIChlLmcuLCBhID0gYisrKS5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMTNfMyBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0xMy4zJztcclxuICBkZXNjcmlwdGlvbiA9ICdBIGZ1bGwgZXhwcmVzc2lvbiBjb250YWluaW5nIGFuIGluY3JlbWVudCBvciBkZWNyZW1lbnQgb3BlcmF0b3Igc2hvdWxkIGhhdmUgbm8gb3RoZXIgcG90ZW50aWFsIHNpZGUgZWZmZWN0cyc7XHJcbiAgc2V2ZXJpdHkgPSAnYWR2aXNvcnknIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ1NpZGUgZWZmZWN0cyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG4gICAgY29uc3QgbGluZXMgPSBhc3QubGluZXM7XHJcblxyXG4gICAgLy8gRGV0ZWN0ICsrIG9yIC0tIHVzZWQgYXMgcGFydCBvZiBhIGxhcmdlciBleHByZXNzaW9uIChub3Qgc3RhbmRhbG9uZSBzdGF0ZW1lbnQpXHJcbiAgICAvLyBlLmcuOiBhID0gYisrOyB4ID0gKyt5ICsgMTsgZm9vKGkrKyk7XHJcbiAgICBjb25zdCBpbmNEZWNJbkV4cHJSZWdleCA9IC8oPzo9XFxzKlteO10qKD86XFwrXFwrfC0tKXwoPzpcXCtcXCt8LS0pW147XSo9fFteO10qKD86XFwrXFwrfC0tKVteO10qWytcXC0qXFwvJnxdKS87XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gbGluZXNbaV0udHJpbSgpO1xyXG5cclxuICAgICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnIycpIHx8IGxpbmUuc3RhcnRzV2l0aCgnLy8nKSB8fCAhbGluZSkgY29udGludWU7XHJcblxyXG4gICAgICAvLyBTa2lwIHN0YW5kYWxvbmUgaW5jcmVtZW50L2RlY3JlbWVudCBzdGF0ZW1lbnRzIGxpa2U6IGkrKzsgb3IgKytpO1xyXG4gICAgICBpZiAoL15cXHcrXFxzKig/OlxcK1xcK3wtLSk7XFxzKiQvLnRlc3QobGluZSkgfHwgL14oPzpcXCtcXCt8LS0pXFxzKlxcdys7XFxzKiQvLnRlc3QobGluZSkpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgaWYgKGluY0RlY0luRXhwclJlZ2V4LnRlc3QobGluZSkgJiYgKGxpbmUuaW5jbHVkZXMoJysrJykgfHwgbGluZS5pbmNsdWRlcygnLS0nKSkpIHtcclxuICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAnSW5jcmVtZW50L2RlY3JlbWVudCBvcGVyYXRvciB1c2VkIHdpdGhpbiBhIGxhcmdlciBleHByZXNzaW9uJyxcclxuICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgKVxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19