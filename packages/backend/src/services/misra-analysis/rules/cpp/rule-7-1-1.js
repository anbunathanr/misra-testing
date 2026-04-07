"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_7_1_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 7-1-1
 * A variable which is not modified shall be const qualified.
 * Detects pointer and reference parameters that could be const.
 */
class Rule_CPP_7_1_1 {
    id = 'MISRA-CPP-7.1.1';
    description = 'A variable which is not modified shall be const qualified';
    severity = 'required';
    category = 'Declarations';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Find function parameters that are pointers or references without const
        const funcParamRegex = /\b(\w+)\s+(\w+)\s*\(([^)]*)\)/;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('//') || line.startsWith('#') || !line)
                continue;
            const match = line.match(funcParamRegex);
            if (!match)
                continue;
            const params = match[3];
            // Check each parameter
            const paramList = params.split(',').map(p => p.trim());
            for (const param of paramList) {
                // Check for pointer or reference parameters without const
                if ((param.includes('*') || param.includes('&')) && !param.includes('const')) {
                    // Extract parameter name
                    const paramMatch = param.match(/([*&])\s*(\w+)$/);
                    if (paramMatch) {
                        violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Pointer/reference parameter should be const qualified if not modified`, line));
                    }
                }
            }
        }
        return violations;
    }
}
exports.Rule_CPP_7_1_1 = Rule_CPP_7_1_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS03LTEtMS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtNy0xLTEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7O0dBSUc7QUFDSCxNQUFhLGNBQWM7SUFDekIsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ3ZCLFdBQVcsR0FBRywyREFBMkQsQ0FBQztJQUMxRSxRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsY0FBYyxDQUFDO0lBQzFCLFFBQVEsR0FBRyxLQUFjLENBQUM7SUFFMUIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsTUFBTSxVQUFVLEdBQWdCLEVBQUUsQ0FBQztRQUNuQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBRXhCLHlFQUF5RTtRQUN6RSxNQUFNLGNBQWMsR0FBRywrQkFBK0IsQ0FBQztRQUV2RCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM3QixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUk7Z0JBQUUsU0FBUztZQUVyRSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQ3pDLElBQUksQ0FBQyxLQUFLO2dCQUFFLFNBQVM7WUFFckIsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXhCLHVCQUF1QjtZQUN2QixNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZELEtBQUssTUFBTSxLQUFLLElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQzlCLDBEQUEwRDtnQkFDMUQsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO29CQUM3RSx5QkFBeUI7b0JBQ3pCLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztvQkFDbEQsSUFBSSxVQUFVLEVBQUUsQ0FBQzt3QkFDZixVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0QsdUVBQXVFLEVBQ3ZFLElBQUksQ0FDTCxDQUNGLENBQUM7b0JBQ0osQ0FBQztnQkFDSCxDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUEvQ0Qsd0NBK0NDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEMrKzoyMDA4IFJ1bGUgNy0xLTFcclxuICogQSB2YXJpYWJsZSB3aGljaCBpcyBub3QgbW9kaWZpZWQgc2hhbGwgYmUgY29uc3QgcXVhbGlmaWVkLlxyXG4gKiBEZXRlY3RzIHBvaW50ZXIgYW5kIHJlZmVyZW5jZSBwYXJhbWV0ZXJzIHRoYXQgY291bGQgYmUgY29uc3QuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DUFBfN18xXzEgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUNQUC03LjEuMSc7XHJcbiAgZGVzY3JpcHRpb24gPSAnQSB2YXJpYWJsZSB3aGljaCBpcyBub3QgbW9kaWZpZWQgc2hhbGwgYmUgY29uc3QgcXVhbGlmaWVkJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnRGVjbGFyYXRpb25zJztcclxuICBsYW5ndWFnZSA9ICdDUFAnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuICAgIGNvbnN0IGxpbmVzID0gYXN0LmxpbmVzO1xyXG5cclxuICAgIC8vIEZpbmQgZnVuY3Rpb24gcGFyYW1ldGVycyB0aGF0IGFyZSBwb2ludGVycyBvciByZWZlcmVuY2VzIHdpdGhvdXQgY29uc3RcclxuICAgIGNvbnN0IGZ1bmNQYXJhbVJlZ2V4ID0gL1xcYihcXHcrKVxccysoXFx3KylcXHMqXFwoKFteKV0qKVxcKS87XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gbGluZXNbaV0udHJpbSgpO1xyXG4gICAgICBpZiAobGluZS5zdGFydHNXaXRoKCcvLycpIHx8IGxpbmUuc3RhcnRzV2l0aCgnIycpIHx8ICFsaW5lKSBjb250aW51ZTtcclxuXHJcbiAgICAgIGNvbnN0IG1hdGNoID0gbGluZS5tYXRjaChmdW5jUGFyYW1SZWdleCk7XHJcbiAgICAgIGlmICghbWF0Y2gpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgY29uc3QgcGFyYW1zID0gbWF0Y2hbM107XHJcbiAgICAgIFxyXG4gICAgICAvLyBDaGVjayBlYWNoIHBhcmFtZXRlclxyXG4gICAgICBjb25zdCBwYXJhbUxpc3QgPSBwYXJhbXMuc3BsaXQoJywnKS5tYXAocCA9PiBwLnRyaW0oKSk7XHJcbiAgICAgIGZvciAoY29uc3QgcGFyYW0gb2YgcGFyYW1MaXN0KSB7XHJcbiAgICAgICAgLy8gQ2hlY2sgZm9yIHBvaW50ZXIgb3IgcmVmZXJlbmNlIHBhcmFtZXRlcnMgd2l0aG91dCBjb25zdFxyXG4gICAgICAgIGlmICgocGFyYW0uaW5jbHVkZXMoJyonKSB8fCBwYXJhbS5pbmNsdWRlcygnJicpKSAmJiAhcGFyYW0uaW5jbHVkZXMoJ2NvbnN0JykpIHtcclxuICAgICAgICAgIC8vIEV4dHJhY3QgcGFyYW1ldGVyIG5hbWVcclxuICAgICAgICAgIGNvbnN0IHBhcmFtTWF0Y2ggPSBwYXJhbS5tYXRjaCgvKFsqJl0pXFxzKihcXHcrKSQvKTtcclxuICAgICAgICAgIGlmIChwYXJhbU1hdGNoKSB7XHJcbiAgICAgICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAgICAgYFBvaW50ZXIvcmVmZXJlbmNlIHBhcmFtZXRlciBzaG91bGQgYmUgY29uc3QgcXVhbGlmaWVkIGlmIG5vdCBtb2RpZmllZGAsXHJcbiAgICAgICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICAgICAgKVxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=