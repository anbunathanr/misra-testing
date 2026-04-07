"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_14_4 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 14.4
 * The controlling expression of an if statement and the controlling expression
 * of an iteration-statement shall have essentially Boolean type.
 * Detects if conditions that are not boolean comparisons.
 */
class Rule_C_14_4 {
    id = 'MISRA-C-14.4';
    description = 'The controlling expression of an if statement shall have essentially Boolean type';
    severity = 'mandatory';
    category = 'Control flow';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Detect: if (x) where x is not a comparison/boolean expression
        // Boolean operators: ==, !=, <, >, <=, >=, &&, ||, !
        const ifRegex = /\bif\s*\(([^)]+)\)/;
        const booleanOps = /[=!<>]=|[<>]|&&|\|\||!/;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#') || line.startsWith('//') || !line)
                continue;
            const match = line.match(ifRegex);
            if (!match)
                continue;
            const condition = match[1].trim();
            // Skip if condition contains boolean operators
            if (booleanOps.test(condition))
                continue;
            // Skip if condition is a function call that likely returns bool
            // (we can't know for sure, so we flag simple variable names)
            if (/^[a-zA-Z_]\w*$/.test(condition)) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `if condition '${condition}' is not an essentially Boolean expression`, line));
            }
        }
        return violations;
    }
}
exports.Rule_C_14_4 = Rule_C_14_4;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xNC00LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xNC00LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7Ozs7R0FLRztBQUNILE1BQWEsV0FBVztJQUN0QixFQUFFLEdBQUcsY0FBYyxDQUFDO0lBQ3BCLFdBQVcsR0FBRyxtRkFBbUYsQ0FBQztJQUNsRyxRQUFRLEdBQUcsV0FBb0IsQ0FBQztJQUNoQyxRQUFRLEdBQUcsY0FBYyxDQUFDO0lBQzFCLFFBQVEsR0FBRyxHQUFZLENBQUM7SUFFeEIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsTUFBTSxVQUFVLEdBQWdCLEVBQUUsQ0FBQztRQUNuQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBRXhCLGdFQUFnRTtRQUNoRSxxREFBcUQ7UUFDckQsTUFBTSxPQUFPLEdBQUcsb0JBQW9CLENBQUM7UUFDckMsTUFBTSxVQUFVLEdBQUcsd0JBQXdCLENBQUM7UUFFNUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN0QyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFFN0IsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJO2dCQUFFLFNBQVM7WUFFckUsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNsQyxJQUFJLENBQUMsS0FBSztnQkFBRSxTQUFTO1lBRXJCLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVsQywrQ0FBK0M7WUFDL0MsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFBRSxTQUFTO1lBRXpDLGdFQUFnRTtZQUNoRSw2REFBNkQ7WUFDN0QsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztnQkFDckMsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELGlCQUFpQixTQUFTLDRDQUE0QyxFQUN0RSxJQUFJLENBQ0wsQ0FDRixDQUFDO1lBQ0osQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQ0Y7QUE5Q0Qsa0NBOENDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XHJcbmltcG9ydCB7IEFTVCB9IGZyb20gJy4uLy4uL2NvZGUtcGFyc2VyJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5cclxuLyoqXHJcbiAqIE1JU1JBIEM6MjAxMiBSdWxlIDE0LjRcclxuICogVGhlIGNvbnRyb2xsaW5nIGV4cHJlc3Npb24gb2YgYW4gaWYgc3RhdGVtZW50IGFuZCB0aGUgY29udHJvbGxpbmcgZXhwcmVzc2lvblxyXG4gKiBvZiBhbiBpdGVyYXRpb24tc3RhdGVtZW50IHNoYWxsIGhhdmUgZXNzZW50aWFsbHkgQm9vbGVhbiB0eXBlLlxyXG4gKiBEZXRlY3RzIGlmIGNvbmRpdGlvbnMgdGhhdCBhcmUgbm90IGJvb2xlYW4gY29tcGFyaXNvbnMuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzE0XzQgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUMtMTQuNCc7XHJcbiAgZGVzY3JpcHRpb24gPSAnVGhlIGNvbnRyb2xsaW5nIGV4cHJlc3Npb24gb2YgYW4gaWYgc3RhdGVtZW50IHNoYWxsIGhhdmUgZXNzZW50aWFsbHkgQm9vbGVhbiB0eXBlJztcclxuICBzZXZlcml0eSA9ICdtYW5kYXRvcnknIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0NvbnRyb2wgZmxvdyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG4gICAgY29uc3QgbGluZXMgPSBhc3QubGluZXM7XHJcblxyXG4gICAgLy8gRGV0ZWN0OiBpZiAoeCkgd2hlcmUgeCBpcyBub3QgYSBjb21wYXJpc29uL2Jvb2xlYW4gZXhwcmVzc2lvblxyXG4gICAgLy8gQm9vbGVhbiBvcGVyYXRvcnM6ID09LCAhPSwgPCwgPiwgPD0sID49LCAmJiwgfHwsICFcclxuICAgIGNvbnN0IGlmUmVnZXggPSAvXFxiaWZcXHMqXFwoKFteKV0rKVxcKS87XHJcbiAgICBjb25zdCBib29sZWFuT3BzID0gL1s9ITw+XT18Wzw+XXwmJnxcXHxcXHx8IS87XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gbGluZXNbaV0udHJpbSgpO1xyXG5cclxuICAgICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnIycpIHx8IGxpbmUuc3RhcnRzV2l0aCgnLy8nKSB8fCAhbGluZSkgY29udGludWU7XHJcblxyXG4gICAgICBjb25zdCBtYXRjaCA9IGxpbmUubWF0Y2goaWZSZWdleCk7XHJcbiAgICAgIGlmICghbWF0Y2gpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgY29uc3QgY29uZGl0aW9uID0gbWF0Y2hbMV0udHJpbSgpO1xyXG5cclxuICAgICAgLy8gU2tpcCBpZiBjb25kaXRpb24gY29udGFpbnMgYm9vbGVhbiBvcGVyYXRvcnNcclxuICAgICAgaWYgKGJvb2xlYW5PcHMudGVzdChjb25kaXRpb24pKSBjb250aW51ZTtcclxuXHJcbiAgICAgIC8vIFNraXAgaWYgY29uZGl0aW9uIGlzIGEgZnVuY3Rpb24gY2FsbCB0aGF0IGxpa2VseSByZXR1cm5zIGJvb2xcclxuICAgICAgLy8gKHdlIGNhbid0IGtub3cgZm9yIHN1cmUsIHNvIHdlIGZsYWcgc2ltcGxlIHZhcmlhYmxlIG5hbWVzKVxyXG4gICAgICBpZiAoL15bYS16QS1aX11cXHcqJC8udGVzdChjb25kaXRpb24pKSB7XHJcbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgYGlmIGNvbmRpdGlvbiAnJHtjb25kaXRpb259JyBpcyBub3QgYW4gZXNzZW50aWFsbHkgQm9vbGVhbiBleHByZXNzaW9uYCxcclxuICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgKVxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdmlvbGF0aW9ucztcclxuICB9XHJcbn1cclxuIl19