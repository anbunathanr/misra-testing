"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_13_2 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 13.2
 * The value of an expression and its persistent side effects shall be the same under all permitted evaluation orders.
 */
class Rule_C_13_2 {
    id = 'MISRA-C-13.2';
    description = 'The value of an expression and its persistent side effects shall be the same under all permitted evaluation orders';
    severity = 'required';
    category = 'Side effects';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Check for multiple modifications of same variable in expression
            // e.g., x = x++ or a[i] = i++
            const varModPattern = /(\w+)\s*=.*\1\s*(\+\+|--)/;
            if (varModPattern.test(line)) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Variable modified multiple times in expression with undefined evaluation order', line));
            }
            // Check for function calls with side effects in same expression
            // e.g., f(x++) + g(x)
            const funcCallsWithSideEffects = line.match(/\w+\([^)]*(\+\+|--)[^)]*\).*\w+\(/);
            if (funcCallsWithSideEffects) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Expression contains side effects with undefined evaluation order', line));
            }
        }
        return violations;
    }
}
exports.Rule_C_13_2 = Rule_C_13_2;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xMy0yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xMy0yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7O0dBR0c7QUFDSCxNQUFhLFdBQVc7SUFDdEIsRUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQixXQUFXLEdBQUcsb0hBQW9ILENBQUM7SUFDbkksUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLGNBQWMsQ0FBQztJQUMxQixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFFbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVqQyxrRUFBa0U7WUFDbEUsOEJBQThCO1lBQzlCLE1BQU0sYUFBYSxHQUFHLDJCQUEyQixDQUFDO1lBQ2xELElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUM3QixVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0QsZ0ZBQWdGLEVBQ2hGLElBQUksQ0FDTCxDQUNGLENBQUM7WUFDSixDQUFDO1lBRUQsZ0VBQWdFO1lBQ2hFLHNCQUFzQjtZQUN0QixNQUFNLHdCQUF3QixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsbUNBQW1DLENBQUMsQ0FBQztZQUNqRixJQUFJLHdCQUF3QixFQUFFLENBQUM7Z0JBQzdCLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCxrRUFBa0UsRUFDbEUsSUFBSSxDQUNMLENBQ0YsQ0FBQztZQUNKLENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBOUNELGtDQThDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDOjIwMTIgUnVsZSAxMy4yXHJcbiAqIFRoZSB2YWx1ZSBvZiBhbiBleHByZXNzaW9uIGFuZCBpdHMgcGVyc2lzdGVudCBzaWRlIGVmZmVjdHMgc2hhbGwgYmUgdGhlIHNhbWUgdW5kZXIgYWxsIHBlcm1pdHRlZCBldmFsdWF0aW9uIG9yZGVycy5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMTNfMiBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0xMy4yJztcclxuICBkZXNjcmlwdGlvbiA9ICdUaGUgdmFsdWUgb2YgYW4gZXhwcmVzc2lvbiBhbmQgaXRzIHBlcnNpc3RlbnQgc2lkZSBlZmZlY3RzIHNoYWxsIGJlIHRoZSBzYW1lIHVuZGVyIGFsbCBwZXJtaXR0ZWQgZXZhbHVhdGlvbiBvcmRlcnMnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdTaWRlIGVmZmVjdHMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFzdC5saW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gYXN0LmxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgXHJcbiAgICAgIC8vIENoZWNrIGZvciBtdWx0aXBsZSBtb2RpZmljYXRpb25zIG9mIHNhbWUgdmFyaWFibGUgaW4gZXhwcmVzc2lvblxyXG4gICAgICAvLyBlLmcuLCB4ID0geCsrIG9yIGFbaV0gPSBpKytcclxuICAgICAgY29uc3QgdmFyTW9kUGF0dGVybiA9IC8oXFx3KylcXHMqPS4qXFwxXFxzKihcXCtcXCt8LS0pLztcclxuICAgICAgaWYgKHZhck1vZFBhdHRlcm4udGVzdChsaW5lKSkge1xyXG4gICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICdWYXJpYWJsZSBtb2RpZmllZCBtdWx0aXBsZSB0aW1lcyBpbiBleHByZXNzaW9uIHdpdGggdW5kZWZpbmVkIGV2YWx1YXRpb24gb3JkZXInLFxyXG4gICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gQ2hlY2sgZm9yIGZ1bmN0aW9uIGNhbGxzIHdpdGggc2lkZSBlZmZlY3RzIGluIHNhbWUgZXhwcmVzc2lvblxyXG4gICAgICAvLyBlLmcuLCBmKHgrKykgKyBnKHgpXHJcbiAgICAgIGNvbnN0IGZ1bmNDYWxsc1dpdGhTaWRlRWZmZWN0cyA9IGxpbmUubWF0Y2goL1xcdytcXChbXildKihcXCtcXCt8LS0pW14pXSpcXCkuKlxcdytcXCgvKTtcclxuICAgICAgaWYgKGZ1bmNDYWxsc1dpdGhTaWRlRWZmZWN0cykge1xyXG4gICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICdFeHByZXNzaW9uIGNvbnRhaW5zIHNpZGUgZWZmZWN0cyB3aXRoIHVuZGVmaW5lZCBldmFsdWF0aW9uIG9yZGVyJyxcclxuICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgKVxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19