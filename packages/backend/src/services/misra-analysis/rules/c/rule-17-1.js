"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_17_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 17.1
 * The features of <stdarg.h> shall not be used.
 */
class Rule_C_17_1 {
    id = 'MISRA-C-17.1';
    description = 'The features of <stdarg.h> shall not be used';
    severity = 'required';
    category = 'Functions';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Check for stdarg.h include
            if (line.includes('<stdarg.h>') || line.includes('"stdarg.h"')) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Use of <stdarg.h> is not permitted', line));
            }
            // Check for variadic function macros
            if (line.includes('va_start') || line.includes('va_arg') ||
                line.includes('va_end') || line.includes('va_list') ||
                line.includes('va_copy')) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Use of stdarg.h features (va_*) is not permitted', line));
            }
            // Check for variadic function declarations
            if (line.match(/\w+\s*\([^)]*\.\.\.\)/)) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Variadic function declaration is not permitted', line));
            }
        }
        return violations;
    }
}
exports.Rule_C_17_1 = Rule_C_17_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xNy0xLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xNy0xLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7O0dBR0c7QUFDSCxNQUFhLFdBQVc7SUFDdEIsRUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQixXQUFXLEdBQUcsOENBQThDLENBQUM7SUFDN0QsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLFdBQVcsQ0FBQztJQUN2QixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFFbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVqQyw2QkFBNkI7WUFDN0IsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQztnQkFDL0QsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELG9DQUFvQyxFQUNwQyxJQUFJLENBQ0wsQ0FDRixDQUFDO1lBQ0osQ0FBQztZQUVELHFDQUFxQztZQUNyQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUM7Z0JBQ3BELElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUM7Z0JBQ25ELElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztnQkFDN0IsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELGtEQUFrRCxFQUNsRCxJQUFJLENBQ0wsQ0FDRixDQUFDO1lBQ0osQ0FBQztZQUVELDJDQUEyQztZQUMzQyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsRUFBRSxDQUFDO2dCQUN4QyxVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0QsZ0RBQWdELEVBQ2hELElBQUksQ0FDTCxDQUNGLENBQUM7WUFDSixDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQXpERCxrQ0F5REMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQzoyMDEyIFJ1bGUgMTcuMVxyXG4gKiBUaGUgZmVhdHVyZXMgb2YgPHN0ZGFyZy5oPiBzaGFsbCBub3QgYmUgdXNlZC5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMTdfMSBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0xNy4xJztcclxuICBkZXNjcmlwdGlvbiA9ICdUaGUgZmVhdHVyZXMgb2YgPHN0ZGFyZy5oPiBzaGFsbCBub3QgYmUgdXNlZCc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0Z1bmN0aW9ucyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXN0LmxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBhc3QubGluZXNbaV0udHJpbSgpO1xyXG4gICAgICBcclxuICAgICAgLy8gQ2hlY2sgZm9yIHN0ZGFyZy5oIGluY2x1ZGVcclxuICAgICAgaWYgKGxpbmUuaW5jbHVkZXMoJzxzdGRhcmcuaD4nKSB8fCBsaW5lLmluY2x1ZGVzKCdcInN0ZGFyZy5oXCInKSkge1xyXG4gICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICdVc2Ugb2YgPHN0ZGFyZy5oPiBpcyBub3QgcGVybWl0dGVkJyxcclxuICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgKVxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIC8vIENoZWNrIGZvciB2YXJpYWRpYyBmdW5jdGlvbiBtYWNyb3NcclxuICAgICAgaWYgKGxpbmUuaW5jbHVkZXMoJ3ZhX3N0YXJ0JykgfHwgbGluZS5pbmNsdWRlcygndmFfYXJnJykgfHwgXHJcbiAgICAgICAgICBsaW5lLmluY2x1ZGVzKCd2YV9lbmQnKSB8fCBsaW5lLmluY2x1ZGVzKCd2YV9saXN0JykgfHxcclxuICAgICAgICAgIGxpbmUuaW5jbHVkZXMoJ3ZhX2NvcHknKSkge1xyXG4gICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICdVc2Ugb2Ygc3RkYXJnLmggZmVhdHVyZXMgKHZhXyopIGlzIG5vdCBwZXJtaXR0ZWQnLFxyXG4gICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gQ2hlY2sgZm9yIHZhcmlhZGljIGZ1bmN0aW9uIGRlY2xhcmF0aW9uc1xyXG4gICAgICBpZiAobGluZS5tYXRjaCgvXFx3K1xccypcXChbXildKlxcLlxcLlxcLlxcKS8pKSB7XHJcbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgJ1ZhcmlhZGljIGZ1bmN0aW9uIGRlY2xhcmF0aW9uIGlzIG5vdCBwZXJtaXR0ZWQnLFxyXG4gICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=