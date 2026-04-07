"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_0_3_2 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 0-3-2
 * If a function generates error information, then that error information shall be tested.
 * Detects unchecked error returns from functions.
 */
class Rule_CPP_0_3_2 {
    id = 'MISRA-CPP-0.3.2';
    description = 'Error information from functions shall be tested';
    severity = 'required';
    category = 'Error handling';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Common error-returning functions
        const errorFunctions = ['malloc', 'calloc', 'realloc', 'fopen', 'open', 'read', 'write'];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('//') || line.startsWith('#') || !line)
                continue;
            for (const func of errorFunctions) {
                const callRegex = new RegExp(`\\b${func}\\s*\\(`);
                if (!callRegex.test(line))
                    continue;
                // Check if result is checked in next few lines
                let foundCheck = false;
                for (let j = i; j < Math.min(i + 5, lines.length); j++) {
                    const checkLine = lines[j].trim();
                    if (/\b(if|while|assert|throw)\b/.test(checkLine) || /==\s*(NULL|nullptr|0)/.test(checkLine)) {
                        foundCheck = true;
                        break;
                    }
                }
                if (!foundCheck) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Return value of '${func}' should be checked for errors`, line));
                }
            }
        }
        return violations;
    }
}
exports.Rule_CPP_0_3_2 = Rule_CPP_0_3_2;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0wLTMtMi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtMC0zLTIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7O0dBSUc7QUFDSCxNQUFhLGNBQWM7SUFDekIsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ3ZCLFdBQVcsR0FBRyxrREFBa0QsQ0FBQztJQUNqRSxRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsZ0JBQWdCLENBQUM7SUFDNUIsUUFBUSxHQUFHLEtBQWMsQ0FBQztJQUUxQixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7UUFFeEIsbUNBQW1DO1FBQ25DLE1BQU0sY0FBYyxHQUFHLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFekYsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN0QyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDN0IsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJO2dCQUFFLFNBQVM7WUFFckUsS0FBSyxNQUFNLElBQUksSUFBSSxjQUFjLEVBQUUsQ0FBQztnQkFDbEMsTUFBTSxTQUFTLEdBQUcsSUFBSSxNQUFNLENBQUMsTUFBTSxJQUFJLFNBQVMsQ0FBQyxDQUFDO2dCQUNsRCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7b0JBQUUsU0FBUztnQkFFcEMsK0NBQStDO2dCQUMvQyxJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUM7Z0JBQ3ZCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQ3ZELE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDbEMsSUFBSSw2QkFBNkIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksdUJBQXVCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7d0JBQzdGLFVBQVUsR0FBRyxJQUFJLENBQUM7d0JBQ2xCLE1BQU07b0JBQ1IsQ0FBQztnQkFDSCxDQUFDO2dCQUVELElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztvQkFDaEIsVUFBVSxDQUFDLElBQUksQ0FDYixJQUFBLDZCQUFlLEVBQ2IsSUFBSSxFQUNKLENBQUMsR0FBRyxDQUFDLEVBQ0wsQ0FBQyxFQUNELG9CQUFvQixJQUFJLGdDQUFnQyxFQUN4RCxJQUFJLENBQ0wsQ0FDRixDQUFDO2dCQUNKLENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7Q0FDRjtBQWhERCx3Q0FnREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBNSVNSQVJ1bGUsIGNyZWF0ZVZpb2xhdGlvbiB9IGZyb20gJy4uLy4uL3J1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgQVNUIH0gZnJvbSAnLi4vLi4vY29kZS1wYXJzZXInO1xyXG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vKipcclxuICogTUlTUkEgQysrOjIwMDggUnVsZSAwLTMtMlxyXG4gKiBJZiBhIGZ1bmN0aW9uIGdlbmVyYXRlcyBlcnJvciBpbmZvcm1hdGlvbiwgdGhlbiB0aGF0IGVycm9yIGluZm9ybWF0aW9uIHNoYWxsIGJlIHRlc3RlZC5cclxuICogRGV0ZWN0cyB1bmNoZWNrZWQgZXJyb3IgcmV0dXJucyBmcm9tIGZ1bmN0aW9ucy5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NQUF8wXzNfMiBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQ1BQLTAuMy4yJztcclxuICBkZXNjcmlwdGlvbiA9ICdFcnJvciBpbmZvcm1hdGlvbiBmcm9tIGZ1bmN0aW9ucyBzaGFsbCBiZSB0ZXN0ZWQnO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdFcnJvciBoYW5kbGluZyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQ1BQJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcbiAgICBjb25zdCBsaW5lcyA9IGFzdC5saW5lcztcclxuXHJcbiAgICAvLyBDb21tb24gZXJyb3ItcmV0dXJuaW5nIGZ1bmN0aW9uc1xyXG4gICAgY29uc3QgZXJyb3JGdW5jdGlvbnMgPSBbJ21hbGxvYycsICdjYWxsb2MnLCAncmVhbGxvYycsICdmb3BlbicsICdvcGVuJywgJ3JlYWQnLCAnd3JpdGUnXTtcclxuICAgIFxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gbGluZXNbaV0udHJpbSgpO1xyXG4gICAgICBpZiAobGluZS5zdGFydHNXaXRoKCcvLycpIHx8IGxpbmUuc3RhcnRzV2l0aCgnIycpIHx8ICFsaW5lKSBjb250aW51ZTtcclxuXHJcbiAgICAgIGZvciAoY29uc3QgZnVuYyBvZiBlcnJvckZ1bmN0aW9ucykge1xyXG4gICAgICAgIGNvbnN0IGNhbGxSZWdleCA9IG5ldyBSZWdFeHAoYFxcXFxiJHtmdW5jfVxcXFxzKlxcXFwoYCk7XHJcbiAgICAgICAgaWYgKCFjYWxsUmVnZXgudGVzdChsaW5lKSkgY29udGludWU7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gQ2hlY2sgaWYgcmVzdWx0IGlzIGNoZWNrZWQgaW4gbmV4dCBmZXcgbGluZXNcclxuICAgICAgICBsZXQgZm91bmRDaGVjayA9IGZhbHNlO1xyXG4gICAgICAgIGZvciAobGV0IGogPSBpOyBqIDwgTWF0aC5taW4oaSArIDUsIGxpbmVzLmxlbmd0aCk7IGorKykge1xyXG4gICAgICAgICAgY29uc3QgY2hlY2tMaW5lID0gbGluZXNbal0udHJpbSgpO1xyXG4gICAgICAgICAgaWYgKC9cXGIoaWZ8d2hpbGV8YXNzZXJ0fHRocm93KVxcYi8udGVzdChjaGVja0xpbmUpIHx8IC89PVxccyooTlVMTHxudWxscHRyfDApLy50ZXN0KGNoZWNrTGluZSkpIHtcclxuICAgICAgICAgICAgZm91bmRDaGVjayA9IHRydWU7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBpZiAoIWZvdW5kQ2hlY2spIHtcclxuICAgICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgICBgUmV0dXJuIHZhbHVlIG9mICcke2Z1bmN9JyBzaG91bGQgYmUgY2hlY2tlZCBmb3IgZXJyb3JzYCxcclxuICAgICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==