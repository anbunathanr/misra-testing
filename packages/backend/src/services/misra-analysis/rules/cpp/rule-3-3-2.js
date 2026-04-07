"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_3_3_2 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 3-3-2
 * If a function has internal linkage then all re-declarations shall include the static storage class specifier.
 * Ensures consistent static declarations.
 */
class Rule_CPP_3_3_2 {
    id = 'MISRA-CPP-3.3.2';
    description = 'Static functions shall be consistently declared with static';
    severity = 'required';
    category = 'Declarations';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Track static function declarations
        const staticFunctions = new Set();
        const allFunctions = new Map();
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('//') || line.startsWith('#') || !line)
                continue;
            // Function declaration or definition
            const funcMatch = line.match(/^\s*(static\s+)?\w+\s+(\w+)\s*\([^)]*\)/);
            if (!funcMatch)
                continue;
            const isStatic = !!funcMatch[1];
            const name = funcMatch[2];
            if (allFunctions.has(name)) {
                const prev = allFunctions.get(name);
                if (prev.isStatic !== isStatic) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Inconsistent static declaration for '${name}' (line ${prev.line} ${prev.isStatic ? 'has' : 'lacks'} static)`, line));
                }
            }
            else {
                allFunctions.set(name, { isStatic, line: i + 1 });
            }
        }
        return violations;
    }
}
exports.Rule_CPP_3_3_2 = Rule_CPP_3_3_2;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0zLTMtMi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtMy0zLTIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7O0dBSUc7QUFDSCxNQUFhLGNBQWM7SUFDekIsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ3ZCLFdBQVcsR0FBRyw2REFBNkQsQ0FBQztJQUM1RSxRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsY0FBYyxDQUFDO0lBQzFCLFFBQVEsR0FBRyxLQUFjLENBQUM7SUFFMUIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsTUFBTSxVQUFVLEdBQWdCLEVBQUUsQ0FBQztRQUNuQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBRXhCLHFDQUFxQztRQUNyQyxNQUFNLGVBQWUsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBQzFDLE1BQU0sWUFBWSxHQUFHLElBQUksR0FBRyxFQUErQyxDQUFDO1FBRTVFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdEMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzdCLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSTtnQkFBRSxTQUFTO1lBRXJFLHFDQUFxQztZQUNyQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLHlDQUF5QyxDQUFDLENBQUM7WUFDeEUsSUFBSSxDQUFDLFNBQVM7Z0JBQUUsU0FBUztZQUV6QixNQUFNLFFBQVEsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2hDLE1BQU0sSUFBSSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUUxQixJQUFJLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDM0IsTUFBTSxJQUFJLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBQztnQkFDckMsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLFFBQVEsRUFBRSxDQUFDO29CQUMvQixVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0Qsd0NBQXdDLElBQUksV0FBVyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxVQUFVLEVBQzdHLElBQUksQ0FDTCxDQUNGLENBQUM7Z0JBQ0osQ0FBQztZQUNILENBQUM7aUJBQU0sQ0FBQztnQkFDTixZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDcEQsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUE5Q0Qsd0NBOENDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEMrKzoyMDA4IFJ1bGUgMy0zLTJcclxuICogSWYgYSBmdW5jdGlvbiBoYXMgaW50ZXJuYWwgbGlua2FnZSB0aGVuIGFsbCByZS1kZWNsYXJhdGlvbnMgc2hhbGwgaW5jbHVkZSB0aGUgc3RhdGljIHN0b3JhZ2UgY2xhc3Mgc3BlY2lmaWVyLlxyXG4gKiBFbnN1cmVzIGNvbnNpc3RlbnQgc3RhdGljIGRlY2xhcmF0aW9ucy5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NQUF8zXzNfMiBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQ1BQLTMuMy4yJztcclxuICBkZXNjcmlwdGlvbiA9ICdTdGF0aWMgZnVuY3Rpb25zIHNoYWxsIGJlIGNvbnNpc3RlbnRseSBkZWNsYXJlZCB3aXRoIHN0YXRpYyc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0RlY2xhcmF0aW9ucyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQ1BQJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcbiAgICBjb25zdCBsaW5lcyA9IGFzdC5saW5lcztcclxuXHJcbiAgICAvLyBUcmFjayBzdGF0aWMgZnVuY3Rpb24gZGVjbGFyYXRpb25zXHJcbiAgICBjb25zdCBzdGF0aWNGdW5jdGlvbnMgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuICAgIGNvbnN0IGFsbEZ1bmN0aW9ucyA9IG5ldyBNYXA8c3RyaW5nLCB7IGlzU3RhdGljOiBib29sZWFuOyBsaW5lOiBudW1iZXIgfT4oKTtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBsaW5lc1tpXS50cmltKCk7XHJcbiAgICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoJy8vJykgfHwgbGluZS5zdGFydHNXaXRoKCcjJykgfHwgIWxpbmUpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgLy8gRnVuY3Rpb24gZGVjbGFyYXRpb24gb3IgZGVmaW5pdGlvblxyXG4gICAgICBjb25zdCBmdW5jTWF0Y2ggPSBsaW5lLm1hdGNoKC9eXFxzKihzdGF0aWNcXHMrKT9cXHcrXFxzKyhcXHcrKVxccypcXChbXildKlxcKS8pO1xyXG4gICAgICBpZiAoIWZ1bmNNYXRjaCkgY29udGludWU7XHJcblxyXG4gICAgICBjb25zdCBpc1N0YXRpYyA9ICEhZnVuY01hdGNoWzFdO1xyXG4gICAgICBjb25zdCBuYW1lID0gZnVuY01hdGNoWzJdO1xyXG5cclxuICAgICAgaWYgKGFsbEZ1bmN0aW9ucy5oYXMobmFtZSkpIHtcclxuICAgICAgICBjb25zdCBwcmV2ID0gYWxsRnVuY3Rpb25zLmdldChuYW1lKSE7XHJcbiAgICAgICAgaWYgKHByZXYuaXNTdGF0aWMgIT09IGlzU3RhdGljKSB7XHJcbiAgICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICAgYEluY29uc2lzdGVudCBzdGF0aWMgZGVjbGFyYXRpb24gZm9yICcke25hbWV9JyAobGluZSAke3ByZXYubGluZX0gJHtwcmV2LmlzU3RhdGljID8gJ2hhcycgOiAnbGFja3MnfSBzdGF0aWMpYCxcclxuICAgICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGFsbEZ1bmN0aW9ucy5zZXQobmFtZSwgeyBpc1N0YXRpYywgbGluZTogaSArIDEgfSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19