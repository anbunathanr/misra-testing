"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_5_0_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 5-0-1
 * The value of an expression shall be the same under any order of evaluation.
 * Detects implicit conversions between different numeric types in C++.
 */
class Rule_CPP_5_0_1 {
    id = 'MISRA-CPP-5.0.1';
    description = 'Implicit conversions between different numeric types shall not be used';
    severity = 'required';
    category = 'Conversions';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Detect implicit conversions: float f = 10; (int literal to float)
        const floatFromIntLiteralRegex = /\b(float|double)\s+\w+\s*=\s*\d+\s*;/;
        // Detect mixed arithmetic: int x = float_var + 1.0;
        const mixedArithRegex = /\b(int|short|char|long)\s+\w+\s*=\s*.*\b(float|double)\b/;
        const floatToIntRegex = /\b(float|double)\s+\w+\s*=\s*.*\b(int|short|char|long)\b/;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#') || line.startsWith('//') || !line)
                continue;
            // Check for float/double initialized with integer literal
            if (floatFromIntLiteralRegex.test(line)) {
                // Check there's no explicit C++ cast or C-style cast
                const hasCast = line.includes('static_cast') ||
                    line.includes('(int)') ||
                    line.includes('(float)') ||
                    line.includes('(double)') ||
                    line.includes('(long)');
                if (!hasCast) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Implicit conversion from integer literal to floating-point type', line));
                }
            }
            if (mixedArithRegex.test(line) || floatToIntRegex.test(line)) {
                // Check there's no explicit C++ cast or C-style cast
                const hasCast = line.includes('static_cast') ||
                    line.includes('(int)') ||
                    line.includes('(float)') ||
                    line.includes('(double)') ||
                    line.includes('(long)');
                if (!hasCast) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Implicit conversion between integer and floating-point types', line));
                }
            }
        }
        return violations;
    }
}
exports.Rule_CPP_5_0_1 = Rule_CPP_5_0_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS01LTAtMS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtNS0wLTEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7O0dBSUc7QUFDSCxNQUFhLGNBQWM7SUFDekIsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ3ZCLFdBQVcsR0FBRyx3RUFBd0UsQ0FBQztJQUN2RixRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsYUFBYSxDQUFDO0lBQ3pCLFFBQVEsR0FBRyxLQUFjLENBQUM7SUFFMUIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsTUFBTSxVQUFVLEdBQWdCLEVBQUUsQ0FBQztRQUNuQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBRXhCLG9FQUFvRTtRQUNwRSxNQUFNLHdCQUF3QixHQUFHLHNDQUFzQyxDQUFDO1FBQ3hFLG9EQUFvRDtRQUNwRCxNQUFNLGVBQWUsR0FBRywwREFBMEQsQ0FBQztRQUNuRixNQUFNLGVBQWUsR0FBRywwREFBMEQsQ0FBQztRQUVuRixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM3QixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUk7Z0JBQUUsU0FBUztZQUVyRSwwREFBMEQ7WUFDMUQsSUFBSSx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDeEMscURBQXFEO2dCQUNyRCxNQUFNLE9BQU8sR0FDWCxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQztvQkFDNUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUM7b0JBQ3RCLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDO29CQUN4QixJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQztvQkFDekIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDMUIsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNiLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCxpRUFBaUUsRUFDakUsSUFBSSxDQUNMLENBQ0YsQ0FBQztnQkFDSixDQUFDO1lBQ0gsQ0FBQztZQUVELElBQUksZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQzdELHFEQUFxRDtnQkFDckQsTUFBTSxPQUFPLEdBQ1gsSUFBSSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUM7b0JBQzVCLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDO29CQUN0QixJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQztvQkFDeEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUM7b0JBQ3pCLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQzFCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDYixVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0QsOERBQThELEVBQzlELElBQUksQ0FDTCxDQUNGLENBQUM7Z0JBQ0osQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBbkVELHdDQW1FQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDKys6MjAwOCBSdWxlIDUtMC0xXHJcbiAqIFRoZSB2YWx1ZSBvZiBhbiBleHByZXNzaW9uIHNoYWxsIGJlIHRoZSBzYW1lIHVuZGVyIGFueSBvcmRlciBvZiBldmFsdWF0aW9uLlxyXG4gKiBEZXRlY3RzIGltcGxpY2l0IGNvbnZlcnNpb25zIGJldHdlZW4gZGlmZmVyZW50IG51bWVyaWMgdHlwZXMgaW4gQysrLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ1BQXzVfMF8xIGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DUFAtNS4wLjEnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0ltcGxpY2l0IGNvbnZlcnNpb25zIGJldHdlZW4gZGlmZmVyZW50IG51bWVyaWMgdHlwZXMgc2hhbGwgbm90IGJlIHVzZWQnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdDb252ZXJzaW9ucyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQ1BQJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcbiAgICBjb25zdCBsaW5lcyA9IGFzdC5saW5lcztcclxuXHJcbiAgICAvLyBEZXRlY3QgaW1wbGljaXQgY29udmVyc2lvbnM6IGZsb2F0IGYgPSAxMDsgKGludCBsaXRlcmFsIHRvIGZsb2F0KVxyXG4gICAgY29uc3QgZmxvYXRGcm9tSW50TGl0ZXJhbFJlZ2V4ID0gL1xcYihmbG9hdHxkb3VibGUpXFxzK1xcdytcXHMqPVxccypcXGQrXFxzKjsvO1xyXG4gICAgLy8gRGV0ZWN0IG1peGVkIGFyaXRobWV0aWM6IGludCB4ID0gZmxvYXRfdmFyICsgMS4wO1xyXG4gICAgY29uc3QgbWl4ZWRBcml0aFJlZ2V4ID0gL1xcYihpbnR8c2hvcnR8Y2hhcnxsb25nKVxccytcXHcrXFxzKj1cXHMqLipcXGIoZmxvYXR8ZG91YmxlKVxcYi87XHJcbiAgICBjb25zdCBmbG9hdFRvSW50UmVnZXggPSAvXFxiKGZsb2F0fGRvdWJsZSlcXHMrXFx3K1xccyo9XFxzKi4qXFxiKGludHxzaG9ydHxjaGFyfGxvbmcpXFxiLztcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBsaW5lc1tpXS50cmltKCk7XHJcbiAgICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoJyMnKSB8fCBsaW5lLnN0YXJ0c1dpdGgoJy8vJykgfHwgIWxpbmUpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgLy8gQ2hlY2sgZm9yIGZsb2F0L2RvdWJsZSBpbml0aWFsaXplZCB3aXRoIGludGVnZXIgbGl0ZXJhbFxyXG4gICAgICBpZiAoZmxvYXRGcm9tSW50TGl0ZXJhbFJlZ2V4LnRlc3QobGluZSkpIHtcclxuICAgICAgICAvLyBDaGVjayB0aGVyZSdzIG5vIGV4cGxpY2l0IEMrKyBjYXN0IG9yIEMtc3R5bGUgY2FzdFxyXG4gICAgICAgIGNvbnN0IGhhc0Nhc3QgPVxyXG4gICAgICAgICAgbGluZS5pbmNsdWRlcygnc3RhdGljX2Nhc3QnKSB8fFxyXG4gICAgICAgICAgbGluZS5pbmNsdWRlcygnKGludCknKSB8fFxyXG4gICAgICAgICAgbGluZS5pbmNsdWRlcygnKGZsb2F0KScpIHx8XHJcbiAgICAgICAgICBsaW5lLmluY2x1ZGVzKCcoZG91YmxlKScpIHx8XHJcbiAgICAgICAgICBsaW5lLmluY2x1ZGVzKCcobG9uZyknKTtcclxuICAgICAgICBpZiAoIWhhc0Nhc3QpIHtcclxuICAgICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgICAnSW1wbGljaXQgY29udmVyc2lvbiBmcm9tIGludGVnZXIgbGl0ZXJhbCB0byBmbG9hdGluZy1wb2ludCB0eXBlJyxcclxuICAgICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAobWl4ZWRBcml0aFJlZ2V4LnRlc3QobGluZSkgfHwgZmxvYXRUb0ludFJlZ2V4LnRlc3QobGluZSkpIHtcclxuICAgICAgICAvLyBDaGVjayB0aGVyZSdzIG5vIGV4cGxpY2l0IEMrKyBjYXN0IG9yIEMtc3R5bGUgY2FzdFxyXG4gICAgICAgIGNvbnN0IGhhc0Nhc3QgPVxyXG4gICAgICAgICAgbGluZS5pbmNsdWRlcygnc3RhdGljX2Nhc3QnKSB8fFxyXG4gICAgICAgICAgbGluZS5pbmNsdWRlcygnKGludCknKSB8fFxyXG4gICAgICAgICAgbGluZS5pbmNsdWRlcygnKGZsb2F0KScpIHx8XHJcbiAgICAgICAgICBsaW5lLmluY2x1ZGVzKCcoZG91YmxlKScpIHx8XHJcbiAgICAgICAgICBsaW5lLmluY2x1ZGVzKCcobG9uZyknKTtcclxuICAgICAgICBpZiAoIWhhc0Nhc3QpIHtcclxuICAgICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgICAnSW1wbGljaXQgY29udmVyc2lvbiBiZXR3ZWVuIGludGVnZXIgYW5kIGZsb2F0aW5nLXBvaW50IHR5cGVzJyxcclxuICAgICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==