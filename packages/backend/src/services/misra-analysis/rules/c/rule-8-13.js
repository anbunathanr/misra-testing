"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_8_13 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 8.13
 * A pointer should point to a const-qualified type whenever possible.
 */
class Rule_C_8_13 {
    id = 'MISRA-C-8.13';
    description = 'A pointer should point to a const-qualified type whenever possible';
    severity = 'advisory';
    category = 'Declarations';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (const func of ast.functions) {
            if (!func.params)
                continue;
            for (const param of func.params) {
                // Check if parameter is a pointer but not const
                if (param.includes('*') && !param.includes('const')) {
                    // Check if parameter is modified in function body
                    let modified = false;
                    const funcLine = func.line;
                    for (let i = funcLine; i < Math.min(funcLine + 50, ast.lines.length); i++) {
                        const line = ast.lines[i - 1];
                        if (line && line.match(new RegExp(`${param.split('*')[0].trim()}\\s*=`))) {
                            modified = true;
                            break;
                        }
                    }
                    if (!modified) {
                        violations.push((0, rule_engine_1.createViolation)(this, func.line, 0, `Pointer parameter '${param}' should be const-qualified`, ast.lines[func.line - 1] || ''));
                    }
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_8_13 = Rule_C_8_13;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS04LTEzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS04LTEzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7O0dBR0c7QUFDSCxNQUFhLFdBQVc7SUFDdEIsRUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQixXQUFXLEdBQUcsb0VBQW9FLENBQUM7SUFDbkYsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLGNBQWMsQ0FBQztJQUMxQixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFFbkMsS0FBSyxNQUFNLElBQUksSUFBSSxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDakMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNO2dCQUFFLFNBQVM7WUFFM0IsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2hDLGdEQUFnRDtnQkFDaEQsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO29CQUNwRCxrREFBa0Q7b0JBQ2xELElBQUksUUFBUSxHQUFHLEtBQUssQ0FBQztvQkFDckIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztvQkFDM0IsS0FBSyxJQUFJLENBQUMsR0FBRyxRQUFRLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxHQUFHLEVBQUUsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7d0JBQzFFLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO3dCQUM5QixJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksTUFBTSxDQUFDLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDOzRCQUN6RSxRQUFRLEdBQUcsSUFBSSxDQUFDOzRCQUNoQixNQUFNO3dCQUNSLENBQUM7b0JBQ0gsQ0FBQztvQkFFRCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7d0JBQ2QsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLElBQUksQ0FBQyxJQUFJLEVBQ1QsQ0FBQyxFQUNELHNCQUFzQixLQUFLLDZCQUE2QixFQUN4RCxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUMvQixDQUNGLENBQUM7b0JBQ0osQ0FBQztnQkFDSCxDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUE1Q0Qsa0NBNENDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEM6MjAxMiBSdWxlIDguMTNcclxuICogQSBwb2ludGVyIHNob3VsZCBwb2ludCB0byBhIGNvbnN0LXF1YWxpZmllZCB0eXBlIHdoZW5ldmVyIHBvc3NpYmxlLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ184XzEzIGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTguMTMnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0EgcG9pbnRlciBzaG91bGQgcG9pbnQgdG8gYSBjb25zdC1xdWFsaWZpZWQgdHlwZSB3aGVuZXZlciBwb3NzaWJsZSc7XHJcbiAgc2V2ZXJpdHkgPSAnYWR2aXNvcnknIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0RlY2xhcmF0aW9ucyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG5cclxuICAgIGZvciAoY29uc3QgZnVuYyBvZiBhc3QuZnVuY3Rpb25zKSB7XHJcbiAgICAgIGlmICghZnVuYy5wYXJhbXMpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgZm9yIChjb25zdCBwYXJhbSBvZiBmdW5jLnBhcmFtcykge1xyXG4gICAgICAgIC8vIENoZWNrIGlmIHBhcmFtZXRlciBpcyBhIHBvaW50ZXIgYnV0IG5vdCBjb25zdFxyXG4gICAgICAgIGlmIChwYXJhbS5pbmNsdWRlcygnKicpICYmICFwYXJhbS5pbmNsdWRlcygnY29uc3QnKSkge1xyXG4gICAgICAgICAgLy8gQ2hlY2sgaWYgcGFyYW1ldGVyIGlzIG1vZGlmaWVkIGluIGZ1bmN0aW9uIGJvZHlcclxuICAgICAgICAgIGxldCBtb2RpZmllZCA9IGZhbHNlO1xyXG4gICAgICAgICAgY29uc3QgZnVuY0xpbmUgPSBmdW5jLmxpbmU7XHJcbiAgICAgICAgICBmb3IgKGxldCBpID0gZnVuY0xpbmU7IGkgPCBNYXRoLm1pbihmdW5jTGluZSArIDUwLCBhc3QubGluZXMubGVuZ3RoKTsgaSsrKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGxpbmUgPSBhc3QubGluZXNbaSAtIDFdO1xyXG4gICAgICAgICAgICBpZiAobGluZSAmJiBsaW5lLm1hdGNoKG5ldyBSZWdFeHAoYCR7cGFyYW0uc3BsaXQoJyonKVswXS50cmltKCl9XFxcXHMqPWApKSkge1xyXG4gICAgICAgICAgICAgIG1vZGlmaWVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBpZiAoIW1vZGlmaWVkKSB7XHJcbiAgICAgICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgICAgZnVuYy5saW5lLFxyXG4gICAgICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgICAgIGBQb2ludGVyIHBhcmFtZXRlciAnJHtwYXJhbX0nIHNob3VsZCBiZSBjb25zdC1xdWFsaWZpZWRgLFxyXG4gICAgICAgICAgICAgICAgYXN0LmxpbmVzW2Z1bmMubGluZSAtIDFdIHx8ICcnXHJcbiAgICAgICAgICAgICAgKVxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=