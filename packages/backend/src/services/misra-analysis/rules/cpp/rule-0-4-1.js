"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_0_4_1 = void 0;
/**
 * MISRA C++:2008 Rule 0-4-1
 * Use of scaled-integer or fixed-point arithmetic shall be documented
 *
 * NOTE: This is a stub implementation. Full implementation requires:
 * - Detailed AST analysis for this specific rule
 * - Comprehensive test cases
 * - Integration with the rule engine
 */
class Rule_CPP_0_4_1 {
    id = 'MISRA-CPP-0.4.1';
    description = 'Use of scaled-integer or fixed-point arithmetic shall be documented';
    severity = 'required';
    category = 'General';
    language = 'CPP';
    async check(ast, sourceCode) {
        // Stub implementation - returns no violations
        // TODO: Implement full rule checking logic
        return [];
    }
}
exports.Rule_CPP_0_4_1 = Rule_CPP_0_4_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS0wLTQtMS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtMC00LTEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBSUE7Ozs7Ozs7O0dBUUc7QUFDSCxNQUFhLGNBQWM7SUFDekIsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ3ZCLFdBQVcsR0FBRyxxRUFBcUUsQ0FBQztJQUNwRixRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsU0FBUyxDQUFDO0lBQ3JCLFFBQVEsR0FBRyxLQUFjLENBQUM7SUFFMUIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsOENBQThDO1FBQzlDLDJDQUEyQztRQUMzQyxPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUM7Q0FDRjtBQVpELHdDQVlDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XG5cbi8qKlxuICogTUlTUkEgQysrOjIwMDggUnVsZSAwLTQtMVxuICogVXNlIG9mIHNjYWxlZC1pbnRlZ2VyIG9yIGZpeGVkLXBvaW50IGFyaXRobWV0aWMgc2hhbGwgYmUgZG9jdW1lbnRlZFxuICogXG4gKiBOT1RFOiBUaGlzIGlzIGEgc3R1YiBpbXBsZW1lbnRhdGlvbi4gRnVsbCBpbXBsZW1lbnRhdGlvbiByZXF1aXJlczpcbiAqIC0gRGV0YWlsZWQgQVNUIGFuYWx5c2lzIGZvciB0aGlzIHNwZWNpZmljIHJ1bGVcbiAqIC0gQ29tcHJlaGVuc2l2ZSB0ZXN0IGNhc2VzXG4gKiAtIEludGVncmF0aW9uIHdpdGggdGhlIHJ1bGUgZW5naW5lXG4gKi9cbmV4cG9ydCBjbGFzcyBSdWxlX0NQUF8wXzRfMSBpbXBsZW1lbnRzIE1JU1JBUnVsZSB7XG4gIGlkID0gJ01JU1JBLUNQUC0wLjQuMSc7XG4gIGRlc2NyaXB0aW9uID0gJ1VzZSBvZiBzY2FsZWQtaW50ZWdlciBvciBmaXhlZC1wb2ludCBhcml0aG1ldGljIHNoYWxsIGJlIGRvY3VtZW50ZWQnO1xuICBzZXZlcml0eSA9ICdyZXF1aXJlZCcgYXMgY29uc3Q7XG4gIGNhdGVnb3J5ID0gJ0dlbmVyYWwnO1xuICBsYW5ndWFnZSA9ICdDUFAnIGFzIGNvbnN0O1xuXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XG4gICAgLy8gU3R1YiBpbXBsZW1lbnRhdGlvbiAtIHJldHVybnMgbm8gdmlvbGF0aW9uc1xuICAgIC8vIFRPRE86IEltcGxlbWVudCBmdWxsIHJ1bGUgY2hlY2tpbmcgbG9naWNcbiAgICByZXR1cm4gW107XG4gIH1cbn1cbiJdfQ==