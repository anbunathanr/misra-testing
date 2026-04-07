"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_3_3_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 3-3-1
 * Objects or functions with external linkage shall be declared in a header file.
 * Ensures proper declaration organization.
 */
class Rule_CPP_3_3_1 {
    id = 'MISRA-CPP-3.3.1';
    description = 'External linkage entities shall be declared in a header file';
    severity = 'required';
    category = 'Declarations';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // In .cpp files, check for extern declarations (should be in .h)
        const isCppFile = sourceCode.includes('.cpp') || sourceCode.includes('.cc');
        if (isCppFile) {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.startsWith('//') || line.startsWith('#') || !line)
                    continue;
                // Extern declaration in .cpp file
                if (line.startsWith('extern') && line.includes(';')) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, 'External declaration should be in a header file, not in .cpp', line));
                }
            }
        }
        return violations;
    }
}
exports.Rule_CPP_3_3_1 = Rule_CPP_3_3_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0zLTMtMS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtMy0zLTEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7O0dBSUc7QUFDSCxNQUFhLGNBQWM7SUFDekIsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ3ZCLFdBQVcsR0FBRyw4REFBOEQsQ0FBQztJQUM3RSxRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsY0FBYyxDQUFDO0lBQzFCLFFBQVEsR0FBRyxLQUFjLENBQUM7SUFFMUIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsTUFBTSxVQUFVLEdBQWdCLEVBQUUsQ0FBQztRQUNuQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDO1FBRXhCLGlFQUFpRTtRQUNqRSxNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLFVBQVUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFNUUsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNkLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3RDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDN0IsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJO29CQUFFLFNBQVM7Z0JBRXJFLGtDQUFrQztnQkFDbEMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDcEQsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELDhEQUE4RCxFQUM5RCxJQUFJLENBQ0wsQ0FDRixDQUFDO2dCQUNKLENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQXBDRCx3Q0FvQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQysrOjIwMDggUnVsZSAzLTMtMVxyXG4gKiBPYmplY3RzIG9yIGZ1bmN0aW9ucyB3aXRoIGV4dGVybmFsIGxpbmthZ2Ugc2hhbGwgYmUgZGVjbGFyZWQgaW4gYSBoZWFkZXIgZmlsZS5cclxuICogRW5zdXJlcyBwcm9wZXIgZGVjbGFyYXRpb24gb3JnYW5pemF0aW9uLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJ1bGVfQ1BQXzNfM18xIGltcGxlbWVudHMgTUlTUkFSdWxlIHtcclxuICBpZCA9ICdNSVNSQS1DUFAtMy4zLjEnO1xyXG4gIGRlc2NyaXB0aW9uID0gJ0V4dGVybmFsIGxpbmthZ2UgZW50aXRpZXMgc2hhbGwgYmUgZGVjbGFyZWQgaW4gYSBoZWFkZXIgZmlsZSc7XHJcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xyXG4gIGNhdGVnb3J5ID0gJ0RlY2xhcmF0aW9ucyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQ1BQJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcbiAgICBjb25zdCBsaW5lcyA9IGFzdC5saW5lcztcclxuXHJcbiAgICAvLyBJbiAuY3BwIGZpbGVzLCBjaGVjayBmb3IgZXh0ZXJuIGRlY2xhcmF0aW9ucyAoc2hvdWxkIGJlIGluIC5oKVxyXG4gICAgY29uc3QgaXNDcHBGaWxlID0gc291cmNlQ29kZS5pbmNsdWRlcygnLmNwcCcpIHx8IHNvdXJjZUNvZGUuaW5jbHVkZXMoJy5jYycpO1xyXG4gICAgXHJcbiAgICBpZiAoaXNDcHBGaWxlKSB7XHJcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBjb25zdCBsaW5lID0gbGluZXNbaV0udHJpbSgpO1xyXG4gICAgICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoJy8vJykgfHwgbGluZS5zdGFydHNXaXRoKCcjJykgfHwgIWxpbmUpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAvLyBFeHRlcm4gZGVjbGFyYXRpb24gaW4gLmNwcCBmaWxlXHJcbiAgICAgICAgaWYgKGxpbmUuc3RhcnRzV2l0aCgnZXh0ZXJuJykgJiYgbGluZS5pbmNsdWRlcygnOycpKSB7XHJcbiAgICAgICAgICB2aW9sYXRpb25zLnB1c2goXHJcbiAgICAgICAgICAgIGNyZWF0ZVZpb2xhdGlvbihcclxuICAgICAgICAgICAgICB0aGlzLFxyXG4gICAgICAgICAgICAgIGkgKyAxLFxyXG4gICAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgICAgJ0V4dGVybmFsIGRlY2xhcmF0aW9uIHNob3VsZCBiZSBpbiBhIGhlYWRlciBmaWxlLCBub3QgaW4gLmNwcCcsXHJcbiAgICAgICAgICAgICAgbGluZVxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB2aW9sYXRpb25zO1xyXG4gIH1cclxufVxyXG4iXX0=