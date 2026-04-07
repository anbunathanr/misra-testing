"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_16_6 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 16.6
 * Every switch statement shall have at least two switch-clauses.
 */
class Rule_C_16_6 {
    id = 'MISRA-C-16.6';
    description = 'Every switch statement shall have at least two switch-clauses';
    severity = 'required';
    category = 'Control flow';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            if (line.startsWith('switch')) {
                let braceCount = 0;
                let caseCount = 0;
                // Count case labels (including default)
                for (let j = i; j < ast.lines.length; j++) {
                    const switchLine = ast.lines[j].trim();
                    if (switchLine.includes('{'))
                        braceCount++;
                    if (switchLine.includes('}')) {
                        braceCount--;
                        if (braceCount === 0 && j > i)
                            break;
                    }
                    if (switchLine.startsWith('case') || switchLine.startsWith('default')) {
                        caseCount++;
                    }
                }
                if (caseCount < 2) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Switch statement has only ${caseCount} clause(s), requires at least 2`, line));
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_16_6 = Rule_C_16_6;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xNi02LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xNi02LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7O0dBR0c7QUFDSCxNQUFhLFdBQVc7SUFDdEIsRUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQixXQUFXLEdBQUcsK0RBQStELENBQUM7SUFDOUUsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLGNBQWMsQ0FBQztJQUMxQixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFFbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVqQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDOUIsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDO2dCQUNuQixJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7Z0JBRWxCLHdDQUF3QztnQkFDeEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQzFDLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBRXZDLElBQUksVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUM7d0JBQUUsVUFBVSxFQUFFLENBQUM7b0JBQzNDLElBQUksVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO3dCQUM3QixVQUFVLEVBQUUsQ0FBQzt3QkFDYixJQUFJLFVBQVUsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7NEJBQUUsTUFBTTtvQkFDdkMsQ0FBQztvQkFFRCxJQUFJLFVBQVUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLElBQUksVUFBVSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO3dCQUN0RSxTQUFTLEVBQUUsQ0FBQztvQkFDZCxDQUFDO2dCQUNILENBQUM7Z0JBRUQsSUFBSSxTQUFTLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQ2xCLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCw2QkFBNkIsU0FBUyxpQ0FBaUMsRUFDdkUsSUFBSSxDQUNMLENBQ0YsQ0FBQztnQkFDSixDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUFoREQsa0NBZ0RDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEM6MjAxMiBSdWxlIDE2LjZcclxuICogRXZlcnkgc3dpdGNoIHN0YXRlbWVudCBzaGFsbCBoYXZlIGF0IGxlYXN0IHR3byBzd2l0Y2gtY2xhdXNlcy5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMTZfNiBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0xNi42JztcclxuICBkZXNjcmlwdGlvbiA9ICdFdmVyeSBzd2l0Y2ggc3RhdGVtZW50IHNoYWxsIGhhdmUgYXQgbGVhc3QgdHdvIHN3aXRjaC1jbGF1c2VzJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnQ29udHJvbCBmbG93JztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhc3QubGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGFzdC5saW5lc1tpXS50cmltKCk7XHJcbiAgICAgIFxyXG4gICAgICBpZiAobGluZS5zdGFydHNXaXRoKCdzd2l0Y2gnKSkge1xyXG4gICAgICAgIGxldCBicmFjZUNvdW50ID0gMDtcclxuICAgICAgICBsZXQgY2FzZUNvdW50ID0gMDtcclxuICAgICAgICBcclxuICAgICAgICAvLyBDb3VudCBjYXNlIGxhYmVscyAoaW5jbHVkaW5nIGRlZmF1bHQpXHJcbiAgICAgICAgZm9yIChsZXQgaiA9IGk7IGogPCBhc3QubGluZXMubGVuZ3RoOyBqKyspIHtcclxuICAgICAgICAgIGNvbnN0IHN3aXRjaExpbmUgPSBhc3QubGluZXNbal0udHJpbSgpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBpZiAoc3dpdGNoTGluZS5pbmNsdWRlcygneycpKSBicmFjZUNvdW50Kys7XHJcbiAgICAgICAgICBpZiAoc3dpdGNoTGluZS5pbmNsdWRlcygnfScpKSB7XHJcbiAgICAgICAgICAgIGJyYWNlQ291bnQtLTtcclxuICAgICAgICAgICAgaWYgKGJyYWNlQ291bnQgPT09IDAgJiYgaiA+IGkpIGJyZWFrO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBpZiAoc3dpdGNoTGluZS5zdGFydHNXaXRoKCdjYXNlJykgfHwgc3dpdGNoTGluZS5zdGFydHNXaXRoKCdkZWZhdWx0JykpIHtcclxuICAgICAgICAgICAgY2FzZUNvdW50Kys7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGlmIChjYXNlQ291bnQgPCAyKSB7XHJcbiAgICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICAgYFN3aXRjaCBzdGF0ZW1lbnQgaGFzIG9ubHkgJHtjYXNlQ291bnR9IGNsYXVzZShzKSwgcmVxdWlyZXMgYXQgbGVhc3QgMmAsXHJcbiAgICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=