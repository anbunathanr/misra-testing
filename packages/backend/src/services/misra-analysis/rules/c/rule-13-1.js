"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_13_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 13.1
 * Initializer lists shall not contain persistent side effects.
 * Detects comma operator usage in initializer lists.
 */
class Rule_C_13_1 {
    id = 'MISRA-C-13.1';
    description = 'Initializer lists shall not contain persistent side effects';
    severity = 'required';
    category = 'Side effects';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Detect comma operator in initializer: int arr[] = {(a++, b), c};
        // or variable initializer: int x = (a++, b);
        const commaOpInInitRegex = /=\s*\([^)]*(?:\+\+|--)[^)]*,[^)]*\)/;
        const commaOpSimpleRegex = /=\s*\([^)]+,[^)]+\)\s*;/;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#') || line.startsWith('//') || !line)
                continue;
            if (commaOpInInitRegex.test(line) || commaOpSimpleRegex.test(line)) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Initializer list contains comma operator which may have persistent side effects', line));
            }
        }
        return violations;
    }
}
exports.Rule_C_13_1 = Rule_C_13_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xMy0xLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xMy0xLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7OztHQUlHO0FBQ0gsTUFBYSxXQUFXO0lBQ3RCLEVBQUUsR0FBRyxjQUFjLENBQUM7SUFDcEIsV0FBVyxHQUFHLDZEQUE2RCxDQUFDO0lBQzVFLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxjQUFjLENBQUM7SUFDMUIsUUFBUSxHQUFHLEdBQVksQ0FBQztJQUV4QixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7UUFFeEIsbUVBQW1FO1FBQ25FLDZDQUE2QztRQUM3QyxNQUFNLGtCQUFrQixHQUFHLHFDQUFxQyxDQUFDO1FBQ2pFLE1BQU0sa0JBQWtCLEdBQUcseUJBQXlCLENBQUM7UUFFckQsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN0QyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFFN0IsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJO2dCQUFFLFNBQVM7WUFFckUsSUFBSSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ25FLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCxpRkFBaUYsRUFDakYsSUFBSSxDQUNMLENBQ0YsQ0FBQztZQUNKLENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBcENELGtDQW9DQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDOjIwMTIgUnVsZSAxMy4xXHJcbiAqIEluaXRpYWxpemVyIGxpc3RzIHNoYWxsIG5vdCBjb250YWluIHBlcnNpc3RlbnQgc2lkZSBlZmZlY3RzLlxyXG4gKiBEZXRlY3RzIGNvbW1hIG9wZXJhdG9yIHVzYWdlIGluIGluaXRpYWxpemVyIGxpc3RzLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ18xM18xIGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTEzLjEnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0luaXRpYWxpemVyIGxpc3RzIHNoYWxsIG5vdCBjb250YWluIHBlcnNpc3RlbnQgc2lkZSBlZmZlY3RzJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnU2lkZSBlZmZlY3RzJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcbiAgICBjb25zdCBsaW5lcyA9IGFzdC5saW5lcztcclxuXHJcbiAgICAvLyBEZXRlY3QgY29tbWEgb3BlcmF0b3IgaW4gaW5pdGlhbGl6ZXI6IGludCBhcnJbXSA9IHsoYSsrLCBiKSwgY307XHJcbiAgICAvLyBvciB2YXJpYWJsZSBpbml0aWFsaXplcjogaW50IHggPSAoYSsrLCBiKTtcclxuICAgIGNvbnN0IGNvbW1hT3BJbkluaXRSZWdleCA9IC89XFxzKlxcKFteKV0qKD86XFwrXFwrfC0tKVteKV0qLFteKV0qXFwpLztcclxuICAgIGNvbnN0IGNvbW1hT3BTaW1wbGVSZWdleCA9IC89XFxzKlxcKFteKV0rLFteKV0rXFwpXFxzKjsvO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGxpbmVzW2ldLnRyaW0oKTtcclxuXHJcbiAgICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoJyMnKSB8fCBsaW5lLnN0YXJ0c1dpdGgoJy8vJykgfHwgIWxpbmUpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgaWYgKGNvbW1hT3BJbkluaXRSZWdleC50ZXN0KGxpbmUpIHx8IGNvbW1hT3BTaW1wbGVSZWdleC50ZXN0KGxpbmUpKSB7XHJcbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgJ0luaXRpYWxpemVyIGxpc3QgY29udGFpbnMgY29tbWEgb3BlcmF0b3Igd2hpY2ggbWF5IGhhdmUgcGVyc2lzdGVudCBzaWRlIGVmZmVjdHMnLFxyXG4gICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=