"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_11_2 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 11.2
 * Conversions shall not be performed between a pointer to an incomplete type and any other type.
 */
class Rule_C_11_2 {
    id = 'MISRA-C-11.2';
    description = 'Conversions shall not be performed between a pointer to an incomplete type and any other type';
    severity = 'required';
    category = 'Pointers';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Check for void* conversions
            const voidPtrMatch = line.match(/\(void\s*\*\)\s*\w+/);
            if (voidPtrMatch) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Conversion to/from void pointer (incomplete type)', line));
            }
        }
        return violations;
    }
}
exports.Rule_C_11_2 = Rule_C_11_2;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xMS0yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xMS0yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7O0dBR0c7QUFDSCxNQUFhLFdBQVc7SUFDdEIsRUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQixXQUFXLEdBQUcsK0ZBQStGLENBQUM7SUFDOUcsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLFVBQVUsQ0FBQztJQUN0QixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFFbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVqQyw4QkFBOEI7WUFDOUIsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1lBQ3ZELElBQUksWUFBWSxFQUFFLENBQUM7Z0JBQ2pCLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCxtREFBbUQsRUFDbkQsSUFBSSxDQUNMLENBQ0YsQ0FBQztZQUNKLENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBOUJELGtDQThCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDOjIwMTIgUnVsZSAxMS4yXHJcbiAqIENvbnZlcnNpb25zIHNoYWxsIG5vdCBiZSBwZXJmb3JtZWQgYmV0d2VlbiBhIHBvaW50ZXIgdG8gYW4gaW5jb21wbGV0ZSB0eXBlIGFuZCBhbnkgb3RoZXIgdHlwZS5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMTFfMiBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0xMS4yJztcclxuICBkZXNjcmlwdGlvbiA9ICdDb252ZXJzaW9ucyBzaGFsbCBub3QgYmUgcGVyZm9ybWVkIGJldHdlZW4gYSBwb2ludGVyIHRvIGFuIGluY29tcGxldGUgdHlwZSBhbmQgYW55IG90aGVyIHR5cGUnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdQb2ludGVycyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG5cclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXN0LmxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBhc3QubGluZXNbaV0udHJpbSgpO1xyXG4gICAgICBcclxuICAgICAgLy8gQ2hlY2sgZm9yIHZvaWQqIGNvbnZlcnNpb25zXHJcbiAgICAgIGNvbnN0IHZvaWRQdHJNYXRjaCA9IGxpbmUubWF0Y2goL1xcKHZvaWRcXHMqXFwqXFwpXFxzKlxcdysvKTtcclxuICAgICAgaWYgKHZvaWRQdHJNYXRjaCkge1xyXG4gICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICdDb252ZXJzaW9uIHRvL2Zyb20gdm9pZCBwb2ludGVyIChpbmNvbXBsZXRlIHR5cGUpJyxcclxuICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgKVxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19