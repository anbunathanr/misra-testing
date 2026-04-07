"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_9_4 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 9.4
 * An element of an object shall not be initialized more than once.
 */
class Rule_C_9_4 {
    id = 'MISRA-C-9.4';
    description = 'An element of an object shall not be initialized more than once';
    severity = 'required';
    category = 'Initialization';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Check for designated initializers with duplicate indices
            const initMatch = line.match(/\{([^}]*)\}/);
            if (initMatch) {
                const initializers = initMatch[1];
                const indices = new Set();
                const designatedMatches = initializers.matchAll(/\[(\d+)\]/g);
                for (const match of designatedMatches) {
                    const index = match[1];
                    if (indices.has(index)) {
                        violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Array element [${index}] initialized more than once`, line));
                    }
                    indices.add(index);
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_9_4 = Rule_C_9_4;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS05LTQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTktNC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7OztHQUdHO0FBQ0gsTUFBYSxVQUFVO0lBQ3JCLEVBQUUsR0FBRyxhQUFhLENBQUM7SUFDbkIsV0FBVyxHQUFHLGlFQUFpRSxDQUFDO0lBQ2hGLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxnQkFBZ0IsQ0FBQztJQUM1QixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFFbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVqQywyREFBMkQ7WUFDM0QsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUM1QyxJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUNkLE1BQU0sWUFBWSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDbEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztnQkFDbEMsTUFBTSxpQkFBaUIsR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUU5RCxLQUFLLE1BQU0sS0FBSyxJQUFJLGlCQUFpQixFQUFFLENBQUM7b0JBQ3RDLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDdkIsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7d0JBQ3ZCLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCxrQkFBa0IsS0FBSyw4QkFBOEIsRUFDckQsSUFBSSxDQUNMLENBQ0YsQ0FBQztvQkFDSixDQUFDO29CQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3JCLENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQXhDRCxnQ0F3Q0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQzoyMDEyIFJ1bGUgOS40XHJcbiAqIEFuIGVsZW1lbnQgb2YgYW4gb2JqZWN0IHNoYWxsIG5vdCBiZSBpbml0aWFsaXplZCBtb3JlIHRoYW4gb25jZS5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfOV80IGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTkuNCc7XHJcbiAgZGVzY3JpcHRpb24gPSAnQW4gZWxlbWVudCBvZiBhbiBvYmplY3Qgc2hhbGwgbm90IGJlIGluaXRpYWxpemVkIG1vcmUgdGhhbiBvbmNlJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnSW5pdGlhbGl6YXRpb24nO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFzdC5saW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gYXN0LmxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgXHJcbiAgICAgIC8vIENoZWNrIGZvciBkZXNpZ25hdGVkIGluaXRpYWxpemVycyB3aXRoIGR1cGxpY2F0ZSBpbmRpY2VzXHJcbiAgICAgIGNvbnN0IGluaXRNYXRjaCA9IGxpbmUubWF0Y2goL1xceyhbXn1dKilcXH0vKTtcclxuICAgICAgaWYgKGluaXRNYXRjaCkge1xyXG4gICAgICAgIGNvbnN0IGluaXRpYWxpemVycyA9IGluaXRNYXRjaFsxXTtcclxuICAgICAgICBjb25zdCBpbmRpY2VzID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcbiAgICAgICAgY29uc3QgZGVzaWduYXRlZE1hdGNoZXMgPSBpbml0aWFsaXplcnMubWF0Y2hBbGwoL1xcWyhcXGQrKVxcXS9nKTtcclxuICAgICAgICBcclxuICAgICAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGRlc2lnbmF0ZWRNYXRjaGVzKSB7XHJcbiAgICAgICAgICBjb25zdCBpbmRleCA9IG1hdGNoWzFdO1xyXG4gICAgICAgICAgaWYgKGluZGljZXMuaGFzKGluZGV4KSkge1xyXG4gICAgICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgICAgIGBBcnJheSBlbGVtZW50IFske2luZGV4fV0gaW5pdGlhbGl6ZWQgbW9yZSB0aGFuIG9uY2VgLFxyXG4gICAgICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgICAgIClcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGluZGljZXMuYWRkKGluZGV4KTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19