"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_11_4 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 11.4
 * A conversion should not be performed between a pointer to object and an integer type.
 */
class Rule_C_11_4 {
    id = 'MISRA-C-11.4';
    description = 'A conversion should not be performed between a pointer to object and an integer type';
    severity = 'advisory';
    category = 'Pointers';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Check for pointer to int conversion
            const ptrToIntMatch = line.match(/\((?:int|long|unsigned)\)\s*\w+/);
            if (ptrToIntMatch && (line.includes('*') || line.includes('&'))) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Conversion between pointer and integer type', line));
            }
            // Check for int to pointer conversion
            const intToPtrMatch = line.match(/\(\w+\s*\*\)\s*\d+/);
            if (intToPtrMatch) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Conversion from integer to pointer type', line));
            }
        }
        return violations;
    }
}
exports.Rule_C_11_4 = Rule_C_11_4;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xMS00LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xMS00LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7O0dBR0c7QUFDSCxNQUFhLFdBQVc7SUFDdEIsRUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQixXQUFXLEdBQUcsc0ZBQXNGLENBQUM7SUFDckcsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLFVBQVUsQ0FBQztJQUN0QixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFFbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVqQyxzQ0FBc0M7WUFDdEMsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO1lBQ3BFLElBQUksYUFBYSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDaEUsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELDZDQUE2QyxFQUM3QyxJQUFJLENBQ0wsQ0FDRixDQUFDO1lBQ0osQ0FBQztZQUVELHNDQUFzQztZQUN0QyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLG9CQUFvQixDQUFDLENBQUM7WUFDdkQsSUFBSSxhQUFhLEVBQUUsQ0FBQztnQkFDbEIsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELHlDQUF5QyxFQUN6QyxJQUFJLENBQ0wsQ0FDRixDQUFDO1lBQ0osQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUE1Q0Qsa0NBNENDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEM6MjAxMiBSdWxlIDExLjRcclxuICogQSBjb252ZXJzaW9uIHNob3VsZCBub3QgYmUgcGVyZm9ybWVkIGJldHdlZW4gYSBwb2ludGVyIHRvIG9iamVjdCBhbmQgYW4gaW50ZWdlciB0eXBlLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ18xMV80IGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTExLjQnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0EgY29udmVyc2lvbiBzaG91bGQgbm90IGJlIHBlcmZvcm1lZCBiZXR3ZWVuIGEgcG9pbnRlciB0byBvYmplY3QgYW5kIGFuIGludGVnZXIgdHlwZSc7XHJcbiAgc2V2ZXJpdHkgPSAnYWR2aXNvcnknIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ1BvaW50ZXJzJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhc3QubGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGFzdC5saW5lc1tpXS50cmltKCk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBDaGVjayBmb3IgcG9pbnRlciB0byBpbnQgY29udmVyc2lvblxyXG4gICAgICBjb25zdCBwdHJUb0ludE1hdGNoID0gbGluZS5tYXRjaCgvXFwoKD86aW50fGxvbmd8dW5zaWduZWQpXFwpXFxzKlxcdysvKTtcclxuICAgICAgaWYgKHB0clRvSW50TWF0Y2ggJiYgKGxpbmUuaW5jbHVkZXMoJyonKSB8fCBsaW5lLmluY2x1ZGVzKCcmJykpKSB7XHJcbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgJ0NvbnZlcnNpb24gYmV0d2VlbiBwb2ludGVyIGFuZCBpbnRlZ2VyIHR5cGUnLFxyXG4gICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gQ2hlY2sgZm9yIGludCB0byBwb2ludGVyIGNvbnZlcnNpb25cclxuICAgICAgY29uc3QgaW50VG9QdHJNYXRjaCA9IGxpbmUubWF0Y2goL1xcKFxcdytcXHMqXFwqXFwpXFxzKlxcZCsvKTtcclxuICAgICAgaWYgKGludFRvUHRyTWF0Y2gpIHtcclxuICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAnQ29udmVyc2lvbiBmcm9tIGludGVnZXIgdG8gcG9pbnRlciB0eXBlJyxcclxuICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgKVxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19