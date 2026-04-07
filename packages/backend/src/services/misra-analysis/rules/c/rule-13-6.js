"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_13_6 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 13.6
 * The operand of the sizeof operator shall not contain any expression which has potential side effects.
 */
class Rule_C_13_6 {
    id = 'MISRA-C-13.6';
    description = 'The operand of the sizeof operator shall not contain any expression which has potential side effects';
    severity = 'required';
    category = 'Side effects';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Check for sizeof with side effects
            const sizeofMatch = line.match(/sizeof\s*\(([^)]+)\)/);
            if (sizeofMatch) {
                const operand = sizeofMatch[1];
                // Check for increment/decrement
                if (operand.includes('++') || operand.includes('--')) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'sizeof operand contains side effects (++/--)', line));
                }
                // Check for assignment
                if (operand.match(/\w+\s*[+\-*/%&|^]?=/)) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'sizeof operand contains assignment', line));
                }
                // Check for function calls (may have side effects)
                if (operand.match(/\w+\s*\(/)) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'sizeof operand contains function call with potential side effects', line));
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_13_6 = Rule_C_13_6;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xMy02LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xMy02LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7O0dBR0c7QUFDSCxNQUFhLFdBQVc7SUFDdEIsRUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQixXQUFXLEdBQUcsc0dBQXNHLENBQUM7SUFDckgsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLGNBQWMsQ0FBQztJQUMxQixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFFbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVqQyxxQ0FBcUM7WUFDckMsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1lBQ3ZELElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ2hCLE1BQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFFL0IsZ0NBQWdDO2dCQUNoQyxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUNyRCxVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0QsOENBQThDLEVBQzlDLElBQUksQ0FDTCxDQUNGLENBQUM7Z0JBQ0osQ0FBQztnQkFFRCx1QkFBdUI7Z0JBQ3ZCLElBQUksT0FBTyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUM7b0JBQ3pDLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCxvQ0FBb0MsRUFDcEMsSUFBSSxDQUNMLENBQ0YsQ0FBQztnQkFDSixDQUFDO2dCQUVELG1EQUFtRDtnQkFDbkQsSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7b0JBQzlCLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCxtRUFBbUUsRUFDbkUsSUFBSSxDQUNMLENBQ0YsQ0FBQztnQkFDSixDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUE3REQsa0NBNkRDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEM6MjAxMiBSdWxlIDEzLjZcclxuICogVGhlIG9wZXJhbmQgb2YgdGhlIHNpemVvZiBvcGVyYXRvciBzaGFsbCBub3QgY29udGFpbiBhbnkgZXhwcmVzc2lvbiB3aGljaCBoYXMgcG90ZW50aWFsIHNpZGUgZWZmZWN0cy5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMTNfNiBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0xMy42JztcclxuICBkZXNjcmlwdGlvbiA9ICdUaGUgb3BlcmFuZCBvZiB0aGUgc2l6ZW9mIG9wZXJhdG9yIHNoYWxsIG5vdCBjb250YWluIGFueSBleHByZXNzaW9uIHdoaWNoIGhhcyBwb3RlbnRpYWwgc2lkZSBlZmZlY3RzJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnU2lkZSBlZmZlY3RzJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhc3QubGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGFzdC5saW5lc1tpXS50cmltKCk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBDaGVjayBmb3Igc2l6ZW9mIHdpdGggc2lkZSBlZmZlY3RzXHJcbiAgICAgIGNvbnN0IHNpemVvZk1hdGNoID0gbGluZS5tYXRjaCgvc2l6ZW9mXFxzKlxcKChbXildKylcXCkvKTtcclxuICAgICAgaWYgKHNpemVvZk1hdGNoKSB7XHJcbiAgICAgICAgY29uc3Qgb3BlcmFuZCA9IHNpemVvZk1hdGNoWzFdO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIENoZWNrIGZvciBpbmNyZW1lbnQvZGVjcmVtZW50XHJcbiAgICAgICAgaWYgKG9wZXJhbmQuaW5jbHVkZXMoJysrJykgfHwgb3BlcmFuZC5pbmNsdWRlcygnLS0nKSkge1xyXG4gICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAgICdzaXplb2Ygb3BlcmFuZCBjb250YWlucyBzaWRlIGVmZmVjdHMgKCsrLy0tKScsXHJcbiAgICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyBDaGVjayBmb3IgYXNzaWdubWVudFxyXG4gICAgICAgIGlmIChvcGVyYW5kLm1hdGNoKC9cXHcrXFxzKlsrXFwtKi8lJnxeXT89LykpIHtcclxuICAgICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgICAnc2l6ZW9mIG9wZXJhbmQgY29udGFpbnMgYXNzaWdubWVudCcsXHJcbiAgICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyBDaGVjayBmb3IgZnVuY3Rpb24gY2FsbHMgKG1heSBoYXZlIHNpZGUgZWZmZWN0cylcclxuICAgICAgICBpZiAob3BlcmFuZC5tYXRjaCgvXFx3K1xccypcXCgvKSkge1xyXG4gICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAgICdzaXplb2Ygb3BlcmFuZCBjb250YWlucyBmdW5jdGlvbiBjYWxsIHdpdGggcG90ZW50aWFsIHNpZGUgZWZmZWN0cycsXHJcbiAgICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=