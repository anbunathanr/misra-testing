"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_0_1_6 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 0-1-6
 * A project shall not contain instances of non-volatile variables being given values that are never subsequently used.
 * Detects dead stores - assignments that are overwritten before being read.
 */
class Rule_CPP_0_1_6 {
    id = 'MISRA-CPP-0.1.6';
    description = 'Variables shall not be assigned values that are never subsequently used';
    severity = 'required';
    category = 'Unused code';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Track assignments: var = value;
        const assignmentRegex = /^\s*([a-zA-Z_]\w*)\s*=\s*[^=]/;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('//') || line.startsWith('#') || !line)
                continue;
            const match = line.match(assignmentRegex);
            if (!match)
                continue;
            const varName = match[1];
            // Look ahead to see if variable is reassigned before being read
            let foundRead = false;
            let foundReassign = false;
            for (let j = i + 1; j < lines.length && j < i + 20; j++) {
                const nextLine = lines[j].trim();
                if (nextLine.startsWith('//') || nextLine.startsWith('#'))
                    continue;
                // Check for reassignment
                if (new RegExp(`^\\s*${varName}\\s*=\\s*[^=]`).test(nextLine)) {
                    foundReassign = true;
                    break;
                }
                // Check for read (not in assignment context)
                if (new RegExp(`\\b${varName}\\b`).test(nextLine) && !new RegExp(`^\\s*${varName}\\s*=`).test(nextLine)) {
                    foundRead = true;
                    break;
                }
            }
            if (foundReassign && !foundRead) {
                violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Value assigned to '${varName}' is never used before being overwritten`, line));
            }
        }
        return violations;
    }
}
exports.Rule_CPP_0_1_6 = Rule_CPP_0_1_6;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0wLTEtNi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtMC0xLTYudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7O0dBSUc7QUFDSCxNQUFhLGNBQWM7SUFDekIsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ3ZCLFdBQVcsR0FBRyx5RUFBeUUsQ0FBQztJQUN4RixRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsYUFBYSxDQUFDO0lBQ3pCLFFBQVEsR0FBRyxLQUFjLENBQUM7SUFFMUIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsTUFBTSxVQUFVLEdBQWdCLEVBQUUsQ0FBQztRQUNuQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBRXhCLGtDQUFrQztRQUNsQyxNQUFNLGVBQWUsR0FBRywrQkFBK0IsQ0FBQztRQUV4RCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM3QixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUk7Z0JBQUUsU0FBUztZQUVyRSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQzFDLElBQUksQ0FBQyxLQUFLO2dCQUFFLFNBQVM7WUFFckIsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXpCLGdFQUFnRTtZQUNoRSxJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUM7WUFDdEIsSUFBSSxhQUFhLEdBQUcsS0FBSyxDQUFDO1lBRTFCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUN4RCxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ2pDLElBQUksUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxRQUFRLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztvQkFBRSxTQUFTO2dCQUVwRSx5QkFBeUI7Z0JBQ3pCLElBQUksSUFBSSxNQUFNLENBQUMsUUFBUSxPQUFPLGVBQWUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO29CQUM5RCxhQUFhLEdBQUcsSUFBSSxDQUFDO29CQUNyQixNQUFNO2dCQUNSLENBQUM7Z0JBRUQsNkNBQTZDO2dCQUM3QyxJQUFJLElBQUksTUFBTSxDQUFDLE1BQU0sT0FBTyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLE1BQU0sQ0FBQyxRQUFRLE9BQU8sT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7b0JBQ3hHLFNBQVMsR0FBRyxJQUFJLENBQUM7b0JBQ2pCLE1BQU07Z0JBQ1IsQ0FBQztZQUNILENBQUM7WUFFRCxJQUFJLGFBQWEsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNoQyxVQUFVLENBQUMsSUFBSSxDQUNiLElBQUEsNkJBQWUsRUFDYixJQUFJLEVBQ0osQ0FBQyxHQUFHLENBQUMsRUFDTCxDQUFDLEVBQ0Qsc0JBQXNCLE9BQU8sMENBQTBDLEVBQ3ZFLElBQUksQ0FDTCxDQUNGLENBQUM7WUFDSixDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQTNERCx3Q0EyREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQysrOjIwMDggUnVsZSAwLTEtNlxyXG4gKiBBIHByb2plY3Qgc2hhbGwgbm90IGNvbnRhaW4gaW5zdGFuY2VzIG9mIG5vbi12b2xhdGlsZSB2YXJpYWJsZXMgYmVpbmcgZ2l2ZW4gdmFsdWVzIHRoYXQgYXJlIG5ldmVyIHN1YnNlcXVlbnRseSB1c2VkLlxyXG4gKiBEZXRlY3RzIGRlYWQgc3RvcmVzIC0gYXNzaWdubWVudHMgdGhhdCBhcmUgb3ZlcndyaXR0ZW4gYmVmb3JlIGJlaW5nIHJlYWQuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUnVsZV9DUFBfMF8xXzYgaW1wbGVtZW50cyBNSVNSQVJ1bGUge1xyXG4gIGlkID0gJ01JU1JBLUNQUC0wLjEuNic7XHJcbiAgZGVzY3JpcHRpb24gPSAnVmFyaWFibGVzIHNoYWxsIG5vdCBiZSBhc3NpZ25lZCB2YWx1ZXMgdGhhdCBhcmUgbmV2ZXIgc3Vic2VxdWVudGx5IHVzZWQnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdVbnVzZWQgY29kZSc7XHJcbiAgbGFuZ3VhZ2UgPSAnQ1BQJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcbiAgICBjb25zdCBsaW5lcyA9IGFzdC5saW5lcztcclxuXHJcbiAgICAvLyBUcmFjayBhc3NpZ25tZW50czogdmFyID0gdmFsdWU7XHJcbiAgICBjb25zdCBhc3NpZ25tZW50UmVnZXggPSAvXlxccyooW2EtekEtWl9dXFx3KilcXHMqPVxccypbXj1dLztcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IGxpbmUgPSBsaW5lc1tpXS50cmltKCk7XHJcbiAgICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoJy8vJykgfHwgbGluZS5zdGFydHNXaXRoKCcjJykgfHwgIWxpbmUpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgY29uc3QgbWF0Y2ggPSBsaW5lLm1hdGNoKGFzc2lnbm1lbnRSZWdleCk7XHJcbiAgICAgIGlmICghbWF0Y2gpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgY29uc3QgdmFyTmFtZSA9IG1hdGNoWzFdO1xyXG4gICAgICBcclxuICAgICAgLy8gTG9vayBhaGVhZCB0byBzZWUgaWYgdmFyaWFibGUgaXMgcmVhc3NpZ25lZCBiZWZvcmUgYmVpbmcgcmVhZFxyXG4gICAgICBsZXQgZm91bmRSZWFkID0gZmFsc2U7XHJcbiAgICAgIGxldCBmb3VuZFJlYXNzaWduID0gZmFsc2U7XHJcbiAgICAgIFxyXG4gICAgICBmb3IgKGxldCBqID0gaSArIDE7IGogPCBsaW5lcy5sZW5ndGggJiYgaiA8IGkgKyAyMDsgaisrKSB7XHJcbiAgICAgICAgY29uc3QgbmV4dExpbmUgPSBsaW5lc1tqXS50cmltKCk7XHJcbiAgICAgICAgaWYgKG5leHRMaW5lLnN0YXJ0c1dpdGgoJy8vJykgfHwgbmV4dExpbmUuc3RhcnRzV2l0aCgnIycpKSBjb250aW51ZTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBDaGVjayBmb3IgcmVhc3NpZ25tZW50XHJcbiAgICAgICAgaWYgKG5ldyBSZWdFeHAoYF5cXFxccyoke3Zhck5hbWV9XFxcXHMqPVxcXFxzKltePV1gKS50ZXN0KG5leHRMaW5lKSkge1xyXG4gICAgICAgICAgZm91bmRSZWFzc2lnbiA9IHRydWU7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gQ2hlY2sgZm9yIHJlYWQgKG5vdCBpbiBhc3NpZ25tZW50IGNvbnRleHQpXHJcbiAgICAgICAgaWYgKG5ldyBSZWdFeHAoYFxcXFxiJHt2YXJOYW1lfVxcXFxiYCkudGVzdChuZXh0TGluZSkgJiYgIW5ldyBSZWdFeHAoYF5cXFxccyoke3Zhck5hbWV9XFxcXHMqPWApLnRlc3QobmV4dExpbmUpKSB7XHJcbiAgICAgICAgICBmb3VuZFJlYWQgPSB0cnVlO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICBpZiAoZm91bmRSZWFzc2lnbiAmJiAhZm91bmRSZWFkKSB7XHJcbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKFxyXG4gICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICBpICsgMSxcclxuICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgYFZhbHVlIGFzc2lnbmVkIHRvICcke3Zhck5hbWV9JyBpcyBuZXZlciB1c2VkIGJlZm9yZSBiZWluZyBvdmVyd3JpdHRlbmAsXHJcbiAgICAgICAgICAgIGxpbmVcclxuICAgICAgICAgIClcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==