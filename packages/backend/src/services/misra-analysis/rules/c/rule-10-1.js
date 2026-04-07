"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_10_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 10.1
 * Operands shall not be of an inappropriate essential type.
 * Detects implicit conversions: mixed arithmetic with int and float/double.
 */
class Rule_C_10_1 {
    id = 'MISRA-C-10.1';
    description = 'Operands shall not be of an inappropriate essential type';
    severity = 'required';
    category = 'Conversions';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Look for mixed arithmetic: int variable used with float/double without cast
        // Simple heuristic: look for expressions mixing int and float/double declarations
        const mixedArithRegex = /\b(int|short|char|long)\s+\w+\s*=\s*.*\b(float|double)\b/;
        const floatToIntRegex = /\b(float|double)\s+\w+\s*=\s*.*\b(int|short|char|long)\b/;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#') || line.startsWith('//') || !line)
                continue;
            if (mixedArithRegex.test(line) || floatToIntRegex.test(line)) {
                // Check there's no explicit cast
                if (!line.includes('(int)') && !line.includes('(float)') &&
                    !line.includes('(double)') && !line.includes('(long)')) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Implicit conversion between integer and floating-point types', line));
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_10_1 = Rule_C_10_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xMC0xLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xMC0xLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7OztHQUlHO0FBQ0gsTUFBYSxXQUFXO0lBQ3RCLEVBQUUsR0FBRyxjQUFjLENBQUM7SUFDcEIsV0FBVyxHQUFHLDBEQUEwRCxDQUFDO0lBQ3pFLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxhQUFhLENBQUM7SUFDekIsUUFBUSxHQUFHLEdBQVksQ0FBQztJQUV4QixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7UUFFeEIsOEVBQThFO1FBQzlFLGtGQUFrRjtRQUNsRixNQUFNLGVBQWUsR0FBRywwREFBMEQsQ0FBQztRQUNuRixNQUFNLGVBQWUsR0FBRywwREFBMEQsQ0FBQztRQUVuRixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUU3QixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUk7Z0JBQUUsU0FBUztZQUVyRSxJQUFJLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUM3RCxpQ0FBaUM7Z0JBQ2pDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUM7b0JBQ3BELENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztvQkFDM0QsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELDhEQUE4RCxFQUM5RCxJQUFJLENBQ0wsQ0FDRixDQUFDO2dCQUNKLENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQXhDRCxrQ0F3Q0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQzoyMDEyIFJ1bGUgMTAuMVxyXG4gKiBPcGVyYW5kcyBzaGFsbCBub3QgYmUgb2YgYW4gaW5hcHByb3ByaWF0ZSBlc3NlbnRpYWwgdHlwZS5cclxuICogRGV0ZWN0cyBpbXBsaWNpdCBjb252ZXJzaW9uczogbWl4ZWQgYXJpdGhtZXRpYyB3aXRoIGludCBhbmQgZmxvYXQvZG91YmxlLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ18xMF8xIGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTEwLjEnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ09wZXJhbmRzIHNoYWxsIG5vdCBiZSBvZiBhbiBpbmFwcHJvcHJpYXRlIGVzc2VudGlhbCB0eXBlJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnQ29udmVyc2lvbnMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuICAgIGNvbnN0IGxpbmVzID0gYXN0LmxpbmVzO1xyXG5cclxuICAgIC8vIExvb2sgZm9yIG1peGVkIGFyaXRobWV0aWM6IGludCB2YXJpYWJsZSB1c2VkIHdpdGggZmxvYXQvZG91YmxlIHdpdGhvdXQgY2FzdFxyXG4gICAgLy8gU2ltcGxlIGhldXJpc3RpYzogbG9vayBmb3IgZXhwcmVzc2lvbnMgbWl4aW5nIGludCBhbmQgZmxvYXQvZG91YmxlIGRlY2xhcmF0aW9uc1xyXG4gICAgY29uc3QgbWl4ZWRBcml0aFJlZ2V4ID0gL1xcYihpbnR8c2hvcnR8Y2hhcnxsb25nKVxccytcXHcrXFxzKj1cXHMqLipcXGIoZmxvYXR8ZG91YmxlKVxcYi87XHJcbiAgICBjb25zdCBmbG9hdFRvSW50UmVnZXggPSAvXFxiKGZsb2F0fGRvdWJsZSlcXHMrXFx3K1xccyo9XFxzKi4qXFxiKGludHxzaG9ydHxjaGFyfGxvbmcpXFxiLztcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBsaW5lc1tpXS50cmltKCk7XHJcblxyXG4gICAgICBpZiAobGluZS5zdGFydHNXaXRoKCcjJykgfHwgbGluZS5zdGFydHNXaXRoKCcvLycpIHx8ICFsaW5lKSBjb250aW51ZTtcclxuXHJcbiAgICAgIGlmIChtaXhlZEFyaXRoUmVnZXgudGVzdChsaW5lKSB8fCBmbG9hdFRvSW50UmVnZXgudGVzdChsaW5lKSkge1xyXG4gICAgICAgIC8vIENoZWNrIHRoZXJlJ3Mgbm8gZXhwbGljaXQgY2FzdFxyXG4gICAgICAgIGlmICghbGluZS5pbmNsdWRlcygnKGludCknKSAmJiAhbGluZS5pbmNsdWRlcygnKGZsb2F0KScpICYmXHJcbiAgICAgICAgICAgICFsaW5lLmluY2x1ZGVzKCcoZG91YmxlKScpICYmICFsaW5lLmluY2x1ZGVzKCcobG9uZyknKSkge1xyXG4gICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAgICdJbXBsaWNpdCBjb252ZXJzaW9uIGJldHdlZW4gaW50ZWdlciBhbmQgZmxvYXRpbmctcG9pbnQgdHlwZXMnLFxyXG4gICAgICAgICAgICAgIGxpbmVcclxuICAgICAgICAgICAgKVxyXG4gICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19