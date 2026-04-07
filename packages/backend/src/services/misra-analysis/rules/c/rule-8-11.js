"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_8_11 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 8.11
 * When an array with external linkage is declared, its size should be explicitly specified.
 */
class Rule_C_8_11 {
    id = 'MISRA-C-8.11';
    description = 'When an array with external linkage is declared, its size should be explicitly specified';
    severity = 'advisory';
    category = 'Declarations';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Check for extern array declarations without size
            const arrayMatch = line.match(/extern\s+\w+\s+(\w+)\s*\[\s*\]/);
            if (arrayMatch) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `External array '${arrayMatch[1]}' should have explicit size`, line));
            }
        }
        return violations;
    }
}
exports.Rule_C_8_11 = Rule_C_8_11;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS04LTExLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS04LTExLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7O0dBR0c7QUFDSCxNQUFhLFdBQVc7SUFDdEIsRUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQixXQUFXLEdBQUcsMEZBQTBGLENBQUM7SUFDekcsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLGNBQWMsQ0FBQztJQUMxQixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFFbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVqQyxtREFBbUQ7WUFDbkQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO1lBQ2hFLElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQ2YsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELG1CQUFtQixVQUFVLENBQUMsQ0FBQyxDQUFDLDZCQUE2QixFQUM3RCxJQUFJLENBQ0wsQ0FDRixDQUFDO1lBQ0osQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUE5QkQsa0NBOEJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEM6MjAxMiBSdWxlIDguMTFcclxuICogV2hlbiBhbiBhcnJheSB3aXRoIGV4dGVybmFsIGxpbmthZ2UgaXMgZGVjbGFyZWQsIGl0cyBzaXplIHNob3VsZCBiZSBleHBsaWNpdGx5IHNwZWNpZmllZC5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfOF8xMSBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy04LjExJztcclxuICBkZXNjcmlwdGlvbiA9ICdXaGVuIGFuIGFycmF5IHdpdGggZXh0ZXJuYWwgbGlua2FnZSBpcyBkZWNsYXJlZCwgaXRzIHNpemUgc2hvdWxkIGJlIGV4cGxpY2l0bHkgc3BlY2lmaWVkJztcclxuICBzZXZlcml0eSA9ICdhZHZpc29yeScgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnRGVjbGFyYXRpb25zJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhc3QubGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGFzdC5saW5lc1tpXS50cmltKCk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBDaGVjayBmb3IgZXh0ZXJuIGFycmF5IGRlY2xhcmF0aW9ucyB3aXRob3V0IHNpemVcclxuICAgICAgY29uc3QgYXJyYXlNYXRjaCA9IGxpbmUubWF0Y2goL2V4dGVyblxccytcXHcrXFxzKyhcXHcrKVxccypcXFtcXHMqXFxdLyk7XHJcbiAgICAgIGlmIChhcnJheU1hdGNoKSB7XHJcbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgYEV4dGVybmFsIGFycmF5ICcke2FycmF5TWF0Y2hbMV19JyBzaG91bGQgaGF2ZSBleHBsaWNpdCBzaXplYCxcclxuICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgKVxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19