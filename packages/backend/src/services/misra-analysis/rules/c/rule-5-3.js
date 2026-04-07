"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_5_3 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 5.3
 * An identifier declared in an inner scope shall not hide an identifier in an outer scope.
 */
class Rule_C_5_3 {
    id = 'MISRA-C-5.3';
    description = 'An identifier declared in an inner scope shall not hide an identifier in an outer scope';
    severity = 'required';
    category = 'Identifiers';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        const outerScope = new Set();
        let braceDepth = 0;
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            braceDepth += (line.match(/{/g) || []).length;
            braceDepth -= (line.match(/}/g) || []).length;
            const declMatch = line.match(/(?:int|char|float|double|long|short|void)\s+(\w+)/);
            if (declMatch) {
                const id = declMatch[1];
                if (braceDepth > 1 && outerScope.has(id)) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Identifier '${id}' hides outer scope identifier`, line));
                }
                else if (braceDepth <= 1) {
                    outerScope.add(id);
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_5_3 = Rule_C_5_3;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS01LTMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTUtMy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7OztHQUdHO0FBQ0gsTUFBYSxVQUFVO0lBQ3JCLEVBQUUsR0FBRyxhQUFhLENBQUM7SUFDbkIsV0FBVyxHQUFHLHlGQUF5RixDQUFDO0lBQ3hHLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxhQUFhLENBQUM7SUFDekIsUUFBUSxHQUFHLEdBQVksQ0FBQztJQUV4QixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sVUFBVSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFDckMsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFDO1FBRW5CLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQzFDLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFFakMsVUFBVSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUM7WUFDOUMsVUFBVSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUM7WUFFOUMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxtREFBbUQsQ0FBQyxDQUFDO1lBQ2xGLElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQ2QsTUFBTSxFQUFFLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUV4QixJQUFJLFVBQVUsR0FBRyxDQUFDLElBQUksVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO29CQUN6QyxVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0QsZUFBZSxFQUFFLGdDQUFnQyxFQUNqRCxJQUFJLENBQ0wsQ0FDRixDQUFDO2dCQUNKLENBQUM7cUJBQU0sSUFBSSxVQUFVLElBQUksQ0FBQyxFQUFFLENBQUM7b0JBQzNCLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3JCLENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQXhDRCxnQ0F3Q0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQzoyMDEyIFJ1bGUgNS4zXHJcbiAqIEFuIGlkZW50aWZpZXIgZGVjbGFyZWQgaW4gYW4gaW5uZXIgc2NvcGUgc2hhbGwgbm90IGhpZGUgYW4gaWRlbnRpZmllciBpbiBhbiBvdXRlciBzY29wZS5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfNV8zIGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTUuMyc7XHJcbiAgZGVzY3JpcHRpb24gPSAnQW4gaWRlbnRpZmllciBkZWNsYXJlZCBpbiBhbiBpbm5lciBzY29wZSBzaGFsbCBub3QgaGlkZSBhbiBpZGVudGlmaWVyIGluIGFuIG91dGVyIHNjb3BlJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnSWRlbnRpZmllcnMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuICAgIGNvbnN0IG91dGVyU2NvcGUgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuICAgIGxldCBicmFjZURlcHRoID0gMDtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFzdC5saW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gYXN0LmxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgXHJcbiAgICAgIGJyYWNlRGVwdGggKz0gKGxpbmUubWF0Y2goL3svZykgfHwgW10pLmxlbmd0aDtcclxuICAgICAgYnJhY2VEZXB0aCAtPSAobGluZS5tYXRjaCgvfS9nKSB8fCBbXSkubGVuZ3RoO1xyXG5cclxuICAgICAgY29uc3QgZGVjbE1hdGNoID0gbGluZS5tYXRjaCgvKD86aW50fGNoYXJ8ZmxvYXR8ZG91YmxlfGxvbmd8c2hvcnR8dm9pZClcXHMrKFxcdyspLyk7XHJcbiAgICAgIGlmIChkZWNsTWF0Y2gpIHtcclxuICAgICAgICBjb25zdCBpZCA9IGRlY2xNYXRjaFsxXTtcclxuICAgICAgICBcclxuICAgICAgICBpZiAoYnJhY2VEZXB0aCA+IDEgJiYgb3V0ZXJTY29wZS5oYXMoaWQpKSB7XHJcbiAgICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICAgYElkZW50aWZpZXIgJyR7aWR9JyBoaWRlcyBvdXRlciBzY29wZSBpZGVudGlmaWVyYCxcclxuICAgICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChicmFjZURlcHRoIDw9IDEpIHtcclxuICAgICAgICAgIG91dGVyU2NvcGUuYWRkKGlkKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19