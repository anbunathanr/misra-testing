"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_3_1_2 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 3-1-2
 * Functions shall not be declared at block scope.
 * Detects function declarations inside function bodies.
 */
class Rule_CPP_3_1_2 {
    id = 'MISRA-CPP-3.1.2';
    description = 'Functions shall not be declared at block scope';
    severity = 'required';
    category = 'Declarations';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        let braceDepth = 0;
        let inFunction = false;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('//') || line.startsWith('#') || !line)
                continue;
            // Track brace depth
            braceDepth += (line.match(/{/g) || []).length;
            braceDepth -= (line.match(/}/g) || []).length;
            // Detect function definition start
            if (/\b\w+\s+\w+\s*\([^)]*\)\s*{/.test(line)) {
                inFunction = true;
            }
            // Detect function declaration inside function (braceDepth > 1)
            if (braceDepth > 1 && inFunction) {
                // Function declaration pattern: type name(params);
                if (/\b\w+\s+\w+\s*\([^)]*\)\s*;/.test(line)) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Function declared at block scope', line));
                }
            }
            if (braceDepth === 0) {
                inFunction = false;
            }
        }
        return violations;
    }
}
exports.Rule_CPP_3_1_2 = Rule_CPP_3_1_2;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0zLTEtMi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtMy0xLTIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7O0dBSUc7QUFDSCxNQUFhLGNBQWM7SUFDekIsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ3ZCLFdBQVcsR0FBRyxnREFBZ0QsQ0FBQztJQUMvRCxRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsY0FBYyxDQUFDO0lBQzFCLFFBQVEsR0FBRyxLQUFjLENBQUM7SUFFMUIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsTUFBTSxVQUFVLEdBQWdCLEVBQUUsQ0FBQztRQUNuQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBRXhCLElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQztRQUNuQixJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUM7UUFFdkIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN0QyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDN0IsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJO2dCQUFFLFNBQVM7WUFFckUsb0JBQW9CO1lBQ3BCLFVBQVUsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDO1lBQzlDLFVBQVUsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDO1lBRTlDLG1DQUFtQztZQUNuQyxJQUFJLDZCQUE2QixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUM3QyxVQUFVLEdBQUcsSUFBSSxDQUFDO1lBQ3BCLENBQUM7WUFFRCwrREFBK0Q7WUFDL0QsSUFBSSxVQUFVLEdBQUcsQ0FBQyxJQUFJLFVBQVUsRUFBRSxDQUFDO2dCQUNqQyxtREFBbUQ7Z0JBQ25ELElBQUksNkJBQTZCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7b0JBQzdDLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCxrQ0FBa0MsRUFDbEMsSUFBSSxDQUNMLENBQ0YsQ0FBQztnQkFDSixDQUFDO1lBQ0gsQ0FBQztZQUVELElBQUksVUFBVSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNyQixVQUFVLEdBQUcsS0FBSyxDQUFDO1lBQ3JCLENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBbERELHdDQWtEQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDKys6MjAwOCBSdWxlIDMtMS0yXHJcbiAqIEZ1bmN0aW9ucyBzaGFsbCBub3QgYmUgZGVjbGFyZWQgYXQgYmxvY2sgc2NvcGUuXHJcbiAqIERldGVjdHMgZnVuY3Rpb24gZGVjbGFyYXRpb25zIGluc2lkZSBmdW5jdGlvbiBib2RpZXMuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DUFBfM18xXzIgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUNQUC0zLjEuMic7XHJcbiAgZGVzY3JpcHRpb24gPSAnRnVuY3Rpb25zIHNoYWxsIG5vdCBiZSBkZWNsYXJlZCBhdCBibG9jayBzY29wZSc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0RlY2xhcmF0aW9ucyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQ1BQJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcbiAgICBjb25zdCBsaW5lcyA9IGFzdC5saW5lcztcclxuXHJcbiAgICBsZXQgYnJhY2VEZXB0aCA9IDA7XHJcbiAgICBsZXQgaW5GdW5jdGlvbiA9IGZhbHNlO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnLy8nKSB8fCBsaW5lLnN0YXJ0c1dpdGgoJyMnKSB8fCAhbGluZSkgY29udGludWU7XHJcblxyXG4gICAgICAvLyBUcmFjayBicmFjZSBkZXB0aFxyXG4gICAgICBicmFjZURlcHRoICs9IChsaW5lLm1hdGNoKC97L2cpIHx8IFtdKS5sZW5ndGg7XHJcbiAgICAgIGJyYWNlRGVwdGggLT0gKGxpbmUubWF0Y2goL30vZykgfHwgW10pLmxlbmd0aDtcclxuXHJcbiAgICAgIC8vIERldGVjdCBmdW5jdGlvbiBkZWZpbml0aW9uIHN0YXJ0XHJcbiAgICAgIGlmICgvXFxiXFx3K1xccytcXHcrXFxzKlxcKFteKV0qXFwpXFxzKnsvLnRlc3QobGluZSkpIHtcclxuICAgICAgICBpbkZ1bmN0aW9uID0gdHJ1ZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gRGV0ZWN0IGZ1bmN0aW9uIGRlY2xhcmF0aW9uIGluc2lkZSBmdW5jdGlvbiAoYnJhY2VEZXB0aCA+IDEpXHJcbiAgICAgIGlmIChicmFjZURlcHRoID4gMSAmJiBpbkZ1bmN0aW9uKSB7XHJcbiAgICAgICAgLy8gRnVuY3Rpb24gZGVjbGFyYXRpb24gcGF0dGVybjogdHlwZSBuYW1lKHBhcmFtcyk7XHJcbiAgICAgICAgaWYgKC9cXGJcXHcrXFxzK1xcdytcXHMqXFwoW14pXSpcXClcXHMqOy8udGVzdChsaW5lKSkge1xyXG4gICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAgICdGdW5jdGlvbiBkZWNsYXJlZCBhdCBibG9jayBzY29wZScsXHJcbiAgICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKGJyYWNlRGVwdGggPT09IDApIHtcclxuICAgICAgICBpbkZ1bmN0aW9uID0gZmFsc2U7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19