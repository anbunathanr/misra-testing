"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_8_10 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 8.10
 * An inline function shall be declared with the static storage class.
 */
class Rule_C_8_10 {
    id = 'MISRA-C-8.10';
    description = 'An inline function shall be declared with the static storage class';
    severity = 'required';
    category = 'Declarations';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Check for inline functions without static
            if (line.includes('inline') && !line.includes('static')) {
                const funcMatch = line.match(/inline\s+\w+\s+(\w+)\s*\(/);
                if (funcMatch) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Inline function '${funcMatch[1]}' should be declared static`, line));
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_8_10 = Rule_C_8_10;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS04LTEwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS04LTEwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7O0dBR0c7QUFDSCxNQUFhLFdBQVc7SUFDdEIsRUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQixXQUFXLEdBQUcsb0VBQW9FLENBQUM7SUFDbkYsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLGNBQWMsQ0FBQztJQUMxQixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFFbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVqQyw0Q0FBNEM7WUFDNUMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUN4RCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLDJCQUEyQixDQUFDLENBQUM7Z0JBQzFELElBQUksU0FBUyxFQUFFLENBQUM7b0JBQ2QsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELG9CQUFvQixTQUFTLENBQUMsQ0FBQyxDQUFDLDZCQUE2QixFQUM3RCxJQUFJLENBQ0wsQ0FDRixDQUFDO2dCQUNKLENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQWhDRCxrQ0FnQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQzoyMDEyIFJ1bGUgOC4xMFxyXG4gKiBBbiBpbmxpbmUgZnVuY3Rpb24gc2hhbGwgYmUgZGVjbGFyZWQgd2l0aCB0aGUgc3RhdGljIHN0b3JhZ2UgY2xhc3MuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzhfMTAgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtOC4xMCc7XHJcbiAgZGVzY3JpcHRpb24gPSAnQW4gaW5saW5lIGZ1bmN0aW9uIHNoYWxsIGJlIGRlY2xhcmVkIHdpdGggdGhlIHN0YXRpYyBzdG9yYWdlIGNsYXNzJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnRGVjbGFyYXRpb25zJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhc3QubGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGFzdC5saW5lc1tpXS50cmltKCk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBDaGVjayBmb3IgaW5saW5lIGZ1bmN0aW9ucyB3aXRob3V0IHN0YXRpY1xyXG4gICAgICBpZiAobGluZS5pbmNsdWRlcygnaW5saW5lJykgJiYgIWxpbmUuaW5jbHVkZXMoJ3N0YXRpYycpKSB7XHJcbiAgICAgICAgY29uc3QgZnVuY01hdGNoID0gbGluZS5tYXRjaCgvaW5saW5lXFxzK1xcdytcXHMrKFxcdyspXFxzKlxcKC8pO1xyXG4gICAgICAgIGlmIChmdW5jTWF0Y2gpIHtcclxuICAgICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgICBgSW5saW5lIGZ1bmN0aW9uICcke2Z1bmNNYXRjaFsxXX0nIHNob3VsZCBiZSBkZWNsYXJlZCBzdGF0aWNgLFxyXG4gICAgICAgICAgICAgIGxpbmVcclxuICAgICAgICAgICAgKVxyXG4gICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19