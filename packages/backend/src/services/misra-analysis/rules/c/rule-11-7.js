"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_11_7 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 11.7
 * A cast shall not be performed between pointer to object and a non-integer arithmetic type.
 */
class Rule_C_11_7 {
    id = 'MISRA-C-11.7';
    description = 'A cast shall not be performed between pointer to object and a non-integer arithmetic type';
    severity = 'required';
    category = 'Pointers';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Check for pointer to float/double conversion
            const ptrToFloatMatch = line.match(/\((?:float|double)\)\s*\w+/);
            if (ptrToFloatMatch && (line.includes('*') || line.includes('&'))) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Cast between pointer and non-integer arithmetic type', line));
            }
            // Check for float/double to pointer conversion
            const floatToPtrMatch = line.match(/\(\w+\s*\*\)\s*[\d.]+[fF]?/);
            if (floatToPtrMatch) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Cast from non-integer arithmetic type to pointer', line));
            }
        }
        return violations;
    }
}
exports.Rule_C_11_7 = Rule_C_11_7;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xMS03LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xMS03LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7O0dBR0c7QUFDSCxNQUFhLFdBQVc7SUFDdEIsRUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQixXQUFXLEdBQUcsMkZBQTJGLENBQUM7SUFDMUcsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLFVBQVUsQ0FBQztJQUN0QixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFFbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVqQywrQ0FBK0M7WUFDL0MsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO1lBQ2pFLElBQUksZUFBZSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDbEUsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELHNEQUFzRCxFQUN0RCxJQUFJLENBQ0wsQ0FDRixDQUFDO1lBQ0osQ0FBQztZQUVELCtDQUErQztZQUMvQyxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLDRCQUE0QixDQUFDLENBQUM7WUFDakUsSUFBSSxlQUFlLEVBQUUsQ0FBQztnQkFDcEIsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELGtEQUFrRCxFQUNsRCxJQUFJLENBQ0wsQ0FDRixDQUFDO1lBQ0osQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUE1Q0Qsa0NBNENDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEM6MjAxMiBSdWxlIDExLjdcclxuICogQSBjYXN0IHNoYWxsIG5vdCBiZSBwZXJmb3JtZWQgYmV0d2VlbiBwb2ludGVyIHRvIG9iamVjdCBhbmQgYSBub24taW50ZWdlciBhcml0aG1ldGljIHR5cGUuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzExXzcgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMTEuNyc7XHJcbiAgZGVzY3JpcHRpb24gPSAnQSBjYXN0IHNoYWxsIG5vdCBiZSBwZXJmb3JtZWQgYmV0d2VlbiBwb2ludGVyIHRvIG9iamVjdCBhbmQgYSBub24taW50ZWdlciBhcml0aG1ldGljIHR5cGUnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdQb2ludGVycyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXN0LmxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBhc3QubGluZXNbaV0udHJpbSgpO1xyXG4gICAgICBcclxuICAgICAgLy8gQ2hlY2sgZm9yIHBvaW50ZXIgdG8gZmxvYXQvZG91YmxlIGNvbnZlcnNpb25cclxuICAgICAgY29uc3QgcHRyVG9GbG9hdE1hdGNoID0gbGluZS5tYXRjaCgvXFwoKD86ZmxvYXR8ZG91YmxlKVxcKVxccypcXHcrLyk7XHJcbiAgICAgIGlmIChwdHJUb0Zsb2F0TWF0Y2ggJiYgKGxpbmUuaW5jbHVkZXMoJyonKSB8fCBsaW5lLmluY2x1ZGVzKCcmJykpKSB7XHJcbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgJ0Nhc3QgYmV0d2VlbiBwb2ludGVyIGFuZCBub24taW50ZWdlciBhcml0aG1ldGljIHR5cGUnLFxyXG4gICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gQ2hlY2sgZm9yIGZsb2F0L2RvdWJsZSB0byBwb2ludGVyIGNvbnZlcnNpb25cclxuICAgICAgY29uc3QgZmxvYXRUb1B0ck1hdGNoID0gbGluZS5tYXRjaCgvXFwoXFx3K1xccypcXCpcXClcXHMqW1xcZC5dK1tmRl0/Lyk7XHJcbiAgICAgIGlmIChmbG9hdFRvUHRyTWF0Y2gpIHtcclxuICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAnQ2FzdCBmcm9tIG5vbi1pbnRlZ2VyIGFyaXRobWV0aWMgdHlwZSB0byBwb2ludGVyJyxcclxuICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgKVxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19