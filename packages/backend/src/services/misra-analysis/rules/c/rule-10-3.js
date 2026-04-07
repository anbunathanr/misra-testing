"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_10_3 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 10.3
 * The value of an expression shall not be assigned to an object with a
 * narrower essential type or of a different essential type category.
 * Detects assignment of wider type (long) to narrower type (int).
 */
class Rule_C_10_3 {
    id = 'MISRA-C-10.3';
    description = 'The value of an expression shall not be assigned to an object with a narrower essential type';
    severity = 'required';
    category = 'Conversions';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Detect: int x = longVar; or int x = (long)...;
        // Simple heuristic: int/short variable assigned from long expression
        const narrowingRegex = /\b(int|short|char)\s+\w+\s*=\s*[^;]*\blong\b/;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#') || line.startsWith('//') || !line)
                continue;
            if (narrowingRegex.test(line)) {
                // Check there's no explicit cast to the narrower type
                if (!line.includes('(int)') && !line.includes('(short)') && !line.includes('(char)')) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Assignment of wider type (long) to narrower type without explicit cast', line));
                }
            }
        }
        return violations;
    }
}
exports.Rule_C_10_3 = Rule_C_10_3;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0xMC0zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicnVsZS0xMC0zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1EQUErRDtBQUkvRDs7Ozs7R0FLRztBQUNILE1BQWEsV0FBVztJQUN0QixFQUFFLEdBQUcsY0FBYyxDQUFDO0lBQ3BCLFdBQVcsR0FBRyw4RkFBOEYsQ0FBQztJQUM3RyxRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsYUFBYSxDQUFDO0lBQ3pCLFFBQVEsR0FBRyxHQUFZLENBQUM7SUFFeEIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsTUFBTSxVQUFVLEdBQWdCLEVBQUUsQ0FBQztRQUNuQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBRXhCLGlEQUFpRDtRQUNqRCxxRUFBcUU7UUFDckUsTUFBTSxjQUFjLEdBQUcsOENBQThDLENBQUM7UUFFdEUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN0QyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFFN0IsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJO2dCQUFFLFNBQVM7WUFFckUsSUFBSSxjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQzlCLHNEQUFzRDtnQkFDdEQsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO29CQUNyRixVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0Qsd0VBQXdFLEVBQ3hFLElBQUksQ0FDTCxDQUNGLENBQUM7Z0JBQ0osQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBdENELGtDQXNDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDOjIwMTIgUnVsZSAxMC4zXHJcbiAqIFRoZSB2YWx1ZSBvZiBhbiBleHByZXNzaW9uIHNoYWxsIG5vdCBiZSBhc3NpZ25lZCB0byBhbiBvYmplY3Qgd2l0aCBhXHJcbiAqIG5hcnJvd2VyIGVzc2VudGlhbCB0eXBlIG9yIG9mIGEgZGlmZmVyZW50IGVzc2VudGlhbCB0eXBlIGNhdGVnb3J5LlxyXG4gKiBEZXRlY3RzIGFzc2lnbm1lbnQgb2Ygd2lkZXIgdHlwZSAobG9uZykgdG8gbmFycm93ZXIgdHlwZSAoaW50KS5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NfMTBfMyBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy0xMC4zJztcclxuICBkZXNjcmlwdGlvbiA9ICdUaGUgdmFsdWUgb2YgYW4gZXhwcmVzc2lvbiBzaGFsbCBub3QgYmUgYXNzaWduZWQgdG8gYW4gb2JqZWN0IHdpdGggYSBuYXJyb3dlciBlc3NlbnRpYWwgdHlwZSc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0NvbnZlcnNpb25zJztcclxuICBsYW5ndWFnZSA9ICdDJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcbiAgICBjb25zdCBsaW5lcyA9IGFzdC5saW5lcztcclxuXHJcbiAgICAvLyBEZXRlY3Q6IGludCB4ID0gbG9uZ1Zhcjsgb3IgaW50IHggPSAobG9uZykuLi47XHJcbiAgICAvLyBTaW1wbGUgaGV1cmlzdGljOiBpbnQvc2hvcnQgdmFyaWFibGUgYXNzaWduZWQgZnJvbSBsb25nIGV4cHJlc3Npb25cclxuICAgIGNvbnN0IG5hcnJvd2luZ1JlZ2V4ID0gL1xcYihpbnR8c2hvcnR8Y2hhcilcXHMrXFx3K1xccyo9XFxzKlteO10qXFxibG9uZ1xcYi87XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gbGluZXNbaV0udHJpbSgpO1xyXG5cclxuICAgICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnIycpIHx8IGxpbmUuc3RhcnRzV2l0aCgnLy8nKSB8fCAhbGluZSkgY29udGludWU7XHJcblxyXG4gICAgICBpZiAobmFycm93aW5nUmVnZXgudGVzdChsaW5lKSkge1xyXG4gICAgICAgIC8vIENoZWNrIHRoZXJlJ3Mgbm8gZXhwbGljaXQgY2FzdCB0byB0aGUgbmFycm93ZXIgdHlwZVxyXG4gICAgICAgIGlmICghbGluZS5pbmNsdWRlcygnKGludCknKSAmJiAhbGluZS5pbmNsdWRlcygnKHNob3J0KScpICYmICFsaW5lLmluY2x1ZGVzKCcoY2hhciknKSkge1xyXG4gICAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAgICdBc3NpZ25tZW50IG9mIHdpZGVyIHR5cGUgKGxvbmcpIHRvIG5hcnJvd2VyIHR5cGUgd2l0aG91dCBleHBsaWNpdCBjYXN0JyxcclxuICAgICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==