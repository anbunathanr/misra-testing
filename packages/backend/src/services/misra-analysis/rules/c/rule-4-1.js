"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_C_4_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C:2012 Rule 4.1
 * Octal and hexadecimal escape sequences shall be terminated.
 */
class Rule_C_4_1 {
    id = 'MISRA-C-4.1';
    description = 'Octal and hexadecimal escape sequences shall be terminated';
    severity = 'required';
    category = 'Character sets';
    language = 'C';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Check for octal escape sequences followed by digits
            const octalMatch = line.match(/\\[0-7]{1,3}[0-9]/);
            if (octalMatch) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Octal escape sequence not properly terminated', line.trim()));
            }
            // Check for hex escape sequences followed by hex digits
            const hexMatch = line.match(/\\x[0-9a-fA-F]+[0-9a-fA-F]/);
            if (hexMatch) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'Hexadecimal escape sequence not properly terminated', line.trim()));
            }
        }
        return violations;
    }
}
exports.Rule_C_4_1 = Rule_C_4_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS00LTEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJydWxlLTQtMS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtREFBK0Q7QUFJL0Q7OztHQUdHO0FBQ0gsTUFBYSxVQUFVO0lBQ3JCLEVBQUUsR0FBRyxhQUFhLENBQUM7SUFDbkIsV0FBVyxHQUFHLDREQUE0RCxDQUFDO0lBQzNFLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxnQkFBZ0IsQ0FBQztJQUM1QixRQUFRLEdBQUcsR0FBWSxDQUFDO0lBRXhCLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBUSxFQUFFLFVBQWtCO1FBQ3RDLE1BQU0sVUFBVSxHQUFnQixFQUFFLENBQUM7UUFDbkMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQztRQUV4QixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUV0QixzREFBc0Q7WUFDdEQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1lBQ25ELElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQ2YsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELCtDQUErQyxFQUMvQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQ1osQ0FDRixDQUFDO1lBQ0osQ0FBQztZQUVELHdEQUF3RDtZQUN4RCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLDRCQUE0QixDQUFDLENBQUM7WUFDMUQsSUFBSSxRQUFRLEVBQUUsQ0FBQztnQkFDYixVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0QscURBQXFELEVBQ3JELElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FDWixDQUNGLENBQUM7WUFDSixDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQTdDRCxnQ0E2Q0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQzoyMDEyIFJ1bGUgNC4xXHJcbiAqIE9jdGFsIGFuZCBoZXhhZGVjaW1hbCBlc2NhcGUgc2VxdWVuY2VzIHNoYWxsIGJlIHRlcm1pbmF0ZWQuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DXzRfMSBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQy00LjEnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ09jdGFsIGFuZCBoZXhhZGVjaW1hbCBlc2NhcGUgc2VxdWVuY2VzIHNoYWxsIGJlIHRlcm1pbmF0ZWQnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdDaGFyYWN0ZXIgc2V0cyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQycgYXMgY29uc3Q7XHJcblxyXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XHJcbiAgICBjb25zdCB2aW9sYXRpb25zOiBWaW9sYXRpb25bXSA9IFtdO1xyXG4gICAgY29uc3QgbGluZXMgPSBhc3QubGluZXM7XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gbGluZXNbaV07XHJcbiAgICAgIFxyXG4gICAgICAvLyBDaGVjayBmb3Igb2N0YWwgZXNjYXBlIHNlcXVlbmNlcyBmb2xsb3dlZCBieSBkaWdpdHNcclxuICAgICAgY29uc3Qgb2N0YWxNYXRjaCA9IGxpbmUubWF0Y2goL1xcXFxbMC03XXsxLDN9WzAtOV0vKTtcclxuICAgICAgaWYgKG9jdGFsTWF0Y2gpIHtcclxuICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICBjcmVhdGVWaW9sYXRpb24oXHJcbiAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICAnT2N0YWwgZXNjYXBlIHNlcXVlbmNlIG5vdCBwcm9wZXJseSB0ZXJtaW5hdGVkJyxcclxuICAgICAgICAgICAgbGluZS50cmltKClcclxuICAgICAgICAgIClcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBDaGVjayBmb3IgaGV4IGVzY2FwZSBzZXF1ZW5jZXMgZm9sbG93ZWQgYnkgaGV4IGRpZ2l0c1xyXG4gICAgICBjb25zdCBoZXhNYXRjaCA9IGxpbmUubWF0Y2goL1xcXFx4WzAtOWEtZkEtRl0rWzAtOWEtZkEtRl0vKTtcclxuICAgICAgaWYgKGhleE1hdGNoKSB7XHJcbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgJ0hleGFkZWNpbWFsIGVzY2FwZSBzZXF1ZW5jZSBub3QgcHJvcGVybHkgdGVybWluYXRlZCcsXHJcbiAgICAgICAgICAgIGxpbmUudHJpbSgpXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=