"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_9_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 9.1
 * The value of an object with automatic storage duration shall not be read
 * before it has been set.
 * Detects variable declarations without initialization.
 */
class Rule_C_9_1 {
    id = 'MISRA-C-9.1';
    description = 'The value of an object with automatic storage duration shall not be read before it has been set';
    severity = 'mandatory';
    category = 'Initialization';
    language = 'C';
    typeKeywords = new Set([
        'int', 'char', 'short', 'long', 'float', 'double',
        'unsigned', 'signed', '_Bool',
    ]);
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Look for variable declarations without initialization
        // Pattern: type name; (no = sign)
        const uninitRegex = /^(?:(?:const|volatile|register)\s+)*([a-zA-Z_]\w*(?:\s*[*]+)?)\s+([a-zA-Z_]\w*)\s*;\s*$/;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#') || line.startsWith('//') || line.startsWith('*') || !line)
                continue;
            if (line.includes('(') || line.includes(')'))
                continue; // Skip function-like lines
            const match = line.match(uninitRegex);
            if (!match)
                continue;
            const typeName = match[1].replace(/\*/g, '').trim();
            const varName = match[2];
            // Only flag primitive types (not structs/pointers which may be intentionally uninitialized)
            if (!this.typeKeywords.has(typeName))
                continue;
            // Skip extern declarations
            if (lines[i].includes('extern'))
                continue;
            violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Variable '${varName}' declared without initialization`, line));
        }
        return violations;
    }
}
exports.Rule_C_9_1 = Rule_C_9_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS05LTEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTktMS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7Ozs7O0dBS0c7QUFDSCxNQUFhLFVBQVU7SUFDckIsRUFBRSxHQUFHLGFBQWEsQ0FBQztJQUNuQixXQUFXLEdBQUcsaUdBQWlHLENBQUM7SUFDaEgsUUFBUSxHQUFHLFdBQW9CLENBQUM7SUFDaEMsUUFBUSxHQUFHLGdCQUFnQixDQUFDO0lBQzVCLFFBQVEsR0FBRyxHQUFZLENBQUM7SUFFUCxZQUFZLEdBQUcsSUFBSSxHQUFHLENBQUM7UUFDdEMsS0FBSyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxRQUFRO1FBQ2pELFVBQVUsRUFBRSxRQUFRLEVBQUUsT0FBTztLQUM5QixDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7UUFFeEIsd0RBQXdEO1FBQ3hELGtDQUFrQztRQUNsQyxNQUFNLFdBQVcsR0FBRyx5RkFBeUYsQ0FBQztRQUU5RyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUU3QixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSTtnQkFBRSxTQUFTO1lBQzdGLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQztnQkFBRSxTQUFTLENBQUMsMkJBQTJCO1lBRW5GLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDdEMsSUFBSSxDQUFDLEtBQUs7Z0JBQUUsU0FBUztZQUVyQixNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNwRCxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFekIsNEZBQTRGO1lBQzVGLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUM7Z0JBQUUsU0FBUztZQUUvQywyQkFBMkI7WUFDM0IsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQztnQkFBRSxTQUFTO1lBRTFDLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCxhQUFhLE9BQU8sbUNBQW1DLEVBQ3ZELElBQUksQ0FDTCxDQUNGLENBQUM7UUFDSixDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBbkRELGdDQW1EQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDOjIwMTIgUnVsZSA5LjFcclxuICogVGhlIHZhbHVlIG9mIGFuIG9iamVjdCB3aXRoIGF1dG9tYXRpYyBzdG9yYWdlIGR1cmF0aW9uIHNoYWxsIG5vdCBiZSByZWFkXHJcbiAqIGJlZm9yZSBpdCBoYXMgYmVlbiBzZXQuXHJcbiAqIERldGVjdHMgdmFyaWFibGUgZGVjbGFyYXRpb25zIHdpdGhvdXQgaW5pdGlhbGl6YXRpb24uXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzlfMSBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy05LjEnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ1RoZSB2YWx1ZSBvZiBhbiBvYmplY3Qgd2l0aCBhdXRvbWF0aWMgc3RvcmFnZSBkdXJhdGlvbiBzaGFsbCBub3QgYmUgcmVhZCBiZWZvcmUgaXQgaGFzIGJlZW4gc2V0JztcclxuICBzZXZlcml0eSA9ICdtYW5kYXRvcnknIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0luaXRpYWxpemF0aW9uJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuXHJcbiAgcHJpdmF0ZSByZWFkb25seSB0eXBlS2V5d29yZHMgPSBuZXcgU2V0KFtcclxuICAgICdpbnQnLCAnY2hhcicsICdzaG9ydCcsICdsb25nJywgJ2Zsb2F0JywgJ2RvdWJsZScsXHJcbiAgICAndW5zaWduZWQnLCAnc2lnbmVkJywgJ19Cb29sJyxcclxuICBdKTtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcbiAgICBjb25zdCBsaW5lcyA9IGFzdC5saW5lcztcclxuXHJcbiAgICAvLyBMb29rIGZvciB2YXJpYWJsZSBkZWNsYXJhdGlvbnMgd2l0aG91dCBpbml0aWFsaXphdGlvblxyXG4gICAgLy8gUGF0dGVybjogdHlwZSBuYW1lOyAobm8gPSBzaWduKVxyXG4gICAgY29uc3QgdW5pbml0UmVnZXggPSAvXig/Oig/OmNvbnN0fHZvbGF0aWxlfHJlZ2lzdGVyKVxccyspKihbYS16QS1aX11cXHcqKD86XFxzKlsqXSspPylcXHMrKFthLXpBLVpfXVxcdyopXFxzKjtcXHMqJC87XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gbGluZXNbaV0udHJpbSgpO1xyXG5cclxuICAgICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnIycpIHx8IGxpbmUuc3RhcnRzV2l0aCgnLy8nKSB8fCBsaW5lLnN0YXJ0c1dpdGgoJyonKSB8fCAhbGluZSkgY29udGludWU7XHJcbiAgICAgIGlmIChsaW5lLmluY2x1ZGVzKCcoJykgfHwgbGluZS5pbmNsdWRlcygnKScpKSBjb250aW51ZTsgLy8gU2tpcCBmdW5jdGlvbi1saWtlIGxpbmVzXHJcblxyXG4gICAgICBjb25zdCBtYXRjaCA9IGxpbmUubWF0Y2godW5pbml0UmVnZXgpO1xyXG4gICAgICBpZiAoIW1hdGNoKSBjb250aW51ZTtcclxuXHJcbiAgICAgIGNvbnN0IHR5cGVOYW1lID0gbWF0Y2hbMV0ucmVwbGFjZSgvXFwqL2csICcnKS50cmltKCk7XHJcbiAgICAgIGNvbnN0IHZhck5hbWUgPSBtYXRjaFsyXTtcclxuXHJcbiAgICAgIC8vIE9ubHkgZmxhZyBwcmltaXRpdmUgdHlwZXMgKG5vdCBzdHJ1Y3RzL3BvaW50ZXJzIHdoaWNoIG1heSBiZSBpbnRlbnRpb25hbGx5IHVuaW5pdGlhbGl6ZWQpXHJcbiAgICAgIGlmICghdGhpcy50eXBlS2V5d29yZHMuaGFzKHR5cGVOYW1lKSkgY29udGludWU7XHJcblxyXG4gICAgICAvLyBTa2lwIGV4dGVybiBkZWNsYXJhdGlvbnNcclxuICAgICAgaWYgKGxpbmVzW2ldLmluY2x1ZGVzKCdleHRlcm4nKSkgY29udGludWU7XHJcblxyXG4gICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgdGhpcyxcclxuICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgMCxcclxuICAgICAgICAgIGBWYXJpYWJsZSAnJHt2YXJOYW1lfScgZGVjbGFyZWQgd2l0aG91dCBpbml0aWFsaXphdGlvbmAsXHJcbiAgICAgICAgICBsaW5lXHJcbiAgICAgICAgKVxyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=