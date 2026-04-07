"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_5_2_12 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 5-2-12
 * An identifier with array type passed as a function argument shall not decay to a pointer.
 */
class Rule_CPP_5_2_12 {
    id = 'MISRA-CPP-5.2.12';
    description = 'Array arguments shall not decay to pointers';
    severity = 'required';
    category = 'Functions';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('//') || line.startsWith('#') || !line)
                continue;
            // Function parameter with array notation: void func(int arr[])
            if (/\w+\s+\w+\s*\([^)]*\w+\s+\w+\s*\[\s*\]/.test(line)) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Array parameter decays to pointer, use reference or std::array', line));
            }
        }
        return violations;
    }
}
exports.Rule_CPP_5_2_12 = Rule_CPP_5_2_12;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS01LTItMTIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTUtMi0xMi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7OztHQUdHO0FBQ0gsTUFBYSxlQUFlO0lBQzFCLEVBQUUsR0FBRyxrQkFBa0IsQ0FBQztJQUN4QixXQUFXLEdBQUcsNkNBQTZDLENBQUM7SUFDNUQsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLFdBQVcsQ0FBQztJQUN2QixRQUFRLEdBQUcsS0FBYyxDQUFDO0lBRTFCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFDbkMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQztRQUV4QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM3QixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUk7Z0JBQUUsU0FBUztZQUVyRSwrREFBK0Q7WUFDL0QsSUFBSSx3Q0FBd0MsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDeEQsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELGdFQUFnRSxFQUNoRSxJQUFJLENBQ0wsQ0FDRixDQUFDO1lBQ0osQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUEvQkQsMENBK0JDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEMrKzoyMDA4IFJ1bGUgNS0yLTEyXHJcbiAqIEFuIGlkZW50aWZpZXIgd2l0aCBhcnJheSB0eXBlIHBhc3NlZCBhcyBhIGZ1bmN0aW9uIGFyZ3VtZW50IHNoYWxsIG5vdCBkZWNheSB0byBhIHBvaW50ZXIuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DUFBfNV8yXzEyIGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DUFAtNS4yLjEyJztcclxuICBkZXNjcmlwdGlvbiA9ICdBcnJheSBhcmd1bWVudHMgc2hhbGwgbm90IGRlY2F5IHRvIHBvaW50ZXJzJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnRnVuY3Rpb25zJztcclxuICBsYW5ndWFnZSA9ICdDUFAnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuICAgIGNvbnN0IGxpbmVzID0gYXN0LmxpbmVzO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnLy8nKSB8fCBsaW5lLnN0YXJ0c1dpdGgoJyMnKSB8fCAhbGluZSkgY29udGludWU7XHJcblxyXG4gICAgICAvLyBGdW5jdGlvbiBwYXJhbWV0ZXIgd2l0aCBhcnJheSBub3RhdGlvbjogdm9pZCBmdW5jKGludCBhcnJbXSlcclxuICAgICAgaWYgKC9cXHcrXFxzK1xcdytcXHMqXFwoW14pXSpcXHcrXFxzK1xcdytcXHMqXFxbXFxzKlxcXS8udGVzdChsaW5lKSkge1xyXG4gICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICdBcnJheSBwYXJhbWV0ZXIgZGVjYXlzIHRvIHBvaW50ZXIsIHVzZSByZWZlcmVuY2Ugb3Igc3RkOjphcnJheScsXHJcbiAgICAgICAgICAgIGxpbmVcclxuICAgICAgICAgIClcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==