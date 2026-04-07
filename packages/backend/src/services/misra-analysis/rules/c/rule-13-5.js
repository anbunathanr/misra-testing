"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_13_5 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 13.5
 * The right hand operand of a logical && or || operator shall not contain persistent side effects.
 */
class Rule_C_13_5 {
    id = 'MISRA-C-13.5';
    description = 'The right hand operand of a logical && or || operator shall not contain persistent side effects';
    severity = 'required';
    category = 'Side effects';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Check for side effects after && or ||
            const logicalOpMatch = line.match(/(&&|\|\|)\s*(.+)/);
            if (logicalOpMatch) {
                const rightOperand = logicalOpMatch[2];
                // Check for increment/decrement operators
                if (rightOperand.includes('++') || rightOperand.includes('--')) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Right operand of logical operator contains side effects (++/--)', line));
                }
                // Check for assignment operators
                if (rightOperand.match(/\w+\s*[+\-*/%&|^]?=/)) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Right operand of logical operator contains assignment', line));
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_13_5 = Rule_C_13_5;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xMy01LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xMy01LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7O0dBR0c7QUFDSCxNQUFhLFdBQVc7SUFDdEIsRUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQixXQUFXLEdBQUcsaUdBQWlHLENBQUM7SUFDaEgsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLGNBQWMsQ0FBQztJQUMxQixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFFbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVqQyx3Q0FBd0M7WUFDeEMsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1lBQ3RELElBQUksY0FBYyxFQUFFLENBQUM7Z0JBQ25CLE1BQU0sWUFBWSxHQUFHLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFFdkMsMENBQTBDO2dCQUMxQyxJQUFJLFlBQVksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksWUFBWSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUMvRCxVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0QsaUVBQWlFLEVBQ2pFLElBQUksQ0FDTCxDQUNGLENBQUM7Z0JBQ0osQ0FBQztnQkFFRCxpQ0FBaUM7Z0JBQ2pDLElBQUksWUFBWSxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUM7b0JBQzlDLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCx1REFBdUQsRUFDdkQsSUFBSSxDQUNMLENBQ0YsQ0FBQztnQkFDSixDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUFoREQsa0NBZ0RDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEM6MjAxMiBSdWxlIDEzLjVcclxuICogVGhlIHJpZ2h0IGhhbmQgb3BlcmFuZCBvZiBhIGxvZ2ljYWwgJiYgb3IgfHwgb3BlcmF0b3Igc2hhbGwgbm90IGNvbnRhaW4gcGVyc2lzdGVudCBzaWRlIGVmZmVjdHMuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzEzXzUgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMTMuNSc7XHJcbiAgZGVzY3JpcHRpb24gPSAnVGhlIHJpZ2h0IGhhbmQgb3BlcmFuZCBvZiBhIGxvZ2ljYWwgJiYgb3IgfHwgb3BlcmF0b3Igc2hhbGwgbm90IGNvbnRhaW4gcGVyc2lzdGVudCBzaWRlIGVmZmVjdHMnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdTaWRlIGVmZmVjdHMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFzdC5saW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gYXN0LmxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgXHJcbiAgICAgIC8vIENoZWNrIGZvciBzaWRlIGVmZmVjdHMgYWZ0ZXIgJiYgb3IgfHxcclxuICAgICAgY29uc3QgbG9naWNhbE9wTWF0Y2ggPSBsaW5lLm1hdGNoKC8oJiZ8XFx8XFx8KVxccyooLispLyk7XHJcbiAgICAgIGlmIChsb2dpY2FsT3BNYXRjaCkge1xyXG4gICAgICAgIGNvbnN0IHJpZ2h0T3BlcmFuZCA9IGxvZ2ljYWxPcE1hdGNoWzJdO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIENoZWNrIGZvciBpbmNyZW1lbnQvZGVjcmVtZW50IG9wZXJhdG9yc1xyXG4gICAgICAgIGlmIChyaWdodE9wZXJhbmQuaW5jbHVkZXMoJysrJykgfHwgcmlnaHRPcGVyYW5kLmluY2x1ZGVzKCctLScpKSB7XHJcbiAgICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICAgJ1JpZ2h0IG9wZXJhbmQgb2YgbG9naWNhbCBvcGVyYXRvciBjb250YWlucyBzaWRlIGVmZmVjdHMgKCsrLy0tKScsXHJcbiAgICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyBDaGVjayBmb3IgYXNzaWdubWVudCBvcGVyYXRvcnNcclxuICAgICAgICBpZiAocmlnaHRPcGVyYW5kLm1hdGNoKC9cXHcrXFxzKlsrXFwtKi8lJnxeXT89LykpIHtcclxuICAgICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgICAnUmlnaHQgb3BlcmFuZCBvZiBsb2dpY2FsIG9wZXJhdG9yIGNvbnRhaW5zIGFzc2lnbm1lbnQnLFxyXG4gICAgICAgICAgICAgIGxpbmVcclxuICAgICAgICAgICAgKVxyXG4gICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19