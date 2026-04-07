"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_7_2_1 = void 0;
const rule_engine_1 = require("../../rule-engine");
/**
 * MISRA C++:2008 Rule 7-2-1
 * An expression with enum underlying type shall only have values corresponding to the enumerators of the enumeration.
 */
class Rule_CPP_7_2_1 {
    id = 'MISRA-CPP-7.2.1';
    description = 'An expression with enum underlying type shall only have values corresponding to the enumerators of the enumeration';
    severity = 'required';
    category = 'Types';
    language = 'CPP';
    async check(ast, sourceCode) {
        const violations = [];
        const lines = ast.lines;
        // Track enum definitions
        const enums = new Map();
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // Detect enum definitions
            const enumDefRegex = /enum\s+(?:class\s+)?([a-zA-Z_]\w*)\s*{([^}]*)}/;
            const enumMatch = line.match(enumDefRegex);
            if (enumMatch) {
                const enumName = enumMatch[1];
                const enumBody = enumMatch[2];
                const enumerators = new Set(enumBody.split(',').map(e => e.trim().split('=')[0].trim()).filter(e => e));
                enums.set(enumName, enumerators);
            }
        }
        // Check for invalid enum assignments
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            for (const [enumName, enumerators] of enums) {
                const assignRegex = new RegExp(`${enumName}\\s+\\w+\\s*=\\s*(\\d+|0x[0-9a-fA-F]+)`);
                const match = line.match(assignRegex);
                if (match) {
                    violations.push((0, rule_engine_1.createViolation)(this, i + 1, 0, `Enum ${enumName} assigned a value not in its enumerator list`, line));
                }
            }
        }
        return violations;
    }
}
exports.Rule_CPP_7_2_1 = Rule_CPP_7_2_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS03LTItMS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtNy0yLTEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbURBQStEO0FBSS9EOzs7R0FHRztBQUNILE1BQWEsY0FBYztJQUN6QixFQUFFLEdBQUcsaUJBQWlCLENBQUM7SUFDdkIsV0FBVyxHQUFHLG9IQUFvSCxDQUFDO0lBQ25JLFFBQVEsR0FBRyxVQUFtQixDQUFDO0lBQy9CLFFBQVEsR0FBRyxPQUFPLENBQUM7SUFDbkIsUUFBUSxHQUFHLEtBQWMsQ0FBQztJQUUxQixLQUFLLENBQUMsS0FBSyxDQUFDLEdBQVEsRUFBRSxVQUFrQjtRQUN0QyxNQUFNLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7UUFFeEIseUJBQXlCO1FBQ3pCLE1BQU0sS0FBSyxHQUFHLElBQUksR0FBRyxFQUF1QixDQUFDO1FBRTdDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdEMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBRTdCLDBCQUEwQjtZQUMxQixNQUFNLFlBQVksR0FBRyxnREFBZ0QsQ0FBQztZQUN0RSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBRTNDLElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQ2QsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM5QixNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzlCLE1BQU0sV0FBVyxHQUFHLElBQUksR0FBRyxDQUN6QixRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FDM0UsQ0FBQztnQkFDRixLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUMsQ0FBQztZQUNuQyxDQUFDO1FBQ0gsQ0FBQztRQUVELHFDQUFxQztRQUNyQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUU3QixLQUFLLE1BQU0sQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLElBQUksS0FBSyxFQUFFLENBQUM7Z0JBQzVDLE1BQU0sV0FBVyxHQUFHLElBQUksTUFBTSxDQUFDLEdBQUcsUUFBUSx3Q0FBd0MsQ0FBQyxDQUFDO2dCQUNwRixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO2dCQUV0QyxJQUFJLEtBQUssRUFBRSxDQUFDO29CQUNWLFVBQVUsQ0FBQyxJQUFJLENBQ2IsSUFBQSw2QkFBZSxFQUNiLElBQUksRUFDSixDQUFDLEdBQUcsQ0FBQyxFQUNMLENBQUMsRUFDRCxRQUFRLFFBQVEsOENBQThDLEVBQzlELElBQUksQ0FDTCxDQUNGLENBQUM7Z0JBQ0osQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBdkRELHdDQXVEQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1JU1JBUnVsZSwgY3JlYXRlVmlvbGF0aW9uIH0gZnJvbSAnLi4vLi4vcnVsZS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XHJcbmltcG9ydCB7IFZpb2xhdGlvbiB9IGZyb20gJy4uLy4uLy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBDKys6MjAwOCBSdWxlIDctMi0xXHJcbiAqIEFuIGV4cHJlc3Npb24gd2l0aCBlbnVtIHVuZGVybHlpbmcgdHlwZSBzaGFsbCBvbmx5IGhhdmUgdmFsdWVzIGNvcnJlc3BvbmRpbmcgdG8gdGhlIGVudW1lcmF0b3JzIG9mIHRoZSBlbnVtZXJhdGlvbi5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBSdWxlX0NQUF83XzJfMSBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XHJcbiAgaWQgPSAnTUlTUkEtQ1BQLTcuMi4xJztcclxuICBkZXNjcmlwdGlvbiA9ICdBbiBleHByZXNzaW9uIHdpdGggZW51bSB1bmRlcmx5aW5nIHR5cGUgc2hhbGwgb25seSBoYXZlIHZhbHVlcyBjb3JyZXNwb25kaW5nIHRvIHRoZSBlbnVtZXJhdG9ycyBvZiB0aGUgZW51bWVyYXRpb24nO1xyXG4gIHNldmVyaXR5ID0gJ3JlcXVpcmVkJyBhcyBjb25zdDtcclxuICBjYXRlZ29yeSA9ICdUeXBlcyc7XHJcbiAgbGFuZ3VhZ2UgPSAnQ1BQJyBhcyBjb25zdDtcclxuXHJcbiAgYXN5bmMgY2hlY2soYXN0OiBBU1QsIHNvdXJjZUNvZGU6IHN0cmluZyk6IFByb21pc2U8VmlvbGF0aW9uW10+IHtcclxuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFZpb2xhdGlvbltdID0gW107XHJcbiAgICBjb25zdCBsaW5lcyA9IGFzdC5saW5lcztcclxuXHJcbiAgICAvLyBUcmFjayBlbnVtIGRlZmluaXRpb25zXHJcbiAgICBjb25zdCBlbnVtcyA9IG5ldyBNYXA8c3RyaW5nLCBTZXQ8c3RyaW5nPj4oKTtcclxuICAgIFxyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICBjb25zdCBsaW5lID0gbGluZXNbaV0udHJpbSgpO1xyXG4gICAgICBcclxuICAgICAgLy8gRGV0ZWN0IGVudW0gZGVmaW5pdGlvbnNcclxuICAgICAgY29uc3QgZW51bURlZlJlZ2V4ID0gL2VudW1cXHMrKD86Y2xhc3NcXHMrKT8oW2EtekEtWl9dXFx3KilcXHMqeyhbXn1dKil9LztcclxuICAgICAgY29uc3QgZW51bU1hdGNoID0gbGluZS5tYXRjaChlbnVtRGVmUmVnZXgpO1xyXG4gICAgICBcclxuICAgICAgaWYgKGVudW1NYXRjaCkge1xyXG4gICAgICAgIGNvbnN0IGVudW1OYW1lID0gZW51bU1hdGNoWzFdO1xyXG4gICAgICAgIGNvbnN0IGVudW1Cb2R5ID0gZW51bU1hdGNoWzJdO1xyXG4gICAgICAgIGNvbnN0IGVudW1lcmF0b3JzID0gbmV3IFNldChcclxuICAgICAgICAgIGVudW1Cb2R5LnNwbGl0KCcsJykubWFwKGUgPT4gZS50cmltKCkuc3BsaXQoJz0nKVswXS50cmltKCkpLmZpbHRlcihlID0+IGUpXHJcbiAgICAgICAgKTtcclxuICAgICAgICBlbnVtcy5zZXQoZW51bU5hbWUsIGVudW1lcmF0b3JzKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIGZvciBpbnZhbGlkIGVudW0gYXNzaWdubWVudHNcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgY29uc3QgbGluZSA9IGxpbmVzW2ldLnRyaW0oKTtcclxuICAgICAgXHJcbiAgICAgIGZvciAoY29uc3QgW2VudW1OYW1lLCBlbnVtZXJhdG9yc10gb2YgZW51bXMpIHtcclxuICAgICAgICBjb25zdCBhc3NpZ25SZWdleCA9IG5ldyBSZWdFeHAoYCR7ZW51bU5hbWV9XFxcXHMrXFxcXHcrXFxcXHMqPVxcXFxzKihcXFxcZCt8MHhbMC05YS1mQS1GXSspYCk7XHJcbiAgICAgICAgY29uc3QgbWF0Y2ggPSBsaW5lLm1hdGNoKGFzc2lnblJlZ2V4KTtcclxuICAgICAgICBcclxuICAgICAgICBpZiAobWF0Y2gpIHtcclxuICAgICAgICAgIHZpb2xhdGlvbnMucHVzaChcclxuICAgICAgICAgICAgY3JlYXRlVmlvbGF0aW9uKFxyXG4gICAgICAgICAgICAgIHRoaXMsXHJcbiAgICAgICAgICAgICAgaSArIDEsXHJcbiAgICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgICBgRW51bSAke2VudW1OYW1lfSBhc3NpZ25lZCBhIHZhbHVlIG5vdCBpbiBpdHMgZW51bWVyYXRvciBsaXN0YCxcclxuICAgICAgICAgICAgICBsaW5lXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHZpb2xhdGlvbnM7XHJcbiAgfVxyXG59XHJcbiJdfQ==