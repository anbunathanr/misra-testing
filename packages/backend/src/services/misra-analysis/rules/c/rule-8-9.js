"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_8_9 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 8.9
 * An object should be defined at block scope if its identifier only appears in a single function.
 */
class Rule_C_8_9 {
    id = 'MISRA-C-8.9';
    description = 'An object should be defined at block scope if its identifier only appears in a single function';
    severity = 'advisory';
    category = 'Declarations';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        const globalVars = new Map();
        // Find global variable declarations
        let inFunction = false;
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            if (line.includes('{'))
                inFunction = true;
            if (line.includes('}'))
                inFunction = false;
            if (!inFunction && !line.startsWith('#')) {
                const varMatch = line.match(/(?:int|char|float|double|long|short)\s+(\w+)\s*[;=]/);
                if (varMatch && !line.includes('static')) {
                    globalVars.set(varMatch[1], i + 1);
                }
            }
        }
        // Check if global vars are only used in one function
        for (const [varName, lineNum] of globalVars) {
            let usageCount = 0;
            for (const func of ast.functions) {
                const funcLine = func.line;
                for (let i = funcLine; i < Math.min(funcLine + 50, ast.lines.length); i++) {
                    if (ast.lines[i - 1] && ast.lines[i - 1].includes(varName)) {
                        usageCount++;
                        break;
                    }
                }
            }
            if (usageCount === 1) {
                violations.push((0, rule_engine_1.createViolation)(this, lineNum, 0, `Variable '${varName}' should be defined at block scope`, ast.lines[lineNum - 1]));
            }
        }
        return violations;
    }
}
exports.Rule_C_8_9 = Rule_C_8_9;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS04LTkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTgtOS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7OztHQUdHO0FBQ0gsTUFBYSxVQUFVO0lBQ3JCLEVBQUUsR0FBRyxhQUFhLENBQUM7SUFDbkIsV0FBVyxHQUFHLGdHQUFnRyxDQUFDO0lBQy9HLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxjQUFjLENBQUM7SUFDMUIsUUFBUSxHQUFHLEdBQVksQ0FBQztJQUV4QixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sVUFBVSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1FBRTdDLG9DQUFvQztRQUNwQyxJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUM7UUFDdkIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVqQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDO2dCQUFFLFVBQVUsR0FBRyxJQUFJLENBQUM7WUFDMUMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQztnQkFBRSxVQUFVLEdBQUcsS0FBSyxDQUFDO1lBRTNDLElBQUksQ0FBQyxVQUFVLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3pDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMscURBQXFELENBQUMsQ0FBQztnQkFDbkYsSUFBSSxRQUFRLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7b0JBQ3pDLFVBQVUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDckMsQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDO1FBRUQscURBQXFEO1FBQ3JELEtBQUssTUFBTSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUM1QyxJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUM7WUFDbkIsS0FBSyxNQUFNLElBQUksSUFBSSxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ2pDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7Z0JBQzNCLEtBQUssSUFBSSxDQUFDLEdBQUcsUUFBUSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsR0FBRyxFQUFFLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUMxRSxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO3dCQUMzRCxVQUFVLEVBQUUsQ0FBQzt3QkFDYixNQUFNO29CQUNSLENBQUM7Z0JBQ0gsQ0FBQztZQUNILENBQUM7WUFFRCxJQUFJLFVBQVUsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDckIsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLE9BQU8sRUFDUCxDQUFDLEVBQ0QsYUFBYSxPQUFPLG9DQUFvQyxFQUN4RCxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FDdkIsQ0FDRixDQUFDO1lBQ0osQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUF2REQsZ0NBdURDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEM6MjAxMiBSdWxlIDguOVxyXG4gKiBBbiBvYmplY3Qgc2hvdWxkIGJlIGRlZmluZWQgYXQgYmxvY2sgc2NvcGUgaWYgaXRzIGlkZW50aWZpZXIgb25seSBhcHBlYXJzIGluIGEgc2luZ2xlIGZ1bmN0aW9uLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ184XzkgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtOC45JztcclxuICBkZXNjcmlwdGlvbiA9ICdBbiBvYmplY3Qgc2hvdWxkIGJlIGRlZmluZWQgYXQgYmxvY2sgc2NvcGUgaWYgaXRzIGlkZW50aWZpZXIgb25seSBhcHBlYXJzIGluIGEgc2luZ2xlIGZ1bmN0aW9uJztcclxuICBzZXZlcml0eSA9ICdhZHZpc29yeScgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnRGVjbGFyYXRpb25zJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcbiAgICBjb25zdCBnbG9iYWxWYXJzID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKTtcclxuXHJcbiAgICAvLyBGaW5kIGdsb2JhbCB2YXJpYWJsZSBkZWNsYXJhdGlvbnNcclxuICAgIGxldCBpbkZ1bmN0aW9uID0gZmFsc2U7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFzdC5saW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gYXN0LmxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgXHJcbiAgICAgIGlmIChsaW5lLmluY2x1ZGVzKCd7JykpIGluRnVuY3Rpb24gPSB0cnVlO1xyXG4gICAgICBpZiAobGluZS5pbmNsdWRlcygnfScpKSBpbkZ1bmN0aW9uID0gZmFsc2U7XHJcbiAgICAgIFxyXG4gICAgICBpZiAoIWluRnVuY3Rpb24gJiYgIWxpbmUuc3RhcnRzV2l0aCgnIycpKSB7XHJcbiAgICAgICAgY29uc3QgdmFyTWF0Y2ggPSBsaW5lLm1hdGNoKC8oPzppbnR8Y2hhcnxmbG9hdHxkb3VibGV8bG9uZ3xzaG9ydClcXHMrKFxcdyspXFxzKls7PV0vKTtcclxuICAgICAgICBpZiAodmFyTWF0Y2ggJiYgIWxpbmUuaW5jbHVkZXMoJ3N0YXRpYycpKSB7XHJcbiAgICAgICAgICBnbG9iYWxWYXJzLnNldCh2YXJNYXRjaFsxXSwgaSArIDEpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIGlmIGdsb2JhbCB2YXJzIGFyZSBvbmx5IHVzZWQgaW4gb25lIGZ1bmN0aW9uXHJcbiAgICBmb3IgKGNvbnN0IFt2YXJOYW1lLCBsaW5lTnVtXSBvZiBnbG9iYWxWYXJzKSB7XHJcbiAgICAgIGxldCB1c2FnZUNvdW50ID0gMDtcclxuICAgICAgZm9yIChjb25zdCBmdW5jIG9mIGFzdC5mdW5jdGlvbnMpIHtcclxuICAgICAgICBjb25zdCBmdW5jTGluZSA9IGZ1bmMubGluZTtcclxuICAgICAgICBmb3IgKGxldCBpID0gZnVuY0xpbmU7IGkgPCBNYXRoLm1pbihmdW5jTGluZSArIDUwLCBhc3QubGluZXMubGVuZ3RoKTsgaSsrKSB7XHJcbiAgICAgICAgICBpZiAoYXN0LmxpbmVzW2kgLSAxXSAmJiBhc3QubGluZXNbaSAtIDFdLmluY2x1ZGVzKHZhck5hbWUpKSB7XHJcbiAgICAgICAgICAgIHVzYWdlQ291bnQrKztcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICBpZiAodXNhZ2VDb3VudCA9PT0gMSkge1xyXG4gICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgbGluZU51bSxcclxuICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgYFZhcmlhYmxlICcke3Zhck5hbWV9JyBzaG91bGQgYmUgZGVmaW5lZCBhdCBibG9jayBzY29wZWAsXHJcbiAgICAgICAgICAgIGFzdC5saW5lc1tsaW5lTnVtIC0gMV1cclxuICAgICAgICAgIClcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==