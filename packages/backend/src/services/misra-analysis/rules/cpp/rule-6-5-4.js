"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rule_CPP_6_5_4 = void 0;
/**
 * MISRA C++:2008 Rule 6-5-4
 * The loop-counter shall be modified by one of: --, ++, -=n, or +=n; where n remains constant for the duration of the loop
 *
 * NOTE: This is a stub implementation. Full implementation requires:
 * - Detailed AST analysis for this specific rule
 * - Comprehensive test cases
 * - Integration with the rule engine
 */
class Rule_CPP_6_5_4 {
    id = 'MISRA-CPP-6.5.4';
    description = 'The loop-counter shall be modified by one of: --, ++, -=n, or +=n; where n remains constant for the duration of the loop';
    severity = 'required';
    category = 'Control flow';
    language = 'CPP';
    async check(ast, sourceCode) {
        // Stub implementation - returns no violations
        // TODO: Implement full rule checking logic
        return [];
    }
}
exports.Rule_CPP_6_5_4 = Rule_CPP_6_5_4;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVsZS02LTUtNC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJ1bGUtNi01LTQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBSUE7Ozs7Ozs7O0dBUUc7QUFDSCxNQUFhLGNBQWM7SUFDekIsRUFBRSxHQUFHLGlCQUFpQixDQUFDO0lBQ3ZCLFdBQVcsR0FBRywwSEFBMEgsQ0FBQztJQUN6SSxRQUFRLEdBQUcsVUFBbUIsQ0FBQztJQUMvQixRQUFRLEdBQUcsY0FBYyxDQUFDO0lBQzFCLFFBQVEsR0FBRyxLQUFjLENBQUM7SUFFMUIsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFRLEVBQUUsVUFBa0I7UUFDdEMsOENBQThDO1FBQzlDLDJDQUEyQztRQUMzQyxPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUM7Q0FDRjtBQVpELHdDQVlDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTUlTUkFSdWxlLCBjcmVhdGVWaW9sYXRpb24gfSBmcm9tICcuLi8uLi9ydWxlLWVuZ2luZSc7XG5pbXBvcnQgeyBBU1QgfSBmcm9tICcuLi8uLi9jb2RlLXBhcnNlcic7XG5pbXBvcnQgeyBWaW9sYXRpb24gfSBmcm9tICcuLi8uLi8uLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XG5cbi8qKlxuICogTUlTUkEgQysrOjIwMDggUnVsZSA2LTUtNFxuICogVGhlIGxvb3AtY291bnRlciBzaGFsbCBiZSBtb2RpZmllZCBieSBvbmUgb2Y6IC0tLCArKywgLT1uLCBvciArPW47IHdoZXJlIG4gcmVtYWlucyBjb25zdGFudCBmb3IgdGhlIGR1cmF0aW9uIG9mIHRoZSBsb29wXG4gKiBcbiAqIE5PVEU6IFRoaXMgaXMgYSBzdHViIGltcGxlbWVudGF0aW9uLiBGdWxsIGltcGxlbWVudGF0aW9uIHJlcXVpcmVzOlxuICogLSBEZXRhaWxlZCBBU1QgYW5hbHlzaXMgZm9yIHRoaXMgc3BlY2lmaWMgcnVsZVxuICogLSBDb21wcmVoZW5zaXZlIHRlc3QgY2FzZXNcbiAqIC0gSW50ZWdyYXRpb24gd2l0aCB0aGUgcnVsZSBlbmdpbmVcbiAqL1xuZXhwb3J0IGNsYXNzIFJ1bGVfQ1BQXzZfNV80IGltcGxlbWVudHMgTUlTUkFSdWxlIHtcbiAgaWQgPSAnTUlTUkEtQ1BQLTYuNS40JztcbiAgZGVzY3JpcHRpb24gPSAnVGhlIGxvb3AtY291bnRlciBzaGFsbCBiZSBtb2RpZmllZCBieSBvbmUgb2Y6IC0tLCArKywgLT1uLCBvciArPW47IHdoZXJlIG4gcmVtYWlucyBjb25zdGFudCBmb3IgdGhlIGR1cmF0aW9uIG9mIHRoZSBsb29wJztcbiAgc2V2ZXJpdHkgPSAncmVxdWlyZWQnIGFzIGNvbnN0O1xuICBjYXRlZ29yeSA9ICdDb250cm9sIGZsb3cnO1xuICBsYW5ndWFnZSA9ICdDUFAnIGFzIGNvbnN0O1xuXG4gIGFzeW5jIGNoZWNrKGFzdDogQVNULCBzb3VyY2VDb2RlOiBzdHJpbmcpOiBQcm9taXNlPFZpb2xhdGlvbltdPiB7XG4gICAgLy8gU3R1YiBpbXBsZW1lbnRhdGlvbiAtIHJldHVybnMgbm8gdmlvbGF0aW9uc1xuICAgIC8vIFRPRE86IEltcGxlbWVudCBmdWxsIHJ1bGUgY2hlY2tpbmcgbG9naWNcbiAgICByZXR1cm4gW107XG4gIH1cbn1cbiJdfQ==