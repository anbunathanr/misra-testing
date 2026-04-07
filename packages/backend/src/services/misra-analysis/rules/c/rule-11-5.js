"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_11_5 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 11.5
 * A conversion should not be performed from pointer to void into pointer to object.
 */
class Rule_C_11_5 {
    id = 'MISRA-C-11.5';
    description = 'A conversion should not be performed from pointer to void into pointer to object';
    severity = 'advisory';
    category = 'Pointers';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        for (let i = 0; i < ast.lines.length; i++) {
            const line = ast.lines[i].trim();
            // Check for void* to typed pointer conversion
            const voidPtrMatch = line.match(/\((\w+)\s*\*\)\s*\w+/);
            if (voidPtrMatch && line.includes('void')) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Conversion from void* to ${voidPtrMatch[1]}*`, line));
            }
        }
        return violations;
    }
}
exports.Rule_C_11_5 = Rule_C_11_5;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xMS01LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xMS01LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7O0dBR0c7QUFDSCxNQUFhLFdBQVc7SUFDdEIsRUFBRSxHQUFHLGNBQWMsQ0FBQztJQUNwQixXQUFXLEdBQUcsa0ZBQWtGLENBQUM7SUFDakcsUUFBUSxHQUFHLFVBQW1CLENBQUM7SUFDL0IsUUFBUSxHQUFHLFVBQVUsQ0FBQztJQUN0QixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFFbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVqQyw4Q0FBOEM7WUFDOUMsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1lBQ3hELElBQUksWUFBWSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztnQkFDMUMsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELDRCQUE0QixZQUFZLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFDOUMsSUFBSSxDQUNMLENBQ0YsQ0FBQztZQUNKLENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBOUJELGtDQThCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDOjIwMTIgUnVsZSAxMS41XHJcbiAqIEEgY29udmVyc2lvbiBzaG91bGQgbm90IGJlIHBlcmZvcm1lZCBmcm9tIHBvaW50ZXIgdG8gdm9pZCBpbnRvIHBvaW50ZXIgdG8gb2JqZWN0LlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ18xMV81IGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DLTExLjUnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0EgY29udmVyc2lvbiBzaG91bGQgbm90IGJlIHBlcmZvcm1lZCBmcm9tIHBvaW50ZXIgdG8gdm9pZCBpbnRvIHBvaW50ZXIgdG8gb2JqZWN0JztcclxuICBzZXZlcml0eSA9ICdhZHZpc29yeScgYXMgY29uc3Q7XHJcbiAgY2F0ZWdvcnkgPSAnUG9pbnRlcnMnO1xyXG4gIGxhbmd1YWdlID0gJ0MnIGFzIGNvbnN0O1xyXG5cclxuICBhc3luYyBjaGVjayhhc3Q6IEFTVCwgc291cmNlQ29kZTogc3RyaW5nKTogUHJvbWlzZTxWaW9sYXRpb25bXT4ge1xyXG4gICAgY29uc3QgdmlvbGF0aW9uczogVmlvbGF0aW9uW10gPSBbXTtcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFzdC5saW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gYXN0LmxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgXHJcbiAgICAgIC8vIENoZWNrIGZvciB2b2lkKiB0byB0eXBlZCBwb2ludGVyIGNvbnZlcnNpb25cclxuICAgICAgY29uc3Qgdm9pZFB0ck1hdGNoID0gbGluZS5tYXRjaCgvXFwoKFxcdyspXFxzKlxcKlxcKVxccypcXHcrLyk7XHJcbiAgICAgIGlmICh2b2lkUHRyTWF0Y2ggJiYgbGluZS5pbmNsdWRlcygndm9pZCcpKSB7XHJcbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgYENvbnZlcnNpb24gZnJvbSB2b2lkKiB0byAke3ZvaWRQdHJNYXRjaFsxXX0qYCxcclxuICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgKVxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19