import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
    constructor(private auditService: AuditService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const req = context.switchToHttp().getRequest(); // Typed implicitly
        const method = req.method;

        // Only log mutations
        if (!['POST', 'PUT', 'DELETE'].includes(method)) {
            return next.handle();
        }

        return next.handle().pipe(
            tap(() => {
                const user = req.user;
                const userId = user ? user.userId || user.id : null;
                const url = req.url;
                const ip = req.ip;

                // Simple heuristic: Action is method + resource (url)
                // e.g., POST /products -> CREATE PRODUCT
                // Cleaning up URL for resource name
                const resource = url.split('?')[0];

                this.auditService.log(
                    userId,
                    method,
                    resource,
                    {
                        body: req.body, // Be careful with sensitive data like passwords
                        params: req.params,
                        query: req.query
                    },
                    ip
                );
            }),
        );
    }
}
