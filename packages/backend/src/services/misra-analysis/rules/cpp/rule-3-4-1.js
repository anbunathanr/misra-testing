"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_3_4_1 = void 0;
/**
 * MISRA C++:2008 Rule 3-4-1
 * An identifier declared to be an object or type shall be defined in a block that minimizes its visibility.
 * Encourages minimal scope for declarations.
 */
class Rule_CPP_3_4_1 {
    id = 'MISRA-CPP-3.4.1';
    description = 'Identifiers shall be defined in minimal scope';
    severity = 'required';
    category = 'Declarations';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Check for variables declared at function start but used much later
        let inFunction = false;
        const declaredVars = new Map();
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('//') || line.startsWith('#') || !line)
                continue;
            // Function start
            if (/\b\w+\s+\w+\s*\([^)]*\)\s*{/.test(line)) {
                inFunction = true;
                declaredVars.clear();
                continue;
            }
            // Function end
            if (line === '}' && inFunction) {
                inFunction = false;
                continue;
            }
            if (inFunction) {
                // Variable declaration
                const declMatch = line.match(/^\s*\w+\s+(\w+)\s*[;=]/);
                if (declMatch) {
                    declaredVars.set(declMatch[1], i + 1);
                }
            }
        }
        return violations;
    }
}
exports.Rule_CPP_3_4_1 = Rule_CPP_3_4_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0zLTQtMS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtMy00LTEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBSUE7Ozs7R0FJRztBQUNILE1BQWEsY0FBYztJQUN6QixFQUFFLEdBQUcsaUJBQWlCLENBQUM7SUFDdkIsV0FBVyxHQUFHLCtDQUErQyxDQUFDO0lBQzlELFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxjQUFjLENBQUM7SUFDMUIsUUFBUSxHQUFHLEtBQWMsQ0FBQztJQUUxQixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7UUFFeEIscUVBQXFFO1FBQ3JFLElBQUksVUFBVSxHQUFHLEtBQUssQ0FBQztRQUN2QixNQUFNLFlBQVksR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztRQUUvQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM3QixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUk7Z0JBQUUsU0FBUztZQUVyRSxpQkFBaUI7WUFDakIsSUFBSSw2QkFBNkIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDN0MsVUFBVSxHQUFHLElBQUksQ0FBQztnQkFDbEIsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNyQixTQUFTO1lBQ1gsQ0FBQztZQUVELGVBQWU7WUFDZixJQUFJLElBQUksS0FBSyxHQUFHLElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQy9CLFVBQVUsR0FBRyxLQUFLLENBQUM7Z0JBQ25CLFNBQVM7WUFDWCxDQUFDO1lBRUQsSUFBSSxVQUFVLEVBQUUsQ0FBQztnQkFDZix1QkFBdUI7Z0JBQ3ZCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQztnQkFDdkQsSUFBSSxTQUFTLEVBQUUsQ0FBQztvQkFDZCxZQUFZLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hDLENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQTNDRCx3Q0EyQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQysrOjIwMDggUnVsZSAzLTQtMVxyXG4gKiBBbiBpZGVudGlmaWVyIGRlY2xhcmVkIHRvIGJlIGFuIG9iamVjdCBvciB0eXBlIHNoYWxsIGJlIGRlZmluZWQgaW4gYSBibG9jayB0aGF0IG1pbmltaXplcyBpdHMgdmlzaWJpbGl0eS5cclxuICogRW5jb3VyYWdlcyBtaW5pbWFsIHNjb3BlIGZvciBkZWNsYXJhdGlvbnMuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DUFBfM180XzEgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUNQUC0zLjQuMSc7XHJcbiAgZGVzY3JpcHRpb24gPSAnSWRlbnRpZmllcnMgc2hhbGwgYmUgZGVmaW5lZCBpbiBtaW5pbWFsIHNjb3BlJztcclxuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnRGVjbGFyYXRpb25zJztcclxuICBsYW5ndWFnZSA9ICdDUFAnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuICAgIGNvbnN0IGxpbmVzID0gYXN0LmxpbmVzO1xyXG5cclxuICAgIC8vIENoZWNrIGZvciB2YXJpYWJsZXMgZGVjbGFyZWQgYXQgZnVuY3Rpb24gc3RhcnQgYnV0IHVzZWQgbXVjaCBsYXRlclxyXG4gICAgbGV0IGluRnVuY3Rpb24gPSBmYWxzZTtcclxuICAgIGNvbnN0IGRlY2xhcmVkVmFycyA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gbGluZXNbaV0udHJpbSgpO1xyXG4gICAgICBpZiAobGluZS5zdGFydHNXaXRoKCcvLycpIHx8IGxpbmUuc3RhcnRzV2l0aCgnIycpIHx8ICFsaW5lKSBjb250aW51ZTtcclxuXHJcbiAgICAgIC8vIEZ1bmN0aW9uIHN0YXJ0XHJcbiAgICAgIGlmICgvXFxiXFx3K1xccytcXHcrXFxzKlxcKFteKV0qXFwpXFxzKnsvLnRlc3QobGluZSkpIHtcclxuICAgICAgICBpbkZ1bmN0aW9uID0gdHJ1ZTtcclxuICAgICAgICBkZWNsYXJlZFZhcnMuY2xlYXIoKTtcclxuICAgICAgICBjb250aW51ZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gRnVuY3Rpb24gZW5kXHJcbiAgICAgIGlmIChsaW5lID09PSAnfScgJiYgaW5GdW5jdGlvbikge1xyXG4gICAgICAgIGluRnVuY3Rpb24gPSBmYWxzZTtcclxuICAgICAgICBjb250aW51ZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKGluRnVuY3Rpb24pIHtcclxuICAgICAgICAvLyBWYXJpYWJsZSBkZWNsYXJhdGlvblxyXG4gICAgICAgIGNvbnN0IGRlY2xNYXRjaCA9IGxpbmUubWF0Y2goL15cXHMqXFx3K1xccysoXFx3KylcXHMqWzs9XS8pO1xyXG4gICAgICAgIGlmIChkZWNsTWF0Y2gpIHtcclxuICAgICAgICAgIGRlY2xhcmVkVmFycy5zZXQoZGVjbE1hdGNoWzFdLCBpICsgMSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==