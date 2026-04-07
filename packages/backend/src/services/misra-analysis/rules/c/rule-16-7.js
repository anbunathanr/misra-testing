"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_16_7 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 16.7
 * A switch-expression shall not have essentially Boolean type.
 */
class Rule_C_16_7 {
    id = 'MISRA-C-16.7';
    description = 'A switch-expression shall not have essentially Boolean type';
    severity = 'required';
    category = 'Control flow';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Check for switch on boolean expressions
            const switchMatch = line.match(/switch\s*\(([^)]+)\)/);
            if (switchMatch) {
                const expr = switchMatch[1].trim();
                // Check for boolean variables or expressions
                if (expr === 'true' || expr === 'false' ||
                    expr.includes('==') || expr.includes('!=') ||
                    expr.includes('&&') || expr.includes('||') ||
                    expr.includes('<') || expr.includes('>') ||
                    expr.includes('<=') || expr.includes('>=')) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Switch expression has Boolean type', line));
                }
                // Check for _Bool type
                if (expr.match(/\b_Bool\b/)) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Switch expression has _Bool type', line));
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_16_7 = Rule_C_16_7;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xNi03LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xNi03LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7O0dBR0c7QUFDSCxNQUFhLFdBQVc7SUFDdEIsRUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQixXQUFXLEdBQUcsNkRBQTZELENBQUM7SUFDNUUsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLGNBQWMsQ0FBQztJQUMxQixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFFbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVqQywwQ0FBMEM7WUFDMUMsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1lBQ3ZELElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ2hCLE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFFbkMsNkNBQTZDO2dCQUM3QyxJQUFJLElBQUksS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLE9BQU87b0JBQ25DLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7b0JBQzFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7b0JBQzFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUM7b0JBQ3hDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUMvQyxVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0Qsb0NBQW9DLEVBQ3BDLElBQUksQ0FDTCxDQUNGLENBQUM7Z0JBQ0osQ0FBQztnQkFFRCx1QkFBdUI7Z0JBQ3ZCLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO29CQUM1QixVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0Qsa0NBQWtDLEVBQ2xDLElBQUksQ0FDTCxDQUNGLENBQUM7Z0JBQ0osQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBcERELGtDQW9EQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDOjIwMTIgUnVsZSAxNi43XHJcbiAqIEEgc3dpdGNoLWV4cHJlc3Npb24gc2hhbGwgbm90IGhhdmUgZXNzZW50aWFsbHkgQm9vbGVhbiB0eXBlLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ18xNl83IGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTE2LjcnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0Egc3dpdGNoLWV4cHJlc3Npb24gc2hhbGwgbm90IGhhdmUgZXNzZW50aWFsbHkgQm9vbGVhbiB0eXBlJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnQ29udHJvbCBmbG93JztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhc3QubGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGFzdC5saW5lc1tpXS50cmltKCk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBDaGVjayBmb3Igc3dpdGNoIG9uIGJvb2xlYW4gZXhwcmVzc2lvbnNcclxuICAgICAgY29uc3Qgc3dpdGNoTWF0Y2ggPSBsaW5lLm1hdGNoKC9zd2l0Y2hcXHMqXFwoKFteKV0rKVxcKS8pO1xyXG4gICAgICBpZiAoc3dpdGNoTWF0Y2gpIHtcclxuICAgICAgICBjb25zdCBleHByID0gc3dpdGNoTWF0Y2hbMV0udHJpbSgpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIENoZWNrIGZvciBib29sZWFuIHZhcmlhYmxlcyBvciBleHByZXNzaW9uc1xyXG4gICAgICAgIGlmIChleHByID09PSAndHJ1ZScgfHwgZXhwciA9PT0gJ2ZhbHNlJyB8fCBcclxuICAgICAgICAgICAgZXhwci5pbmNsdWRlcygnPT0nKSB8fCBleHByLmluY2x1ZGVzKCchPScpIHx8IFxyXG4gICAgICAgICAgICBleHByLmluY2x1ZGVzKCcmJicpIHx8IGV4cHIuaW5jbHVkZXMoJ3x8JykgfHxcclxuICAgICAgICAgICAgZXhwci5pbmNsdWRlcygnPCcpIHx8IGV4cHIuaW5jbHVkZXMoJz4nKSB8fFxyXG4gICAgICAgICAgICBleHByLmluY2x1ZGVzKCc8PScpIHx8IGV4cHIuaW5jbHVkZXMoJz49JykpIHtcclxuICAgICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgICAnU3dpdGNoIGV4cHJlc3Npb24gaGFzIEJvb2xlYW4gdHlwZScsXHJcbiAgICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyBDaGVjayBmb3IgX0Jvb2wgdHlwZVxyXG4gICAgICAgIGlmIChleHByLm1hdGNoKC9cXGJfQm9vbFxcYi8pKSB7XHJcbiAgICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICAgJ1N3aXRjaCBleHByZXNzaW9uIGhhcyBfQm9vbCB0eXBlJyxcclxuICAgICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==